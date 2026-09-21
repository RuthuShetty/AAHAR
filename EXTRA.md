# AAHAR Technical Reference Manual (EXTRA.md)

### Mathematical Formulations, Chemometric Algorithms, Biophysical PDEs, Cryptographic Specifications, and Hardware Topography

---

## 1. Optical Physics and Near-Infrared Spectroscopy

### 1.1 Diffuse Reflectance and the Kubelka-Munk Transformation

Near-infrared (NIR) spectroscopy in solid agricultural commodities (milled grains, oilseed cakes, chopped silage) is dominated by diffuse reflectance rather than pure specular reflection or straight-path transmittance. Incident radiation enters the particulate matrix, undergoes multiple internal refractions and Rayleigh/Mie scattering events across particle boundaries, and re-emerges isotropically.

Specular reflection (Fresnel surface reflection) carries no chemical absorption information. The diffuse reflectance $R_\infty$ of an infinitely thick sample layer (where further increases in thickness do not alter measured reflectance) is modeled via the Kubelka-Munk theory:

$$F(R_\infty) = \frac{(1 - R_\infty)^2}{2 R_\infty} = \frac{K}{S}$$

Where:
- $R_\infty$: Absolute diffuse reflectance of the sample relative to an ideal non-absorbing standard (e.g., sintered PTFE or Spectralon).
- $K$: Linear absorption coefficient ($m^{-1}$), directly proportional to analyte concentration $c$ via the Beer-Lambert relation: $K = \sum_i \epsilon_i c_i$.
- $S$: Scattering coefficient ($m^{-1}$), dictated by particle size distribution, packing density, and refractive index mismatch.

In practice, for rapid handheld instrumentation, pseudo-absorbance is computed as:

$$A(\lambda) = \log_{10}\left(\frac{1}{R(\lambda)}\right) = \log_{10}\left(\frac{I_{white}(\lambda) - I_{dark}(\lambda)}{I_{sample}(\lambda) - I_{dark}(\lambda)}\right)$$

Where:
- $I_{sample}(\lambda)$: Raw digitizer counts from the sample scan at wavelength $\lambda$.
- $I_{white}(\lambda)$: Raw digitizer counts from the certified sintered PTFE reference tile.
- $I_{dark}(\lambda)$: Raw digitizer counts acquired with shutter closed (or lamp off), capturing electronic bias and thermal dark current.

---

### 1.2 InGaAs Linear Photodiode Detector Physics

The AAHAR handheld spectrometer utilizes a uncooled 256-pixel Indium Gallium Arsenide ($In_{0.53}Ga_{0.47}As$) photodiode linear array lattice-matched to an Indium Phosphide ($InP$) substrate.

| Parameter | Specification | Physical Significance |
| :--- | :--- | :--- |
| Wavelength Range | 900 nm to 1700 nm | Covers first and second vibrational overtones of C-H, O-H, and N-H bonds |
| Number of Pixels | 256 | Discrete spatial sampling across the dispersed focal plane |
| Pixel Dimensions | $50\ \mu\text{m} \times 500\ \mu\text{m}$ | $10:1$ aspect ratio maximizing optical throughput and signal collection |
| Pixel Pitch | $50\ \mu\text{m}$ center-to-center | Defines linear spatial dispersion $\frac{dx}{d\lambda}$ |
| Quantum Efficiency ($\eta$) | $\ge 72\%$ (1000–1650 nm) | High electron-hole pair generation per incident photon |
| Peak Responsivity | $0.95\text{ A/W}$ at 1550 nm | Optimal sensitivity in the primary protein/moisture overtone band |
| Dynamic Range | $5000:1$ (14-bit ADC) | Resolves weak trace adulterant absorbances superimposed on dense baselines |
| Dark Current ($I_d$) | $\le 1.5\text{ pA}$ at $25^\circ\text{C}$ | Thermally generated carrier baseline; subtracted dynamically per scan cycle |

#### Wavelength Dispersion Calibration
The Czerny-Turner optical polychromator projects wavelengths onto the linear array according to the grating equation:

$$m \lambda = d (\sin \alpha + \sin \beta)$$

Where $m$ is diffraction order ($m=1$), $d$ is grating groove spacing ($1.667\ \mu\text{m}$ for 600 lines/mm), $\alpha$ is incident angle, and $\beta$ is diffraction angle. The pixel-to-wavelength mapping is calibrated using a low-pressure Argon-Mercury gas discharge lamp and modeled via a third-order polynomial:

$$\lambda(p) = a_0 + a_1 p + a_2 p^2 + a_3 p^3$$

Where $p \in [0, 255]$ is the pixel index. Nominal calibration coefficients:
- $a_0 = 894.21\text{ nm}$
- $a_1 = 3.1842\text{ nm/pixel}$
- $a_2 = -2.14 \times 10^{-4}\text{ nm/pixel}^2$
- $a_3 = 4.88 \times 10^{-8}\text{ nm/pixel}^3$

Optical resolution is $6.0\text{ nm}$ Full Width at Half Maximum (FWHM) across the entire active band.

---

### 1.3 Molecular Vibrational Overtones and Target Analyte Absorption Bands

