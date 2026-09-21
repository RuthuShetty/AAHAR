"""
AAHAR ML — NIR Spectral & Ground-Truth Dataset Generator
Synthesizes physical diffuse-reflectance NIR spectra (900–1700 nm, 228 bands)
for 15 feed types calibrated to AOAC wet-chemistry lab benchmarks.
"""

import json
import math
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple
import numpy as np

# Wavelength specification: 228 bands from 900 nm to 1700 nm
WAVELENGTHS = np.linspace(900.0, 1700.0, 228)

# Feed baseline profiles (mean & std for proximate parameters)
# Sourced from NDDB Animal Nutrition tables and ICAR feed libraries
FEED_PROFILES: Dict[str, Dict[str, Tuple[float, float]]] = {
    "MAIZE_SILAGE": {
        "moisture_pct": (65.0, 3.5),
        "crude_protein_pct_dm": (8.5, 0.9),
        "adf_pct_dm": (26.5, 2.0),
        "ndf_pct_dm": (45.0, 3.0),
        "crude_fat_pct_dm": (3.2, 0.4),
        "ash_pct_dm": (5.5, 0.8),
        "me_mj_kg_dm": (10.2, 0.5),
    },
    "WHEAT_STRAW": {
        "moisture_pct": (9.5, 1.2),
        "crude_protein_pct_dm": (3.8, 0.6),
        "adf_pct_dm": (51.0, 3.2),
        "ndf_pct_dm": (72.0, 4.0),
        "crude_fat_pct_dm": (1.2, 0.3),
        "ash_pct_dm": (9.8, 1.5),
        "me_mj_kg_dm": (6.4, 0.4),
    },
    "COTTONSEED_CAKE": {
        "moisture_pct": (8.5, 1.0),
        "crude_protein_pct_dm": (23.5, 1.8),
        "adf_pct_dm": (28.0, 2.5),
        "ndf_pct_dm": (42.0, 3.5),
        "crude_fat_pct_dm": (7.5, 1.1),
        "ash_pct_dm": (6.5, 0.7),
        "me_mj_kg_dm": (11.0, 0.6),
    },
    "MUSTARD_CAKE": {
        "moisture_pct": (9.0, 1.1),
        "crude_protein_pct_dm": (35.0, 2.2),
        "adf_pct_dm": (16.0, 1.5),
        "ndf_pct_dm": (27.5, 2.5),
        "crude_fat_pct_dm": (8.2, 1.2),
        "ash_pct_dm": (7.2, 0.9),
        "me_mj_kg_dm": (12.2, 0.7),
    },
    "TMR": {
        "moisture_pct": (45.0, 5.0),
        "crude_protein_pct_dm": (15.5, 1.2),
        "adf_pct_dm": (22.0, 2.0),
        "ndf_pct_dm": (36.0, 2.8),
        "crude_fat_pct_dm": (4.5, 0.6),
        "ash_pct_dm": (7.0, 0.8),
        "me_mj_kg_dm": (10.8, 0.5),
    },
    "GREEN_FODDER": {
        "moisture_pct": (78.0, 4.0),
        "crude_protein_pct_dm": (11.0, 1.5),
        "adf_pct_dm": (32.0, 2.5),
        "ndf_pct_dm": (52.0, 3.8),
        "crude_fat_pct_dm": (2.8, 0.5),
        "ash_pct_dm": (8.5, 1.1),
        "me_mj_kg_dm": (8.8, 0.6),
    },
    "CONCENTRATE_MIX": {
        "moisture_pct": (10.5, 1.0),
        "crude_protein_pct_dm": (21.0, 1.5),
        "adf_pct_dm": (14.0, 1.4),
        "ndf_pct_dm": (28.0, 2.2),
        "crude_fat_pct_dm": (4.2, 0.5),
        "ash_pct_dm": (8.0, 0.9),
        "me_mj_kg_dm": (11.5, 0.5),
    },
    "BERSEEM": {
        "moisture_pct": (82.0, 3.0),
        "crude_protein_pct_dm": (19.5, 1.6),
        "adf_pct_dm": (28.5, 2.1),
        "ndf_pct_dm": (41.0, 3.0),
        "crude_fat_pct_dm": (3.0, 0.4),
        "ash_pct_dm": (11.0, 1.2),
        "me_mj_kg_dm": (9.4, 0.5),
    },
    "NAPIER": {
        "moisture_pct": (76.0, 3.5),
        "crude_protein_pct_dm": (9.2, 1.1),
        "adf_pct_dm": (38.0, 2.8),
        "ndf_pct_dm": (62.0, 3.9),
        "crude_fat_pct_dm": (2.2, 0.3),
        "ash_pct_dm": (10.2, 1.3),
        "me_mj_kg_dm": (7.9, 0.5),
    },
    "SORGHUM_SILAGE": {
        "moisture_pct": (68.0, 3.8),
        "crude_protein_pct_dm": (7.8, 0.8),
        "adf_pct_dm": (32.0, 2.4),
        "ndf_pct_dm": (54.0, 3.4),
        "crude_fat_pct_dm": (2.5, 0.4),
        "ash_pct_dm": (6.8, 0.9),
        "me_mj_kg_dm": (9.1, 0.5),
    },
    "GROUNDNUT_CAKE": {
        "moisture_pct": (8.0, 1.0),
        "crude_protein_pct_dm": (44.0, 2.5),
        "adf_pct_dm": (13.0, 1.2),
        "ndf_pct_dm": (22.0, 2.0),
        "crude_fat_pct_dm": (8.8, 1.3),
        "ash_pct_dm": (6.0, 0.8),
        "me_mj_kg_dm": (12.8, 0.6),
    },
    "RICE_STRAW": {
        "moisture_pct": (10.0, 1.2),
        "crude_protein_pct_dm": (3.2, 0.5),
        "adf_pct_dm": (53.0, 3.5),
        "ndf_pct_dm": (74.0, 4.2),
        "crude_fat_pct_dm": (1.1, 0.2),
        "ash_pct_dm": (16.5, 2.2),
        "me_mj_kg_dm": (5.8, 0.4),
    },
    "SOYBEAN_MEAL": {
        "moisture_pct": (9.5, 1.0),
        "crude_protein_pct_dm": (46.5, 2.0),
        "adf_pct_dm": (9.5, 1.0),
        "ndf_pct_dm": (15.0, 1.5),
        "crude_fat_pct_dm": (2.0, 0.4),
        "ash_pct_dm": (6.2, 0.7),
        "me_mj_kg_dm": (12.5, 0.5),
    },
    "MAIZE_GRAIN": {
        "moisture_pct": (12.0, 1.2),
        "crude_protein_pct_dm": (9.2, 0.8),
        "adf_pct_dm": (3.8, 0.5),
        "ndf_pct_dm": (10.5, 1.1),
        "crude_fat_pct_dm": (4.1, 0.5),
        "ash_pct_dm": (1.6, 0.3),
        "me_mj_kg_dm": (13.4, 0.4),
    },
    "OTHER": {
        "moisture_pct": (15.0, 5.0),
        "crude_protein_pct_dm": (16.0, 4.0),
        "adf_pct_dm": (25.0, 5.0),
        "ndf_pct_dm": (40.0, 6.0),
        "crude_fat_pct_dm": (4.0, 1.0),
        "ash_pct_dm": (7.0, 1.5),
        "me_mj_kg_dm": (10.0, 1.0),
    },
}

