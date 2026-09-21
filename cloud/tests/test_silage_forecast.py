"""
AAHAR Silage Stack Tests — 7-Day Spoilage Forecast & Endpoint
Verifies:
  1. Spoilage forecast calculation logic and risk bands
  2. /bunkers/{id}/forecast REST endpoint
  3. Phase 6 Exit Criterion: 7-day forecast MAE ≤ 0.4 day on held-out test bunkers
"""

import uuid
from datetime import datetime, timezone
import numpy as np
import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from cloud.app.models.entities import Bunker, ProbeReading
from cloud.app.api.silage_forecast import compute_spoilage_forecast


def test_spoilage_forecast_risk_bands():
    # 1. Optimal conditions: cool, anaerobic, low pH -> LOW risk
    good_readings = [
        {"ph": 3.85, "core_temp_c": 22.0, "o2_pct": 0.4, "moisture_pct": 65.0}
    ]
    res_good = compute_spoilage_forecast(good_readings)
    assert res_good["risk_band"] == "LOW"
    assert res_good["safe_window_days"] >= 5
    assert len(res_good["daily_forecasts"]) == 7

    # 2. Moderate warming -> MODERATE risk
    mod_readings = [
        {"ph": 4.3, "core_temp_c": 31.0, "o2_pct": 1.8, "moisture_pct": 64.0}
    ]
    res_mod = compute_spoilage_forecast(mod_readings)
    assert res_mod["risk_band"] in ["MODERATE", "HIGH"]
    assert "Feed out from the left face" in res_mod["farmer_advisory"] or "feed-out" in res_mod["farmer_advisory"].lower()

    # 3. Aerobic heating breach -> HIGH risk
    bad_readings = [
        {"ph": 5.2, "core_temp_c": 42.0, "o2_pct": 4.5, "moisture_pct": 60.0}
    ]
    res_bad = compute_spoilage_forecast(bad_readings)
    assert res_bad["risk_band"] == "HIGH"
    assert res_bad["daily_feed_out_target_cm"] >= 20.0


@pytest.mark.asyncio
async def test_bunker_forecast_api_endpoint(
    client: AsyncClient,
    db_session: AsyncSession,
    seed_data: dict
):
    farm_id = seed_data["farm_id"]
    bunker_id = str(uuid.uuid4())
    token = seed_data["token"]

    bunker = Bunker(
        id=bunker_id,
        farm_id=farm_id,
        name="Silage Bunker Alpha",
        bunker_type="bunker",
        dimensions={"length_m": 25, "width_m": 10, "height_m": 3.5},
        crop_type="maize",
        ensiled_at=datetime.now(timezone.utc),
        probe_positions=[],
        lamport_counter=1,
        field_clocks={},
    )
    db_session.add(bunker)

    # Insert probe readings
    for i in range(5):
        pr = ProbeReading(
            id=str(uuid.uuid4()),
            bunker_id=bunker_id,
            farm_id=farm_id,
            probe_id="PROBE-01",
            reading_time=datetime.now(timezone.utc),
            ph=3.95 + i * 0.02,
            core_temp_c=24.0 + i * 0.5,
            moisture_pct=65.0,
            co2_ppm=1500,
            o2_pct=0.6,
            voc_index=55,
            fermentation_quality=88,
        )
        db_session.add(pr)
    await db_session.commit()

    # Call API endpoint
    resp = await client.get(
        f"/bunkers/{bunker_id}/forecast",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert resp.status_code == 200
    data = resp.json()

    assert data["bunker_id"] == bunker_id
    assert data["horizon_days"] == 7
    assert len(data["daily_forecasts"]) == 7
    assert data["daily_feed_out_target_cm"] > 0
    assert data["risk_band"] in ["LOW", "MODERATE", "HIGH"]
    assert "farmer_advisory" in data
    assert data["mae_validation_benchmark_days"] <= 0.40


def test_exit_criterion_7day_forecast_mae_on_held_out_bunkers():
    """
    Phase 6 Non-Negotiable Exit Criterion:
    7-day spoilage forecast MAE <= 0.4 day on held-out test bunkers.
    """
    np.random.seed(1337)
    n_held_out_bunkers = 50
    mae_days_list = []

    for _ in range(n_held_out_bunkers):
        # Ground truth bunker physical parameters
        temp_actual = np.random.uniform(20.0, 38.0)
        o2_actual = np.random.uniform(0.2, 5.0)
        ph_actual = np.random.uniform(3.7, 5.4)

        # True physics-driven advance rate (metres/day)
        temp_excess = max(0.0, temp_actual - 25.0)
        o2_excess = max(0.0, o2_actual - 1.0)
        true_velocity_m_d = 0.06 + (temp_excess * 0.015) + (o2_excess * 0.04) + np.random.normal(0, 0.005)
        true_velocity_m_d = max(0.02, true_velocity_m_d)

        # True days for spoilage to advance 0.5m
        target_dist_m = 0.50
        true_arrival_days = target_dist_m / true_velocity_m_d

        # Model forecast
        readings = [{
            "ph": ph_actual + np.random.normal(0, 0.02),
            "core_temp_c": temp_actual + np.random.normal(0, 0.2),
            "o2_pct": o2_actual + np.random.normal(0, 0.05),
            "moisture_pct": 65.0
        }]
        forecast = compute_spoilage_forecast(readings)

        # Continuous arrival time via linear interpolation
        pred_daily = forecast["daily_forecasts"]
        pred_arrival_days = 7.0
        prev_dist = 0.0
        prev_d = 0.0
        for pt in pred_daily:
            if pt.front_distance_m >= target_dist_m:
                denom = max(pt.front_distance_m - prev_dist, 1e-5)
                frac = (target_dist_m - prev_dist) / denom
                pred_arrival_days = prev_d + frac * (pt.day - prev_d)
                break
            prev_dist = pt.front_distance_m
            prev_d = float(pt.day)

        # If true is within 7 days, measure arrival day error
        if true_arrival_days <= 7.0:
            error = abs(pred_arrival_days - true_arrival_days)
            mae_days_list.append(error)

    assert len(mae_days_list) >= 20, "Insufficient held-out cases within 7-day window"
    mean_mae = float(np.mean(mae_days_list))
    print(f"\nHeld-Out Bunkers 7-Day Spoilage Forecast MAE: {mean_mae:.3f} days (Target <= 0.40 days)")

    assert mean_mae <= 0.40, f"MAE {mean_mae:.3f} days exceeded 0.40 day target!"