NIR absorption bands represent anharmonic vibrational overtones ($\Delta v = 2, 3, \dots$) and combination bands ($\Delta v_1 + \Delta v_2$) of fundamental mid-infrared molecular vibrations. The potential energy $V(r)$ of an anharmonic chemical oscillator is governed by the Morse potential:

$$V(r) = D_e \left(1 - e^{-a(r - r_e)}\right)^2$$

Because hydrogen atoms have negligible atomic mass ($m_H \approx 1\text{ Da}$), bonds involving hydrogen ($C-H$, $O-H$, $N-H$) display high anharmonicity factors, making their overtones dominant in the 900 nm to 1700 nm region.

```
Wavelength (nm)    Molecular Assignment               Feed Target Analyte
-----------------------------------------------------------------------------------------
960 - 980 nm       O-H 2nd overtone stretch           Free moisture in wet forage
1100 - 1250 nm     Scattering baseline shift          Silica sand / Acid Insoluble Ash
1180 - 1220 nm     C-H 2nd overtone stretch           Crude Fat / Lipids / Oil content
1450 nm            O-H 1st overtone stretch           Total water / Moisture equilibrium
1450 & 1490 nm     N-H 1st overtone symmetric         Urea adulterant (sharp doublet)
1510 nm            N-H 1st overtone peptide stretch   True Crude Protein (amino acids)
1680 nm            C-H aromatic / N-H combination     True Crude Protein / Crude Fiber
```

#### Urea Adulteration Detection Physics
Pure commercial cattle cakes exhibit a broad, smooth protein envelope between 1480 nm and 1530 nm caused by the diverse peptide bonds of vegetable storage proteins (globulins and prolamins). Synthetic Urea ($NH_2-CO-NH_2$) contains concentrated, non-hydrogen-bonded amine groups that produce sharp, distinct absorption doublets at **1450 nm** and **1490 nm**. Even at concentrations as low as $0.5\%\text{ w/w}$, these doublets introduce distinct curvature inflections in the first and second mathematical derivatives of the spectrum.

#### Silica Sand and Marble Dust Physics
Silica ($SiO_2$) and calcium carbonate ($CaCO_3$) do not possess covalent hydrogen bonds and exhibit negligible discrete vibrational absorption in the 900–1700 nm window. However, dense mineral particles induce intense Mie scattering ($d \gg \lambda$). This alters the effective scattering coefficient $S$, producing an elevated baseline offset accompanied by a steep negative spectral slope between 1100 nm and 1250 nm:

$$\frac{d A(\lambda)}{d \lambda} < -0.0018\text{ nm}^{-1}$$

---

## 2. Mathematical Pre-Processing and Chemometrics

Raw NIR spectra contain non-linear physical interference caused by sample compaction, uneven particle size, and optical path length variation. Multi-stage pre-processing isolates chemical absorption from physical scattering before multivariate calibration.

```
   Raw Reflectance R(lambda)
              |
              v
   +----------------------+
   | Pseudo-Absorbance    |  A = log10(1 / R)
   +----------+-----------+
              |
              v
   +----------------------+
   | Standard Normal      |  Zero-mean, unit-variance scaling per sample
   | Variate (SNV)        |
   +----------+-----------+
              |
              v
   +----------------------+
   | Savitzky-Golay       |  15-point window, 2nd-degree polynomial,
   | 1st Derivative       |  1st derivative (resolves overlapping peaks)
   +----------+-----------+
              |
              v
   +----------------------+
   | Robust Mahalanobis   |  FastMCD Out-Of-Distribution (OOD) check
   | Distance Filter      |  Threshold: D_M <= 12.5
   +----------+-----------+
              |
              v
   +----------------------+
   | PLS-R Regression     |  SIMPLS algorithm, 8 Latent Variables
   | Calibration Matrix   |  Computes CP, Moisture, NDF, ADF, Urea %
   +----------------------+
```

---

### 2.1 Standard Normal Variate (SNV)

SNV centers each individual spectrum about its own mean and scales it by its standard deviation across all $P = 256$ wavelength channels. This eliminates multiplicative scatter and additive baseline offsets without requiring external reference standards.

For spectrum sample vector $\mathbf{x}_i = [x_{i,1}, x_{i,2}, \dots, x_{i,P}]^T$:

$$\bar{x}_i = \frac{1}{P} \sum_{j=1}^P x_{i,j}$$

$$s_i = \sqrt{\frac{1}{P - 1} \sum_{j=1}^P (x_{i,j} - \bar{x}_i)^2}$$

$$z_{i,j} = \frac{x_{i,j} - \bar{x}_i}{s_i}, \quad \forall j \in [1, P]$$

---

### 2.2 Savitzky-Golay Convolution Filtering

To resolve overlapping absorption peaks and eliminate residual slope drift, a Savitzky-Golay filter fits a local polynomial of degree $d$ to a symmetric moving window of $2m + 1$ spectral channels using linear least squares.

Given window half-width $m = 7$ (total window $2m + 1 = 15$ channels) and polynomial degree $d = 2$, the local polynomial is:

$$p(t) = c_0 + c_1 t + c_2 t^2, \quad t \in [-m, m]$$

The first derivative at the center point ($t = 0$) corresponds to coefficient $c_1$:

$$\left.\frac{d p(t)}{d t}\right|_{t=0} = c_1 = \sum_{j=-m}^m h_j^{(1)} z_{i+j}$$

