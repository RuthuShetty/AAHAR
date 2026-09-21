# AAHAR Model Cards — ML Pipeline v1.0.0

## Overview

All AAHAR models are **screening tools**, not diagnostic instruments.
Every prediction returns `{value, ci_low, ci_high, confidence, in_distribution: bool}`.
High-risk flags **mandate** lab referral; results are not quantitative clinical measurements.

---

## nir-proximate-v1

| Field | Value |
|-------|-------|
| **Task** | Multi-output regression: 7 proximate parameters from NIR spectrum |
| **Architecture** | PLS-R (12 LV) + 1D-CNN ensemble, equal weight |
| **Input** | 228-band NIR spectrum, SNV-corrected + 1st Savitzky-Golay derivative |
| **Outputs** | CP, Moisture, ADF, NDF, EE, Ash, ME (DM basis) |
| **Training Data** | 600 synthetic spectra, 15 feed types, calibrated to NDDB/ICAR tables |
| **RMSEP Targets** | CP ≤1.5%, Moisture ≤1.2%, ADF ≤2.1%, NDF ≤2.6%, EE ≤0.8%, Ash ≤1.1%, ME ≤0.6 MJ/kg |
| **INT8 Size** | ~1.8 MB |
| **Inference** | PLS-R runs in pure TypeScript typed arrays; CNN path runs via ONNX Runtime |
| **OOD Guard** | Mahalanobis distance; CI widens 2.5× outside training manifold |

**Known Limitations**
- Trained on 15 feed types; silage mixed with unusual forages may be OOD
- Moisture above 80% causes slight negative bias (log10 saturation)
- Lab verification required before any ration reformulation decision

---

## nir-adulterant-v1

| Field | Value |
|-------|-------|
| **Task** | Multi-label binary classification: Urea, Silica, Melamine |
| **Architecture** | 1D-CNN with SE attention + weighted BCE |
| **Input** | 228-band preprocessed spectrum |
| **Detection Thresholds** | Urea ≥0.5% DM, Silica ≥2.0% DM, Melamine ≥0.5% DM |
| **Exit Criteria** | F1 ≥0.93 (Urea), F1 ≥0.90 (Silica), F1 ≥0.88 (Melamine) |
| **INT8 Size** | ~0.9 MB |
| **False Positive Rate** | ~7% at 0.40 probability threshold |

**Mandatory Lab Referral Triggers**
- Any adulterant probability ≥ threshold
- Anomaly score > 0.035 (unknown substance)
- OOD distance > 12.5

**Known Limitations**
- Melamine in soybean-based feeds: reduced sensitivity (N-H overlap)
- Cannot distinguish Urea from other N-containing compounds at < 0.3%

---

## nir-anomaly-v1

| Field | Value |
|-------|-------|
| **Task** | Unsupervised anomaly detection (reconstruction error) |
| **Architecture** | Conv Autoencoder, 32-dim latent space |
| **Training** | Clean-only: 600 uncontaminated spectra |
| **Threshold** | 99th percentile of clean training set reconstruction error |
| **AUC Target** | ≥0.88 on Melamine OOD held-out set |
| **INT8 Size** | ~0.6 MB |

**Use Case**
Detects substance classes never seen in training: novel adulterants, probe contamination,
foreign material (plastics, metals). High reconstruction error → lab referral, regardless of
adulterant classifier output.

---

## silage-forecast-v1

| Field | Value |
|-------|-------|
| **Task** | 7-day spoilage front position forecast (metres from face) |
| **Architecture** | Temporal CNN + 2-layer GRU |
| **Input** | 30-day time series: pH, core temp, moisture, CO₂, O₂, VOC index, days sealed |
| **MAE Target** | ≤0.4 days |
| **INT8 Size** | ~1.2 MB |

**Spoilage Front Model**
- Aerobic deterioration governed by O₂ ingress rate and core temperature
- Front advance rate ~0.08–0.15 m/day under active spoilage
- Recommends daily pull-back depth to stay ahead of front

**Known Limitations**
- Trained on synthetic data; field validation with real bunker sensors required
- Assumes uniform compaction density; variable density reduces accuracy

---

## feed-type-classifier-v1

| Field | Value |
|-------|-------|
| **Task** | 15-class identification of feed type from NIR |
| **Architecture** | 1D-CNN |
| **Use** | Auto-routing to the correct advisory engine path |
| **Note** | Not shown to farmer; only used to pre-fill feed type selector |

---

## Shared Policies

### Confidence Reporting
All outputs carry `confidence ∈ [0, 1]`. When `in_distribution = false`, confidence is floored
to 0.45 and CI is widened by 2.5×. The UI displays a yellow "Uncertain" banner.

### Lab Referral Mandatory When
1. Any adulterant detected
2. Aflatoxin band = HIGH (>20 ppb equivalent)
3. `in_distribution = false`
4. OOD Mahalanobis distance > 12.5
5. CP > 45% DM (implausible without adulterant explanation)

### Regulatory Position
AAHAR predictions are agricultural decision-support tools. They are not food safety
certifications. Final feed decisions remain the farmer's and nutritionist's responsibility.
Results must not be shared as regulatory compliance evidence without independent lab verification.