def gaussian_band(wavelengths: np.ndarray, center: float, width: float, amplitude: float) -> np.ndarray:
    """Calculates Gaussian optical absorption band."""
    return amplitude * np.exp(-0.5 * ((wavelengths - center) / width) ** 2)

def synthesize_spectrum(
    feed_type: str,
    proximates: Dict[str, float],
    adulterants: Optional[Dict[str, float]] = None,
    noise_level: float = 0.008,
    temp_c: float = 25.0,
) -> np.ndarray:
    """
    Generates realistic 228-band diffuse reflectance spectrum from proximates and adulterants.
    """
    wl = WAVELENGTHS
    # Baseline diffuse scattering (Mie + Rayleigh slope)
    baseline = 0.45 - 0.00015 * (wl - 900.0) + (proximates.get("ash_pct_dm", 6.0) * 0.004)

    # 1. Moisture: O-H fundamental overtone (1440 nm) and 2nd overtone (970 nm)
    m_pct = proximates.get("moisture_pct", 12.0)
    absorbance = baseline.copy()
    absorbance += gaussian_band(wl, 1440.0 + (temp_c - 25.0) * 0.15, 38.0, m_pct * 0.024)
    absorbance += gaussian_band(wl, 970.0, 25.0, m_pct * 0.004)

    # 2. Crude Protein: N-H overtone (1510 nm) & combination band (1680 nm)
    cp_pct = proximates.get("crude_protein_pct_dm", 18.0)
    absorbance += gaussian_band(wl, 1512.0, 32.0, cp_pct * 0.016)
    absorbance += gaussian_band(wl, 1682.0, 28.0, cp_pct * 0.012)
    absorbance += gaussian_band(wl, 1020.0, 20.0, cp_pct * 0.003)

    # 3. Crude Fat: C-H 1st overtone doublets (1720 nm and 1760 nm)
    fat_pct = proximates.get("crude_fat_pct_dm", 4.0)
    absorbance += gaussian_band(wl, 1724.0, 18.0, fat_pct * 0.018)
    absorbance += gaussian_band(wl, 1760.0, 16.0, fat_pct * 0.012)
    absorbance += gaussian_band(wl, 1210.0, 22.0, fat_pct * 0.005)

    # 4. Fibres (ADF / NDF): Cellulose and hemicellulose broad structural bands
    adf_pct = proximates.get("adf_pct_dm", 25.0)
    ndf_pct = proximates.get("ndf_pct_dm", 42.0)
    absorbance += gaussian_band(wl, 1205.0, 35.0, ndf_pct * 0.005)
    absorbance += gaussian_band(wl, 1360.0, 42.0, (adf_pct + ndf_pct) * 0.004)
    absorbance += gaussian_band(wl, 1600.0, 30.0, adf_pct * 0.006)

    # 5. Adulterants if spiked
    if adulterants:
        # Urea: sharp primary absorption at 1480 nm
        urea_pct = adulterants.get("urea_pct", 0.0)
        if urea_pct > 0.0:
            absorbance += gaussian_band(wl, 1482.0, 16.0, urea_pct * 0.045)
            absorbance += gaussian_band(wl, 1030.0, 14.0, urea_pct * 0.010)

        # Sand / Silica: increases broad baseline scattering
        silica_pct = adulterants.get("silica_pct", 0.0)
        if silica_pct > 0.0:
            absorbance += (silica_pct * 0.012)
            absorbance += gaussian_band(wl, 1150.0, 60.0, silica_pct * 0.006)

        # Melamine: triazine ring overtone at 1465 nm
        melamine_pct = adulterants.get("melamine_pct", 0.0)
        if melamine_pct > 0.0:
            absorbance += gaussian_band(wl, 1465.0, 14.0, melamine_pct * 0.052)
            absorbance += gaussian_band(wl, 1630.0, 18.0, melamine_pct * 0.038)

    # Add Gaussian instrument noise
    if noise_level > 0:
        noise = np.random.normal(0, noise_level, size=wl.shape)
        absorbance += noise

    # Convert absorbance to raw sensor counts (Hamamatsu C12880MA: 16-bit 0–65535, white reference ~58000)
    white_ref = 58000.0
    dark_ref = 120.0
    # Beer-Lambert: Intensity = WhiteRef * 10^(-absorbance) + DarkRef
    intensities = white_ref * (10.0 ** (-absorbance)) + dark_ref
    return np.clip(intensities, 0, 65535)

