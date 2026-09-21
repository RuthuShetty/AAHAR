"""
AAHAR ML — Spiked Adulteration Dataset Generator
Section 9.2 Step 3: Controlled spiking of pure feed samples with
Urea (0.5-8%), Sand/Silica (2-10%), and Melamine for ROC/PR validation.
"""

from typing import Dict, List, Tuple
import numpy as np
from .generator import synthesize_spectrum, WAVELENGTHS, FEED_PROFILES

def spike_sample(
    clean_spectrum: np.ndarray,
    feed_type: str,
    base_proximates: Dict[str, float],
    adulterant: str,
    level_pct: float,
) -> Tuple[np.ndarray, Dict[str, float]]:
    """
    Spikes an existing clean feed sample with a target adulterant level.
    Adjusts apparent crude protein:
    - Urea (CH4N2O): 46.7% Nitrogen. Using standard Kjeldahl factor 6.25:
      apparent CP increases by level_pct * (0.467 * 6.25) = level_pct * 2.918!
    - Melamine (C3H6N6): 66.6% Nitrogen. Apparent CP increases by level_pct * 4.16!
    - Silica / Sand: Insoluble ash increases linearly by level_pct.
    """
    spiked_prox = dict(base_proximates)
    adulterants = {"urea_pct": 0.0, "silica_pct": 0.0, "melamine_pct": 0.0}

    if adulterant == "urea":
        adulterants["urea_pct"] = level_pct
        apparent_cp = base_proximates["crude_protein_pct_dm"] + (level_pct * 2.918)
        spiked_prox["crude_protein_pct_dm"] = round(apparent_cp, 2)
    elif adulterant == "silica":
        adulterants["silica_pct"] = level_pct
        spiked_prox["ash_pct_dm"] = round(base_proximates["ash_pct_dm"] + level_pct, 2)
    elif adulterant == "melamine":
        adulterants["melamine_pct"] = level_pct
        apparent_cp = base_proximates["crude_protein_pct_dm"] + (level_pct * 4.16)
        spiked_prox["crude_protein_pct_dm"] = round(apparent_cp, 2)

    spiked_spectrum = synthesize_spectrum(feed_type, spiked_prox, adulterants)
    return spiked_spectrum, spiked_prox

def generate_spiked_benchmark_set() -> List[Dict]:
    """Generates benchmark validation matrix for Table 9.1 adulterant testing."""
    records = []
    test_feeds = ["COTTONSEED_CAKE", "MUSTARD_CAKE", "GROUNDNUT_CAKE", "CONCENTRATE_MIX"]
    urea_levels = [0.0, 0.5, 1.0, 2.0, 4.0, 8.0]
    silica_levels = [0.0, 2.0, 5.0, 10.0]

    for feed in test_feeds:
        mean_prox = {k: v[0] for k, v in FEED_PROFILES[feed].items()}
        for u in urea_levels:
            spec, prox = spike_sample(np.zeros(228), feed, mean_prox, "urea", u)
            records.append({
                "feed_type": feed,
                "adulterant": "urea",
                "level_pct": u,
                "detected_expected": u >= 0.5,
                "apparent_cp": prox["crude_protein_pct_dm"],
                "spectrum": spec.tolist(),
            })

        for s in silica_levels:
            spec, prox = spike_sample(np.zeros(228), feed, mean_prox, "silica", s)
            records.append({
                "feed_type": feed,
                "adulterant": "silica",
                "level_pct": s,
                "detected_expected": s >= 2.0,
                "apparent_ash": prox["ash_pct_dm"],
                "spectrum": spec.tolist(),
            })

    return records
