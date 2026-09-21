"""
Tests for AAHAR Advisory Engine
"""
import pytest
from httpx import AsyncClient
from cloud.app.advisory.engine import AdvisoryEngine, LOCALES


def test_advisory_grade_a():
    proximates = {"crude_protein": 22.0, "moisture": 11.5, "adf": 24.0, "ndf": 38.0}
    safety = {"urea_pct": 0.0, "silica_pct": 0.5, "aflatoxin_b1_risk": "LOW", "mould_pct": 1.0}
    adv = AdvisoryEngine.compute_advisory(proximates=proximates, safety=safety, feed_type="CONCENTRATE_MIX")

    assert adv["grade"] == "A"
    assert adv["value_for_money"]["band"] in ("EXCELLENT_VALUE", "FAIR", "OVERPRICED")
    # All 8 locales populated
    for loc in LOCALES:
        assert loc in adv["local_text"]
        assert len(adv["local_text"][loc]["headline"]) > 0


def test_advisory_urea_rejection_and_rumen_impact():
    proximates = {"crude_protein": 28.0, "moisture": 10.0}
    # Urea adulteration 2.5% -> REJECT
    safety = {"urea_pct": 2.5, "silica_pct": 0.5, "aflatoxin_b1_risk": "LOW"}
    adv = AdvisoryEngine.compute_advisory(proximates=proximates, safety=safety)

    assert adv["grade"] == "REJECT"
    # Herd impact should highlight rumen
    regions = [hi["region"] for hi in adv["herd_impacts"]]
    assert "rumen" in regions
    # Punjabi string contains warning
    assert "ਰੱਦ ਕਰੋ" in adv["local_text"]["pa"]["headline"]


def test_advisory_aflatoxin_rejection_and_liver_impact():
    proximates = {"crude_protein": 18.0, "moisture": 13.0}
    safety = {"urea_pct": 0.0, "silica_pct": 0.0, "aflatoxin_b1_risk": "HIGH"}
    adv = AdvisoryEngine.compute_advisory(proximates=proximates, safety=safety)

    assert adv["grade"] == "REJECT"
    # Herd impact should highlight liver
    regions = [hi["region"] for hi in adv["herd_impacts"]]
    assert "liver" in regions
    assert any("pregnant" in act.lower() for act in adv["safety_actions"])


@pytest.mark.asyncio
async def test_advisory_recompute_endpoint(client: AsyncClient):
    req = {
        "proximates": {"crude_protein": {"value": 15.0}, "moisture": {"value": 12.0}},
        "safety": {"urea_pct": {"value": 0.1}, "aflatoxin_b1_risk": "LOW"},
        "feed_type": "MUSTARD_CAKE",
        "market_price_per_kg": 26.0,
    }
    res = await client.post("/advisory/recompute", json=req)
    assert res.status_code == 200
    data = res.json()
    assert data["grade"] in ("A", "B", "C")
    assert "value_for_money" in data
    assert "local_text" in data
