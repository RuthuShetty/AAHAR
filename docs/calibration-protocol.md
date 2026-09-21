# AAHAR Optical Calibration & Field Maintenance Protocol
**Document ID:** AAHAR-PROT-2026-002  
**Applicable Hardware:** AAHAR Handheld NIR Scanner (ESP32-S3, C12880MA / AS7265x)  
**Standard Compliance:** ASTM E1655 (Infrared Multivariate Quantitative Analysis) & ISO 12099  

---

## 1. Overview & Calibration Hierarchy

Field deployment of NIR spectrometers in varied agro-climatic conditions (e.g., $10^\circ\text{C}$ winter mornings in Punjab to $48^\circ\text{C}$ summer heat in Gujarat) requires a robust multi-tiered calibration system. AAHAR implements a three-tier calibration architecture:

```
[Tier 1: Pre-Scan Routine (Every Scan)]
   ├── Dark Reference Acquisition (Shutter Closed, CCD Dark Current Subtraction)
   └── White Reference Verification (Spectralon PTFE Standard, $R(\lambda) \ge 99\%$)

[Tier 2: Environmental Dynamic Compensation (Live In-Firmware)]
   ├── BME688 Optical Chamber Temperature & Humidity Sensing
   └── Temperature-Induced Wavelength Drift Polynomial Correction ($+0.15\text{ nm/}^\circ\text{C}$)

[Tier 3: Piecewise Direct Standardization (PDS)]
   ├── Master-to-Field Unit Transfer Matrix ($\mathbf{F}$ matrix)
   └── Monthly Calibration Tile Verification & Cloud Sync
```

---

## 2. Standard Pre-Scan Calibration Sequence

Every 90-second measurement cycle executes this automatic sequence coordinated by `firmware-handheld/optics/capture_sequence.cpp`:

1. **Dark Reference Capture (0.0s – 3.0s):**
   - Illumination lamps remain unpowered ($\text{PWM} = 0$).
   - Sensor captures 10 rapid frames.
   - Computes pixel-wise dark baseline vector: $\mathbf{D} = \frac{1}{10} \sum_{i=1}^{10} \mathbf{Raw}_i$.
   - Any pixel exhibiting dark count $> 300\text{ counts}$ is flagged for leakage or thermal overload.

2. **Tungsten Halogen Soft-Start Ramp (3.0s – 6.5s):**
   - PWM frequency sets to $32\text{ kHz}$ to prevent acoustic resonance.
   - Pulse-width ramps linearly over $3500\text{ ms}$ from $0\%$ to $100\%$, mitigating inrush thermal shock and extending tungsten filament life to $> 20,000$ scans.

3. **White Standard Measurement (6.5s – 10.0s):**
   - Sample chamber door must be closed with the built-in diffuse PTFE standard tile ($99\%$ reflectance from $900$ to $1700\text{ nm}$).
   - Measures white intensity vector: $\mathbf{W}$.
   - Computes signal-to-noise ratio: $\text{SNR} = 20 \log_{10}\left(\frac{\mathbf{W} - \mathbf{D}}{\sigma_{\mathbf{D}}}\right)$. If $\text{SNR} < 18\text{ dB}$, display indicates *"Clean Optical Window"*.

4. **Normalized Sample Reflectance Calculation:**
   $$\mathbf{R}(\lambda) = \frac{\mathbf{S}(\lambda) - \mathbf{D}(\lambda)}{\mathbf{W}(\lambda) - \mathbf{D}(\lambda)}$$
   Where $\mathbf{S}(\lambda)$ is the raw diffuse reflectance acquired with sample in the cup.

---

## 3. Piecewise Direct Standardization (PDS)

When moving models trained on a laboratory master instrument (e.g. FOSS NIRS DA1650 or Buchi NIRFlex) to hundreds of field handheld units, small variations in slit alignment, grating grating pitch, and detector responsivity must be standardized mathematically.

### PDS Formulation
For each wavelength channel $i$ of the master spectrometer, a local spectral window of $2k + 1$ channels ($k=2$, window width 5 bands) on the field spectrometer is related via regression:

$$S_{\text{master}, i} = \mathbf{s}_{\text{field}, (i-k):(i+k)} \cdot \mathbf{f}_i$$

The complete instrument transfer matrix $\mathbf{F}$ is banded diagonal ($228 \times 228$). During factory calibration:
1. 15 certified standard polymer and oil standards are measured on both the Master instrument and the Target Field unit.
2. The transfer matrix $\mathbf{F}$ is computed via ridge regression:
   $$\mathbf{F} = \left(\mathbf{X}_{\text{field}}^T \mathbf{X}_{\text{field}} + \lambda \mathbf{I}\right)^{-1} \mathbf{X}_{\text{field}}^T \mathbf{X}_{\text{master}}$$
3. $\mathbf{F}$ is embedded into the field unit's flash memory and synced with cloud device twins (`cloud/app/api/models_firmware.py`).

---

## 4. Temperature Compensation Protocol

The Hamamatsu C12880MA silicon CMOS linear sensor and transmission grating exhibit a thermal wavelength shift coefficient of:
$$\frac{d\lambda}{dT} = +0.153\text{ nm/}^\circ\text{C}$$

Without thermal correction, a temperature excursion from $20^\circ\text{C}$ (calibration room) to $45^\circ\text{C}$ (summer farm) shifts peak positions by:
$$\Delta \lambda = (45 - 20) \times 0.153 = +3.825\text{ nm}$$
This shift artificially mimics protein deficit or water peak broadening.

### Thermal Correction Engine
1. The BME688 probe inside the optical cavity logs cavity temperature $T_{\text{cavity}}$ immediately before spectral sweep.
2. The wavelength calibration polynomial coefficients are adjusted live:
   $$\lambda_i(T) = A_0 + A_1 \cdot i + A_2 \cdot i^2 + \left(T_{\text{cavity}} - 20.0\right) \cdot \alpha_T$$
3. Standard 228-band equidistant grid ($900.0\text{ nm}$ to $1700.0\text{ nm}$, step $= 3.5088\text{ nm}$) is generated via cubic Hermite spline interpolation on the temperature-corrected wavelength axis.

---

## 5. Field Recalibration & Quality Assurance

1. **Monthly White Standard Audit:**
   - Every 30 days, the mobile app prompts the FPO operator: *"Perform Monthly Reference Standard Check"*.
   - Operator scans the external sealed calibration puck (Spectra-Puck 99).
   - If spectral drift $\frac{\|\mathbf{W}_{\text{current}} - \mathbf{W}_{\text{factory}}\|}{\|\mathbf{W}_{\text{factory}}\|} > 0.012$ ($1.2\%$), the app prompts for optical window cleaning with anhydrous isopropanol wipes.
2. **Emergency Dark Current Alarm:**
   - If ambient light leaks into the chamber during dark reference (e.g. cracked chamber latch or worn rubber gasket), the device buzzes 3 times and halts scan:
   `ERROR_OPTICS_CHAMBER_LIGHT_LEAK (0x2104)`.