Where convolution weights $h_j^{(1)}$ are derived from the pseudo-inverse of the Vandermonde design matrix $\mathbf{V}$:

$$\mathbf{V} = \begin{bmatrix}
1 & -m & (-m)^2 \\
\vdots & \vdots & \vdots \\
1 & 0 & 0 \\
\vdots & \vdots & \vdots \\
1 & m & m^2
\end{bmatrix}, \quad \mathbf{H} = (\mathbf{V}^T \mathbf{V})^{-1} \mathbf{V}^T$$

Row index 1 of matrix $\mathbf{H}$ yields the exact convolution kernel $\mathbf{h}^{(1)}$ for the first derivative.

---

### 2.3 Partial Least Squares Regression (PLS-R)

PLS-R decomposes both the pre-processed spectral matrix $\mathbf{X} \in \mathbb{R}^{N \times P}$ and reference wet-chemistry property matrix $\mathbf{Y} \in \mathbb{R}^{N \times M}$ simultaneously, maximizing covariance between spectral score vectors $\mathbf{T}$ and response score vectors $\mathbf{U}$:

$$\mathbf{X} = \mathbf{T} \mathbf{P}^T + \mathbf{E}$$

$$\mathbf{Y} = \mathbf{U} \mathbf{Q}^T + \mathbf{F}$$

$$\mathbf{U} = \mathbf{T} \mathbf{B} + \mathbf{H}$$

The SIMPLS algorithm computes orthogonal weight vectors $\mathbf{r}_a$ for each latent variable $a \in [1, A]$ (with $A = 8$ optimal latent variables chosen via cross-validation):

$$\mathbf{r}_a = \text{argmax}_{\mathbf{r}} \left(\mathbf{r}^T \mathbf{X}^T \mathbf{Y} \mathbf{Y}^T \mathbf{X} \mathbf{r}\right) \quad \text{s.t.} \quad \|\mathbf{r}\| = 1, \quad \mathbf{t}_a^T \mathbf{t}_b = 0 \quad (\forall b < a)$$

The final linear prediction vector $\boldsymbol{\beta} \in \mathbb{R}^{P \times 1}$ for property $y$ (e.g., Crude Protein percentage) is:

$$\boldsymbol{\beta} = \mathbf{R} (\mathbf{P}^T \mathbf{R})^{-1} \mathbf{Q}^T$$

Given a new pre-processed sample spectrum $\mathbf{z}_{new} \in \mathbb{R}^{1 \times P}$, the property is predicted instantly via a single vector dot product:

$$\hat{y}_{new} = \bar{y} + (\mathbf{z}_{new} - \bar{\mathbf{z}}) \boldsymbol{\beta}$$

#### Variable Importance in Projection (VIP)
Wavelength relevance is evaluated via VIP scores:

$$\text{VIP}_j = \sqrt{P \sum_{a=1}^A \left(SSY_a \cdot \left(\frac{w_{a,j}}{\|\mathbf{w}_a\|}\right)^2\right) \Bigg/ \sum_{a=1}^A SSY_a}$$

Wavelengths with $\text{VIP}_j > 1.0$ (predominantly 1450 nm, 1490 nm, 1510 nm, and 1680 nm) represent critical chemical discriminators.

---

### 2.4 Out-of-Distribution (OOD) Detection via Robust Mahalanobis Distance

To prevent inaccurate extrapolations when scanning novel feedstuffs or uncalibrated adulterants, each sample's latent score projection $\mathbf{t}_{new} \in \mathbb{R}^{1 \times A}$ is evaluated against the training population centroid using the robust Mahalanobis distance:

$$D_M(\mathbf{t}_{new}) = \sqrt{(\mathbf{t}_{new} - \hat{\boldsymbol{\mu}}_{MCD}) \hat{\boldsymbol{\Sigma}}_{MCD}^{-1} (\mathbf{t}_{new} - \hat{\boldsymbol{\mu}}_{MCD})^T}$$

Where $\hat{\boldsymbol{\mu}}_{MCD}$ and $\hat{\boldsymbol{\Sigma}}_{MCD}$ are the Minimum Covariance Determinant (FastMCD) robust estimates of center and dispersion, resistant to up to $40\%$ leverage outliers in calibration datasets.

Under Gaussian score distributions, $D_M^2$ follows a chi-squared distribution with $A$ degrees of freedom ($\chi_A^2$). For $A = 8$ latent variables at significance level $\alpha = 0.01$:

$$\text{Threshold } D_{crit} = \sqrt{\chi_{8, 0.99}^2} = \sqrt{20.09} = 4.48 \implies D_M \le 12.5 \text{ (scaled cutoff)}$$

- $D_M \le 12.5$: In-distribution sample. Prediction accepted.
- $D_M > 12.5$: Out-of-distribution anomaly. App displays `MODEL_UNAVAILABLE / ATYPICAL_SAMPLE` warning and requests reference wet-lab submission.

---

## 3. Silage Biophysics and Spoilage Partial Differential Equations

Silage aerobic deterioration is a coupled thermodynamic and biochemical process. Aerobic yeasts (*Candida*, *Pichia*) and acetic acid bacteria oxidize ensiled lactic acid and soluble sugars into carbon dioxide, water, and heat:

$$\text{C}_6\text{H}_{12}\text{O}_6 + 6 \text{O}_2 \longrightarrow 6 \text{CO}_2 + 6 \text{H}_2\text{O} + 2870\text{ kJ/mol (Heat)}$$

$$\text{CH}_3\text{CH(OH)COOH} + 3 \text{O}_2 \longrightarrow 3 \text{CO}_2 + 3 \text{H}_2\text{O} + 1344\text{ kJ/mol (Heat)}$$

---

### 3.1 Governing Partial Differential Equations

The spatiotemporal evolution of temperature $T(x,y,z,t)$, oxygen concentration $C_{O2}(x,y,z,t)$, and substrate lactic acid concentration $C_L(x,y,z,t)$ inside the bunker is modeled by coupled advection-diffusion-reaction equations.

#### 1. Oxygen Mass Conservation:
$$\frac{\partial (\epsilon C_{O2})}{\partial t} = \nabla \cdot \left(D_{eff} \nabla C_{O2}\right) - \nabla \cdot (\mathbf{u} C_{O2}) - R_{O2}(T, C_{O2}, \text{pH})$$

Where:
- $\epsilon$: Porosity of compacted silage ($0.25 \le \epsilon \le 0.45$).
- $D_{eff}$: Effective diffusion coefficient of $O_2$ in porous biomass ($D_{eff} = \epsilon^{1.5} D_{air} \approx 4.8 \times 10^{-6}\text{ m}^2/\text{s}$).
- $\mathbf{u}$: Convective pore gas velocity driven by barometric pumping and thermal buoyancy.
- $R_{O2}$: Volumetric oxygen uptake rate ($\text{mol}/(\text{m}^3 \cdot \text{s})$).

#### 2. Heat Conduction and Generation:
$$\rho_{bulk} c_p \frac{\partial T}{\partial t} = \nabla \cdot \left(k_{th} \nabla T\right) + \Delta H_{rxn} \cdot R_{O2}(T, C_{O2}, \text{pH}) - h_c (T - T_{amb})$$

Where:
- $\rho_{bulk}$: Bulk packing density ($650\text{ to }850\text{ kg/m}^3$ wet basis; $\ge 225\text{ kg DM/m}^3$).
- $c_p$: Specific heat capacity of silage ($c_p \approx 2100\text{ J}/(\text{kg} \cdot \text{K})$).
- $k_{th}$: Thermal conductivity ($k_{th} \approx 0.38\text{ W}/(\text{m} \cdot \text{K})$).
- $\Delta H_{rxn}$: Average heat of reaction per mole $O_2$ consumed ($460\text{ kJ/mol } O_2$).

#### 3. Microbial Reaction Kinetics:
The reaction rate follows dual Monod-Michaelis-Menten kinetics modulated by Arrhenius temperature scaling:

$$R_{O2} = \mu_{max} \cdot X_{yeast} \cdot \left(\frac{C_{O2}}{K_{O2} + C_{O2}}\right) \cdot \left(\frac{C_L}{K_L + C_L}\right) \cdot \exp\left(-\frac{E_a}{R}\left(\frac{1}{T} - \frac{1}{T_{ref}}\right)\right) \cdot \Phi(\text{pH})$$

Where:
- $X_{yeast}$: Yeast population density.
- $\Phi(\text{pH})$: Activity function switching from quiescent at $\text{pH} \le 3.8$ to exponential activation as lactic acid degrades and $\text{pH} > 4.5$.

---

### 3.2 Spoilage Front Propagation Velocity

When oxygen enters an uncompacted bunker face or through a plastic rupture, an aerobic degradation front forms and advances into the anaerobic mass. The linear front velocity $v_{front}$ is derived from one-dimensional mass balance:

$$v_{front} = \frac{J_{O2}}{\rho_{DM} \cdot Y_{O2/DM}} = \frac{-D_{eff} \left.\frac{\partial C_{O2}}{\partial x}\right|_{face}}{\rho_{DM} \cdot Y_{O2/DM}}$$

Under typical North Indian ambient conditions ($32^\circ\text{C}$ ambient, $200\text{ kg DM/m}^3$ density, $D_{eff} = 4.8 \times 10^{-6}\text{ m}^2/\text{s}$):

$$v_{front} \approx 0.14\text{ meters/day (14 cm/day)}$$

The AAHAR 3D Digital Twin uses this analytical solution to project the spoilage boundary across a 7-day predictive window:

$$x_{front}(t) = x_{front}(0) + v_{front} \cdot t$$

---

### 3.3 ISFET Solid-State pH Sensing Theory

Conventional glass-bulb pH electrodes foul quickly and break in dense fibrous silage. The AAHAR probe lance utilizes an Ion-Sensitive Field-Effect Transistor (ISFET) with an aluminum oxide ($Al_2O_3$) gate dielectric.

Proton exchange at the dielectric surface is governed by the Site-Binding Model. Surface hydroxyl groups ($Al-OH$) undergo reversible protonation/deprotonation:

$$Al-OH_2^+ \rightleftharpoons Al-OH + H_s^+, \quad Al-OH \rightleftharpoons Al-O^- + H_s^+$$

The resulting gate insulator potential drop $\psi_0$ follows the Nernstian relation modified by buffer capacity parameter $\beta$:

$$\Delta V_{th} = 2.303 \frac{k_B T}{q} \alpha \left(\text{pH}_{pzc} - \text{pH}\right)$$

Where:
- $\alpha = \frac{\beta}{\beta + 1}$: Sensitivity parameter ($0.85 \le \alpha \le 0.95$ for $Al_2O_3$).
- $\text{pH}_{pzc}$: Point of zero charge ($\approx 8.0$ for $Al_2O_3$).
- $\frac{k_B T}{q}$: Thermal voltage ($25.69\text{ mV}$ at $25^\circ\text{C}$).

The sensor achieves a response slope of **$54.2\text{ mV/pH unit}$** with high chemical stability in aggressive organic silage acids.

---

## 4. Bovine Nutrition and Energy Metric Derivations

Raw chemical fractions measured via NIR are converted into actionable dairy ration metrics following the **NRC 2001 (National Research Council) Dairy Cattle Nutrition Model**.

```
+-----------------------------------------------------------------------------------+
|                        PROXIMATE NIR COMPONENT FRACTIONS                          |
|  - Crude Protein (CP)               - Neutral Detergent Fiber (NDF)               |
|  - Crude Fat / Ether Extract (EE)   - Acid Detergent Fiber (ADF)                  |
|  - Moisture / Dry Matter (DM)       - Acid Insoluble Ash (AIA)                    |
+-----------------------------------------------------------------------------------+
                                         |
                                         v
+-----------------------------------------------------------------------------------+
|                    TOTAL DIGESTIBLE NUTRIENTS (TDN_1X)                           |
|  TDN_1X = tdCP + (tdFA * 2.25) + tdNDF + tdNFC - 7                                |
+-----------------------------------------------------------------------------------+
                     |                                         |
                     v                                         v
+-----------------------------------------+ +-----------------------------------------+
|     METABOLIZABLE ENERGY (ME)           | |    NET ENERGY FOR LACTATION (NEL)       |
|  ME = TDN_1X * 0.04409 * 4.184 * 0.82   | |  NEL = (0.0245 * TDN_1X) - 0.12         |
|  Units: MJ / kg DM                      | |  Units: Mcal / kg DM                    |
+-----------------------------------------+ +-----------------------------------------+
```

### Mathematical Equations

#### 1. Non-Fiber Carbohydrates (NFC):
$$\text{NFC} (\%) = 100 - \left[\text{NDF}(\%) + \text{CP}(\%) + \text{Fat}(\%) + \text{Ash}(\%)\right]$$

#### 2. Truly Digestible Fractions:
- Truly Digestible Crude Protein: $\text{tdCP} = \text{CP} \times \exp(-1.2 \times \text{ADIN}/\text{CP}) \approx 0.92 \times \text{CP}$
- Truly Digestible Fatty Acids: $\text{tdFA} = \text{Fat} - 1.0$ (if $\text{Fat} > 1.0$, else $0$)
- Truly Digestible NDF: $\text{tdNDF} = 0.75 \times (\text{NDF} - \text{Lignin}) \times \left[1 - \left(\frac{\text{Lignin}}{\text{NDF}}\right)^{0.667}\right]$
- Truly Digestible NFC: $\text{tdNFC} = 0.98 \times \text{NFC}$

#### 3. Total Digestible Nutrients at Maintenance ($TDN_{1X}$):
$$\text{TDN}_{1X} (\%) = \text{tdCP} + \left(2.25 \times \text{tdFA}\right) + \text{tdNDF} + \text{tdNFC} - 7$$

#### 4. Net Energy for Lactation ($NEL_{3X}$) at $3\times$ Maintenance Intake:
$$\text{NEL}_{3X}\ (\text{Mcal/kg DM}) = 0.0245 \times \text{TDN}_{1X}(\%) - 0.12$$

$$\text{NEL}_{3X}\ (\text{MJ/kg DM}) = \text{NEL}_{3X}\ (\text{Mcal/kg DM}) \times 4.184$$

#### 5. Metabolizable Energy (ME):
$$\text{ME}\ (\text{MJ/kg DM}) = 0.04409 \times \text{TDN}_{1X}(\%) \times 4.184 \times 0.82$$

---

## 5. Cryptography, Consignment QR, and Distributed Sync

To ensure integrity across rural supply chains, every test record and transfer of custody is signed cryptographically at the source.

---

### 5.1 Ed25519 Asymmetric Digital Signatures

Signatures use the Ed25519 scheme (RFC 8032) over the twisted Edwards curve:

$$-x^2 + y^2 = 1 - \frac{121665}{121666} x^2 y^2$$

Defined over the prime finite field $\mathbb{F}_{2^{255}-19}$.

- **Private Key**: 32-byte cryptographic random seed $k \in \{0, 1\}^{256}$.
- **Public Key**: Compressed Edwards point $\mathbf{A} = s \mathbf{B} \in \mathbb{G}$, where $s = \text{clamp}(\text{SHA-512}(k)[0..31])$ and $\mathbf{B}$ is the base generator.
- **Signature**: Tuple $(\mathbf{R}, S)$ of 64 bytes total.
  $$r = \text{SHA-512}(\text{SHA-512}(k)[32..63] \parallel M) \pmod \ell$$
  $$\mathbf{R} = r \mathbf{B}$$
  $$S = r + \text{SHA-512}(\mathbf{R} \parallel \mathbf{A} \parallel M) \cdot s \pmod \ell$$