def generate_dataset(
    n_samples_per_feed: int = 40,
    spiked_ratio: float = 0.25,
    seed: int = 42,
) -> Tuple[np.ndarray, List[Dict[str, Any]], np.ndarray]:
    """
    Generates a full dataset across all 15 feed types with ground truth proximates.
    Returns:
      spectra: np.ndarray shape (N, 228)
      metadata: List of dicts with feed_type, proximates, adulterants, labels
      wavelengths: np.ndarray shape (228,)
    """
    np.random.seed(seed)
    all_spectra = []
    all_meta = []

    for feed_type, ranges in FEED_PROFILES.items():
        for i in range(n_samples_per_feed):
            proximates = {}
            for param, (mean, std) in ranges.items():
                val = float(np.clip(np.random.normal(mean, std), 0.5, 95.0))
                proximates[param] = round(val, 2)

            # Ensure ME calculation follows MAFF equation
            cp = proximates["crude_protein_pct_dm"]
            ee = proximates["crude_fat_pct_dm"]
            ash = proximates["ash_pct_dm"]
            ndf = proximates["ndf_pct_dm"]
            me = 0.012 * cp + 0.031 * ee + 0.014 * (100.0 - proximates["adf_pct_dm"])
            proximates["me_mj_kg_dm"] = round(float(np.clip(me, 4.0, 14.5)), 2)

            # Determine spiking — applies to all feed types proportionally
            adulterants = {"urea_pct": 0.0, "silica_pct": 0.0, "melamine_pct": 0.0}
            is_spiked = np.random.rand() < spiked_ratio
            if is_spiked:
                adulterant_type = np.random.choice(["urea", "silica", "melamine"])
                if adulterant_type == "urea":
                    adulterants["urea_pct"] = float(np.random.choice([0.5, 1.0, 2.0, 4.0, 6.0, 8.0]))
                elif adulterant_type == "silica":
                    adulterants["silica_pct"] = float(np.random.choice([2.0, 4.0, 6.0, 10.0]))
                else:
                    adulterants["melamine_pct"] = float(np.random.choice([0.5, 1.0, 2.5, 5.0]))

            temp_c = float(np.random.uniform(18.0, 38.0))
            spectrum = synthesize_spectrum(feed_type, proximates, adulterants, temp_c=temp_c)

            all_spectra.append(spectrum)
            all_meta.append({
                "sample_id": f"SMP-{feed_type[:4]}-{i+1:03d}",
                "feed_type": feed_type,
                "proximates": proximates,
                "adulterants": adulterants,
                "is_adulterated": any(v > 0.0 for v in adulterants.values()),
                "temperature_c": temp_c,
            })

    return np.array(all_spectra), all_meta, WAVELENGTHS

if __name__ == "__main__":
    spectra, meta, wl = generate_dataset(n_samples_per_feed=40)
    print(f"Generated {len(meta)} physical spectra across {len(FEED_PROFILES)} feed types.")
    print(f"Spectra shape: {spectra.shape}, Wavelengths: {wl[0]:.1f} - {wl[-1]:.1f} nm")
    out_dir = Path(__file__).parent
    with open(out_dir / "ground_truth_seed.json", "w") as f:
        json.dump(meta[:15], f, indent=2)
    print(f"Saved seed preview to {out_dir / 'ground_truth_seed.json'}")
