"""
Tests for MQTT Ingestion Worker & Silage Alerts
"""
import json
import uuid
from datetime import datetime, timezone
import pytest
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from cloud.app.models.entities import ProbeReading, Bunker, RegisteredProbe
from cloud.app.mqtt.worker import process_probe_message


@pytest.mark.asyncio
async def test_mqtt_probe_ingestion_and_alerts(db_session: AsyncSession, seed_data: dict):
    farm_id = seed_data["farm_id"]
    bunker_id = str(uuid.uuid4())
    probe_id = "AAHAR-S-001234"

    # Create a bunker first
    bunker = Bunker(
        id=bunker_id,
        farm_id=farm_id,
        name="Main Bunker",
        bunker_type="bunker",
        dimensions={"length_m": 20, "width_m": 8, "height_m": 3},
        crop_type="maize",
        ensiled_at=datetime.now(timezone.utc),
        probe_positions=[],
        lamport_counter=1,
        field_clocks={},
    )
    # Register probe bound to this farm & bunker
    probe = RegisteredProbe(
        id=probe_id,
        farm_id=farm_id,
        bunker_id=bunker_id,
        is_active=True,
    )
    db_session.add(bunker)
    db_session.add(probe)
    await db_session.commit()

    # 1. Normal reading (pH 3.9, Temp 24.5°C) -> No alerts
    rec_id_1 = str(uuid.uuid4())
    payload_normal = {
        "id": rec_id_1,
        "bunker_id": bunker_id,
        "farm_id": farm_id,
        "probe_id": probe_id,
        "reading_time": datetime.now(timezone.utc).isoformat(),
        "ph": 3.9,
        "core_temp_c": 24.5,
        "moisture_pct": 66.0,
        "co2_ppm": 1200,
        "o2_pct": 0.5,
        "voc_index": 45,
        "fermentation_quality": 92,
    }
    res_1 = await process_probe_message(
        payload_str=json.dumps(payload_normal),
        topic=f"aahar/{farm_id}/{probe_id}/reading",
        session=db_session,
    )
    assert len(res_1["alerts"]) == 0

    # 2. Spoilage breach reading (pH 5.1, Temp 38°C, O2 3.5%) -> 3 alerts
    rec_id_2 = str(uuid.uuid4())
    payload_breach = {
        "id": rec_id_2,
        "bunker_id": bunker_id,
        "farm_id": farm_id,
        "probe_id": probe_id,
        "reading_time": datetime.now(timezone.utc).isoformat(),
        "ph": 5.1,
        "core_temp_c": 38.0,
        "moisture_pct": 60.0,
        "co2_ppm": 400,
        "o2_pct": 3.5,
        "voc_index": 120,
        "fermentation_quality": 35,
    }
    res_2 = await process_probe_message(
        payload_str=json.dumps(payload_breach),
        topic=f"aahar/{farm_id}/{probe_id}/reading",
        session=db_session,
    )
    assert len(res_2["alerts"]) == 3
    alert_types = [a["type"] for a in res_2["alerts"]]
    assert "PH_ELEVATED" in alert_types
    assert "TEMPERATURE_SPIKE" in alert_types
    assert "SEAL_BREACH" in alert_types

    # Verify both records saved to database
    readings = (
        await db_session.execute(
            select(ProbeReading).filter(ProbeReading.bunker_id == bunker_id)
        )
    ).scalars().all()
    assert len(readings) == 2