- **Verification**: Confirms point equation: $8 S \mathbf{B} = 8 \mathbf{R} + 8 \text{SHA-512}(\mathbf{R} \parallel \mathbf{A} \parallel M) \mathbf{A}$.

---

### 5.2 Canonical JSON (RFC 8785) Consignment QR Payload

To ensure byte-for-byte reproducibility across languages, payloads are serialized using **RFC 8785 (JSON Canonicalization Scheme - JCS)**:
1. Whitespace stripped.
2. Object keys sorted lexicographically by UTF-16 code units.
3. Numbers formatted with IEEE 754 double precision representation without scientific trailing zeros.
4. UTF-8 encoded.

```json
{
  "alg": "Ed25519",
  "batch": "COT-404-MH",
  "dm_pct": 89.2,
  "exp": "2026-10-31",
  "iss": "INSP-AAHAR-4402",
  "lot_kg": 15000,
  "nfc_pct": 28.4,
  "prot_pct": 21.4,
  "sig": "3a8f9c2d1e0b...[64 bytes hex]...",
  "sup_id": "SUP-7720",
  "ts": 1789740000,
  "urea_pct": 0.0
}
```

---

### 5.3 Distributed Lamport Clock and Conflict-Free Replication

Field inspectors record scans offline in village locations. When multiple devices synchronize concurrently with the cloud backend, write conflicts are resolved using Lamport logical clocks with deterministic node tie-breaking.

Each event $e$ is tagged with tuple:

$$\tau(e) = \langle L(e), \text{node\_id}, \text{entity\_uuid} \rangle$$

#### Update Rule:
Upon generating local event $e$:
$$L(e) \leftarrow L_{local} + 1$$

Upon receiving remote event with timestamp $L_{msg}$:
$$L_{local} \leftarrow \max(L_{local}, L_{msg}) + 1$$

#### Conflict Resolution (Last-Write-Wins with Deterministic Tie-Breaking):
For concurrent updates $e_1$ and $e_2$ targeting the same entity record:
1. If $L(e_1) > L(e_2)$, $e_1$ prevails.
2. If $L(e_1) < L(e_2)$, $e_2$ prevails.
3. If $L(e_1) == L(e_2)$, compare cryptographic node IDs lexicographically:
   $$\text{If } \text{node\_id}_1 > \text{node\_id}_2 \implies e_1 \text{ prevails, else } e_2$$

This guarantees strict eventual consistency across all distributed database replicas without centralized coordination.

---

## 6. Comprehensive PostgreSQL and TimescaleDB Schema

The cloud database runs PostgreSQL 16 with the TimescaleDB extension for time-series hypertables.

```sql
-- 1. Enable TimescaleDB and PostGIS extensions
CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE;
CREATE EXTENSION IF NOT EXISTS postgis CASCADE;

-- 2. Suppliers Registry
CREATE TABLE IF NOT EXISTS suppliers (
    supplier_id VARCHAR(32) PRIMARY KEY,
    name VARCHAR(128) NOT NULL,
    state VARCHAR(64) NOT NULL,
    district VARCHAR(64) NOT NULL,
    contact_phone VARCHAR(16),
    rating NUMERIC(3, 2) DEFAULT 3.00 CHECK (rating >= 0.00 AND rating <= 5.00),
    tier VARCHAR(2) NOT NULL DEFAULT 'B' CHECK (tier IN ('A', 'B', 'C')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Shipments / Consignments
CREATE TABLE IF NOT EXISTS shipments (
    shipment_id VARCHAR(32) PRIMARY KEY,
    supplier_id VARCHAR(32) NOT NULL REFERENCES suppliers(supplier_id) ON DELETE RESTRICT,
    commodity VARCHAR(64) NOT NULL,
    batch_number VARCHAR(64) NOT NULL,
    quantity_kg NUMERIC(10, 2) NOT NULL CHECK (quantity_kg > 0),
    status VARCHAR(32) NOT NULL DEFAULT 'IN_TRANSIT',
    source_lat NUMERIC(9, 6),
    source_lon NUMERIC(9, 6),
    dest_lat NUMERIC(9, 6),
    dest_lon NUMERIC(9, 6),
    current_lat NUMERIC(9, 6),
    current_lon NUMERIC(9, 6),
    ed25519_signature TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Handheld Spectrometer Scans
CREATE TABLE IF NOT EXISTS scans (
    scan_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shipment_id VARCHAR(32) REFERENCES shipments(shipment_id) ON DELETE SET NULL,
    inspector_id VARCHAR(64) NOT NULL,
    device_id VARCHAR(64) NOT NULL,
    lamport_clock BIGINT NOT NULL,
    crude_protein_pct NUMERIC(5, 2) NOT NULL,
    moisture_pct NUMERIC(5, 2) NOT NULL,
    ndf_pct NUMERIC(5, 2) NOT NULL,
    adf_pct NUMERIC(5, 2) NOT NULL,
    urea_pct NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
    silica_ash_pct NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
    mahalanobis_dist NUMERIC(8, 4) NOT NULL,
    is_adulterated BOOLEAN NOT NULL DEFAULT FALSE,
    adulteration_reason TEXT,
    spectral_raw_json JSONB,
    scanned_at TIMESTAMPTZ NOT NULL,
    synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Silage Bunkers
CREATE TABLE IF NOT EXISTS bunkers (
    bunker_id VARCHAR(32) PRIMARY KEY,
    farm_id VARCHAR(64) NOT NULL,
    name VARCHAR(128) NOT NULL,
    bunker_type VARCHAR(32) NOT NULL CHECK (bunker_type IN ('TRENCH', 'BUNKER', 'DRIVE_OVER_PILE', 'BALE')),
    capacity_tonnes NUMERIC(8, 2) NOT NULL,
    length_meters NUMERIC(5, 2) NOT NULL,
    width_meters NUMERIC(5, 2) NOT NULL,
    height_meters NUMERIC(5, 2) NOT NULL,
    cover_material VARCHAR(64) DEFAULT 'POLYETHYLENE_OXYGEN_BARRIER',
    ensiling_date DATE NOT NULL,
    active_spoilage_front_depth_m NUMERIC(4, 2) DEFAULT 0.00,
    status VARCHAR(32) NOT NULL DEFAULT 'HEALTHY'
);

-- 6. Probe Telemetry (TimescaleDB Hypertable)
CREATE TABLE IF NOT EXISTS probe_telemetry (
    time TIMESTAMPTZ NOT NULL,
    probe_id VARCHAR(64) NOT NULL,
    bunker_id VARCHAR(32) NOT NULL REFERENCES bunkers(bunker_id) ON DELETE CASCADE,
    battery_millivolts INTEGER NOT NULL,
    ambient_temp_c NUMERIC(5, 2) NOT NULL,
    temp_depth_0_3m NUMERIC(5, 2) NOT NULL,
    temp_depth_0_8m NUMERIC(5, 2) NOT NULL,
    temp_depth_1_4m NUMERIC(5, 2) NOT NULL,
    temp_depth_2_1m NUMERIC(5, 2) NOT NULL,
    ph_isfet NUMERIC(4, 2) NOT NULL,
    co2_ppm INTEGER,
    voc_ppb INTEGER,
    lamport_clock BIGINT NOT NULL
);

-- Convert to TimescaleDB Hypertable partitioned by 7-day intervals
SELECT create_hypertable('probe_telemetry', 'time', chunk_time_interval => INTERVAL '7 days', if_not_exists => TRUE);

-- Add compression policy for data older than 14 days
ALTER TABLE probe_telemetry SET (
    timescaledb.compress,
    timescaledb.compress_segmentby = 'probe_id, bunker_id',
    timescaledb.compress_orderby = 'time DESC'
);
SELECT add_compression_policy('probe_telemetry', INTERVAL '14 days', if_not_exists => TRUE);

-- 7. Automated System Alerts Console
CREATE TABLE IF NOT EXISTS alerts (
    alert_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type VARCHAR(32) NOT NULL CHECK (entity_type IN ('BUNKER', 'SHIPMENT', 'MODEL', 'DEVICE')),
    entity_id VARCHAR(64) NOT NULL,
    severity VARCHAR(16) NOT NULL CHECK (severity IN ('CRITICAL', 'WARNING', 'INFO')),
    category VARCHAR(64) NOT NULL,
    title VARCHAR(256) NOT NULL,
    details TEXT,
    acknowledged BOOLEAN NOT NULL DEFAULT FALSE,
    acknowledged_by VARCHAR(64),
    acknowledged_at TIMESTAMPTZ,
    sla_expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. Immutable Regulatory Audit Log
CREATE TABLE IF NOT EXISTS audit_logs (
    log_id BIGSERIAL PRIMARY KEY,
    actor_id VARCHAR(64) NOT NULL,
    action VARCHAR(64) NOT NULL,
    resource_type VARCHAR(64) NOT NULL,
    resource_id VARCHAR(64) NOT NULL,
    ip_address INET,
    user_agent TEXT,
    prev_state JSONB,
    new_state JSONB,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

## 7. Embedded Hardware Topography and Pinouts

### 7.1 Handheld NIR Spectrometer (ESP32-S3-WROOM-1-N16R8)

```
+-------------------------------------------------------------------------------+
|                       ESP32-S3 SPECTROMETER PIN ASSIGNMENT                    |
|                                                                               |
|   Pin       Function            Peripheral Bus   Signal Description           |
|   -------------------------------------------------------------------------   |
|   GPIO 4    I2C_SDA             I2C Bus 0        INA219 Current Monitor       |
|   GPIO 5    I2C_SCL             I2C Bus 0        SHT40 Temp/Humidity Sensor   |
|   GPIO 10   SPI_CS_DETECTOR     FSPI             InGaAs ADC Chip Select       |
|   GPIO 11   SPI_MOSI            FSPI             InGaAs Register Config       |
|   GPIO 12   SPI_MISO            FSPI             InGaAs 14-Bit Pixel Data     |
|   GPIO 13   SPI_SCK             FSPI             FSPI Clock (20 MHz)          |
|   GPIO 14   DETECTOR_CLK        LEDC Channel 0   Pixel Shift Clock (2 MHz)    |
|   GPIO 15   DETECTOR_START      GPIO Output      Integrator Start Pulse       |
|   GPIO 16   LAMP_ENABLE         LEDC Channel 1   Halogen Constant Current PWM |
|   GPIO 17   BATTERY_ADC         ADC1 Channel 6   Li-ion Voltage Divider       |
|   GPIO 21   OLED_RESET          GPIO Output      0.96-inch Status Display     |
|   GPIO 47   TRIGGER_BUTTON      GPIO Input (Pull) Scan Trigger Pushbutton     |
|   GPIO 48   STATUS_LED_RGB      WS2812B          Inspection Pass/Fail LED     |
+-------------------------------------------------------------------------------+
```

#### Battery Life Calculation (Handheld Scanner):
- Battery: 2-cell Parallel 18650 Li-ion ($3.7\text{ V}$, $6800\text{ mAh} = 25.16\text{ Wh}$).
- Quiescent Standby Power: $120\text{ mW}$ ($32.4\text{ mA}$).
- Active Scan Cycle (Halogen warm-up 1.2s + Integration 0.3s + BLE transmission 0.5s = 2.0s total):
  - Tungsten Lamp ($2.5\text{ W}$): $5.0\text{ J}$
  - InGaAs Sensor + ADC ($0.35\text{ W}$): $0.7\text{ J}$
  - ESP32-S3 Active RF ($0.8\text{ W}$): $1.6\text{ J}$
  - Total Energy per Scan: $E_{scan} \approx 7.3\text{ Joules} = 0.00203\text{ Wh}$.
- Theoretical Scans per Charge:
  $$N_{scans} = \frac{25.16\text{ Wh} \times 0.85\text{ (DOD)}}{0.00203\text{ Wh}} \approx \mathbf{379\text{ Completed Scans}}$$

---

### 7.2 Autonomous Silage IoT Probe Lance (ESP32-C6-WROOM-1-N4)

```
+-------------------------------------------------------------------------------+
|                        ESP32-C6 PROBE LANCE PIN ASSIGNMENT                    |
|                                                                               |
|   Pin       Function            Peripheral Bus   Signal Description           |
|   -------------------------------------------------------------------------   |
|   GPIO 0    ONE_WIRE_BUS        1-Wire           4x DS18B20 Temp Array        |
|   GPIO 1    ISFET_VREF_ADC      ADC1 Channel 0   ISFET Reference Potential    |
|   GPIO 2    ISFET_DRAIN_ADC     ADC1 Channel 1   ISFET Drain Current Sense    |
|   GPIO 6    I2C_SDA_LP          LP_I2C Bus       SCD41 NDIR CO2 Sensor        |
|   GPIO 7    I2C_SCL_LP          LP_I2C Bus       SCD41 NDIR CO2 Sensor        |
|   GPIO 9    BOOT_BUTTON         GPIO Input       Manual Diagnostics Mode      |
|   GPIO 14   SENSOR_PWR_EN       GPIO Output      Load Switch Gate (TPS22916)  |
|   GPIO 15   BATTERY_DIV_ADC     ADC1 Channel 4   LiSOCl2 Voltage Sense        |
|   GPIO 18   LP_TIMER_WAKE       RTC / PMU        Periodic 30-min Wake-up      |
+-------------------------------------------------------------------------------+
```

#### Battery Life Calculation (Silage Probe Lance):
- Battery: Single Industrial Lithium Thionyl Chloride ($\text{LiSOCl}_2$) D-Cell ($3.6\text{ V}$, $19000\text{ mAh}$ derated to $5000\text{ mAh}$ effective continuous drain).
- Deep Sleep Phase ($29\text{ minutes } 52\text{ seconds}$):
  - ESP32-C6 RTC Timer Sleep Current: $7.2\ \mu\text{A}$
  - Sensor Rail Disconnected via TPS22916 load switch leakage: $0.05\ \mu\text{A}$
  - Quiescent Current $I_{sleep} = 7.25\ \mu\text{A}$.
- Active Measurement & Transmit Phase ($8.0\text{ seconds}$ every 30 minutes):
  - DS18B20 12-bit thermal conversion (4 sensors): $750\text{ ms} \times 1.5\text{ mA} = 1.125\text{ mA}\cdot\text{s}$
  - ISFET pH stabilization & read: $1.2\text{ s} \times 3.0\text{ mA} = 3.6\text{ mA}\cdot\text{s}$
  - SCD41 NDIR single-shot read: $2.5\text{ s} \times 18\text{ mA} = 45.0\text{ mA}\cdot\text{s}$
  - ESP32-C6 BLE 5.0 advertisement burst: $2.0\text{ s} \times 65\text{ mA} = 130.0\text{ mA}\cdot\text{s}$
  - Total charge per 30-min cycle: $Q_{cycle} = (7.25\ \mu\text{A} \times 1792\text{ s}) + 179.7\text{ mA}\cdot\text{s} \approx 192.7\text{ mA}\cdot\text{s}$.
- Hourly Average Current:
  $$I_{avg} = \frac{2 \times 192.7\text{ mA}\cdot\text{s}}{3600\text{ s}} = 0.107\text{ mA} = 107\ \mu\text{A}$$
- Operational Battery Endurance:
  $$\text{Lifetime} = \frac{5000\text{ mAh} \times 0.80\text{ (Self-discharge safety)}}{0.107\text{ mA} \times 24 \times 365.25 / 12} = \mathbf{34.7\text{ Months (2.89 Years)}}$$
