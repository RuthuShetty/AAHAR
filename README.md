# AAHAR: AI-Assisted Health and Analysis of Ration

### Enterprise Smart NIR Feed Quality and Silage Spoilage Monitoring System for Dairy Cooperatives

---

## 1. Executive Summary

In India's dairy heartlands, animal nutrition and cattle feed account for **65% to 75% of total milk production operational expenditure**. Dairy cooperative unions, Farmer Producer Organizations (FPOs), and smallholder farmers operate under severe information asymmetry and biological vulnerabilities:

1. **Feed Adulteration**: Commercial concentrate cakes (cottonseed cake, mustard cake, compound cattle feed) are systematically adulterated with non-protein nitrogen (Urea) to artificially inflate crude protein scores during basic nitrogen testing. Feedstocks are also spiked with silica sand, marble dust, and industrial starch to add bulk weight. Ingesting urea-adulterated feed causes acute bovine rumen acidosis, systemic reproductive failure, and toxic chemical residue in raw milk.
2. **Hidden Silage Aerobic Spoilage**: Silage pits, trench bunkers, and wrapped bales frequently suffer from undetected aerobic deterioration triggered by microscopic plastic tears, poor compaction density, or face exposure. By the time fungal colonies and surface moulds become visible to the human eye, up to 30% of digestible dry matter and metabolizable energy has perished, accompanied by lethal mycotoxins (Aflatoxin B1, Ochratoxin A).
3. **Laboratory Latency and Testing Cost**: Traditional wet-chemistry testing (Kjeldahl digestion, Soxhlet extraction, Van Soest fiber fractionation) takes 7 to 14 days and costs between INR 1,500 and INR 3,500 per sample. This latency makes real-time acceptance or rejection of truckloads impossible at cooperative intake gates.

**AAHAR** (*AI-Assisted Health and Analysis of Ration*) resolves this crisis with an integrated, end-to-end agritech platform:
- **Rugged Handheld NIR Spectrometer** (ESP32-S3) delivering non-destructive feed analysis in under 90 seconds.
- **Autonomous Multi-Depth Silage IoT Probe Lance** (ESP32-C6) monitoring internal thermal gradients, ISFET pH, and gaseous respiration for up to 3 years on a single battery cell.
- **Edge-Inferencing Mobile Application** (React Native / Expo) operating 100% offline with on-device chemometrics and voice guidance in 8 Indian regional languages.
- **Cloud Backend and TimescaleDB Engine** (FastAPI) handling telemetry ingestion, dispute arbitration, and Lamport-clock synchronized offline data reconciliation.
- **Enterprise Web Intelligence Dashboard** (React 18, React Router v7) featuring real-time fleet GPS tracking, 3D silage bunker digital twin visualization, batch QR verification, supplier scorecards, and model health diagnostics.

---

## 2. System Architecture

The AAHAR platform follows a modular, zero-drift distributed architecture. Single-source-of-truth JSON Schemas automatically compile into TypeScript (Mobile and Dashboard), Python Pydantic (Cloud), and C++ structs (Embedded Firmware).

```
                      +-------------------------------------------------------+
                      |                 FIELD DEPLOYMENT                      |
                      |                                                       |
                      |   +--------------------+     +--------------------+   |
                      |   |  Handheld Scanner  |     |  Silage IoT Probe  |   |
                      |   |    (ESP32-S3)      |     |    (ESP32-C6)      |   |
                      |   |  900 - 1700 nm NIR |     |  4-Depth Temp + pH |   |
                      |   +---------+----------+     +---------+----------+   |
                      +-------------|--------------------------|--------------+
                                    | BLE 5.0 (GAP/GATT)       | BLE / Wi-Fi
                                    v                          v
                      +-------------------------------------------------------+
                      |         MOBILE AGRITECH APPLICATION (EXPO)            |
                      |   - On-Device Preprocessing (SNV + Savitzky-Golay)    |
                      |   - Edge Chemometrics (PLS-R Regression + OOD Filter) |
                      |   - Offline Storage & CRDT Mutation Queue             |
                      |   - Multilingual Engine (8 Indian Regional Languages) |
                      +-----------------------------+-------------------------+
                                                    | HTTPS / WSS / REST API
                                                    v
                      +-------------------------------------------------------+
                      |               CLOUD CORE BACKEND (FASTAPI)            |
                      |   - TimescaleDB Telemetry Hypertables                 |
                      |   - Lamport Clock Sync & Conflict Resolution          |
                      |   - Asynchronous Alert Dispatch & WebSockets          |
                      |   - Canonical Ed25519 Signature Verification          |
                      +-----------------------------+-------------------------+
                                                    |
                         +--------------------------+-------------------------+
                         |                                                    |
                         v                                                    v
+--------------------------------------------------+ +--------------------------------------------------+
|      ENTERPRISE WEB DASHBOARD (REACT 18)         | |              EXTERNAL INTEGRATIONS               |
|  - Fleet & Consignment Tracking Center           | |  - Cooperative ERP / Milk Chilling Logistics     |
|  - Batch Traceability & Dispute Desk             | |  - SMS / WhatsApp Gateway Alert Notifications    |
|  - 3D Silage Bunker Digital Twin Visualizer      | |  - Government Compliance (FSSAI / BIS / DPDP)    |
|  - Supplier Quality Scorecards & Leaderboards    | |  - District Wet-Chemistry Reference Labs         |
|  - NIR Model Drift & Calibration Console         | +--------------------------------------------------+
|  - Field Inspector Profile & Security Tokens     |
|  - Platform Settings & Real-Time Health Probes   |
+--------------------------------------------------+
```

---

## 3. Monorepo Directory Structure

```
Ruthu/
|-- aahar-hardened/
|   `-- aahar/
|       |-- .benchmarks/              # Chemometric performance benchmarks & run logs
|       |-- cloud/                    # Cloud Core API (FastAPI, TimescaleDB, Alembic)
|       |   |-- app/
|       |   |   |-- api/              # Route endpoints (scans, telemetry, disputes, alerts)
|       |   |   |-- core/             # Configuration, security, database connectors
|       |   |   |-- models/           # SQLAlchemy ORM models & database schemas
|       |   |   |-- schemas/          # Pydantic validation schemas
|       |   |   |-- services/         # Business logic, Lamport sync, analytics
|       |   |   `-- main.py           # Application entrypoint & ASGI router
|       |   `-- tests/                # Pytest integration & unit test suites
|       |-- contracts/                # Canonical Zero-Drift Data Contracts
|       |   |-- codegen/              # Polyglot code generation scripts (TS, Py, C++)
|       |   |-- schemas/              # Single-source-of-truth JSON Schemas
|       |   `-- generated/            # Generated target source definitions
|       |-- dashboard/                # Enterprise Web Intelligence Dashboard (React 18 + Vite)
|       |   |-- src/
|       |   |   |-- components/       # UI modules, 3D Bunker Twin visualizer, charts
|       |   |   |-- pages/            # 9 dedicated view controllers with React Router v7
|       |   |   |-- services/         # API clients, real-time latency probes, telemetry
|       |   |   |-- types/            # TypeScript interfaces generated from contracts
|       |   |   |-- App.tsx           # Layout, header, sub-navigation, breadcrumbs
|       |   |   |-- index.css         # Enterprise white-theme design tokens & styling
|       |   |   `-- main.tsx          # Application bootloader
|       |   |-- package.json          # Frontend dependencies & build scripts
|       |   `-- vite.config.ts        # Vite build & proxy configuration
|       |-- docs/                     # Technical specifications, diagrams & whitepapers
|       |-- firmware-handheld/        # ESP32-S3 Handheld NIR Spectrometer Firmware
|       |   |-- include/              # Header definitions, C++ contract structs
|       |   |-- src/                  # FreeRTOS tasks, InGaAs driver, BLE GATT server
|       |   `-- platformio.ini        # Build flags, partition tables, ESP-IDF settings
|       |-- firmware-probe/           # ESP32-C6 Autonomous Silage Probe Lance Firmware
|       |   |-- include/              # Sensor pinouts, ISFET calibrations, power states
|       |   |-- src/                  # Deep-sleep timer, thermal gradient profiling
|       |   `-- platformio.ini        # ESP-IDF configuration for RISC-V core
|       |-- ml/                       # Chemometrics Machine Learning Pipeline
|       |   |-- algorithms/           # SNV, Savitzky-Golay, PLS-R, FastMCD OOD
|       |   |-- calibration/          # Reference wet-lab calibration routines
|       |   |-- data/                 # Spectral datasets and validation benchmarks
|       |   `-- models/               # Serialized chemometric calibration bundles
|       |-- mobile/                   # Offline-First Mobile Application (React Native / Expo)
|       |   |-- src/
|       |   |   |-- app/              # Screen navigation, scan flows, bunker views
|       |   |   |-- components/       # Mobile UI components, icons, audio player
|       |   |   |-- i18n/             # Regional translations (8 Indian languages)
|       |   |   |-- ml/               # Edge inference chemometric engine
|       |   |   `-- storage/          # Offline mutation journal & SQLite bridge
|       |   `-- package.json          # React Native dependencies
|       |-- docker-compose.yml        # Multi-container local deployment manifest
|       |-- package.json              # Monorepo root scripts & tooling
|       |-- start.bat                 # Automated Windows launcher & dependency installer
|       |-- README.md                 # Primary system manual & user guide
|       `-- EXTRA.md                  # In-depth technical, chemometric & scientific reference
|-- start.bat                         # Workspace root automated launcher
|-- README.md                         # Workspace root manual
`-- EXTRA.md                          # Workspace root technical reference
```

---

## 4. Web Intelligence Dashboard (React 18 + React Router v7)

The web dashboard is built to enterprise operations-center standards. It uses a high-contrast white theme, micro-typography (11px to 13px scale), Inter and JetBrains Mono fonts, and fluid transitions without visual clutter.

### Route Breakdown

#### 1. `/fleet` - Fleet and Consignment Tracking Center
- **Live Dispatch Map**: Real-time GPS coordinates, vehicle speed, heading, and transit routes across regional cooperative milk sheds.
- **In-Transit Telemetry**: Real-time ambient temperature and humidity tracking to verify cold-chain and dry-chain integrity.
- **Geofence Enforcement**: Automated check-in/check-out timestamping at collection centers, processing plants, and farm delivery points.

#### 2. `/traceability` - Batch Traceability and Dispute Desk
- **Deep-Linking Support**: Direct access via URL query parameters (for example, `/traceability?shipment=SHP-8821`).
- **Batch Verification**: Cryptographic validation of farmer and cooperative delivery batches.
- **Dispute Resolution Desk**: Side-by-side comparison between rapid NIR field scan results and NABL-accredited referee lab wet-chemistry reports.
- **Status Workflows**: Automated status transitions (`PENDING`, `IN_REVIEW`, `ARBITRATED`, `RESOLVED`) with full regulatory audit trails.

#### 3. `/bunker` - 3D Silage Bunker Digital Twin Visualizer
- **Interactive Multi-Angle View**: 3D perspective projection alongside top-down schematic view of trench and bunker silos.
- **Aerobic Spoilage Heatmap**: Visualizes advancing aerobic deterioration fronts based on multi-depth thermal sensor arrays (0.3m, 0.8m, 1.4m, 2.1m).
- **Time Slider Simulation**: Interactive Day 0 to Day 7 predictive timeline forecasting spoilage front advancement ($v_{front} = 0.14\text{ m/day}$).
- **Nutritional Dry Matter Loss**: Real-time calculation of recoverable dry matter and monetary loss projections.
- **Collision-Proof Layout**: Text headers and KPI metrics are rendered on dedicated visual shelves with zero overlay collisions.

#### 4. `/suppliers` - Supplier Quality Scorecards
- **Tier-Based Filtering**: Immediate filtering by quality tier (`/suppliers?tier=A`, `B`, or `C`).
- **Adulteration Interception Rate**: Historic tracking of detected urea and silica contamination instances per vendor.
- **Composite Quality Rating**: Multi-parameter rating combining crude protein consistency, dry matter variance, and delivery punctuality.
- **Financial Deduction Engine**: Calculates automated penalty deductions based on quality shortfall policies.

#### 5. `/models` - NIR Chemometric Model Health
- **Calibration Health Monitoring**: Real-time tracking of coefficient of determination ($R^2$), Root Mean Square Error of Prediction (RMSEP), and bias.
- **Spectrometer Sensor Drift**: Continuous monitoring of InGaAs detector dark current and signal-to-noise ratio (SNR).
- **Out-of-Distribution (OOD) Metrics**: Histogram of Mahalanobis distances ($D_M$) to identify atypical feedstocks requiring wet-lab recalibration.
- **Live Latency Probe**: Sub-millisecond ping monitoring connected to the cloud core endpoint.

#### 6. `/alerts` - Real-Time Alert Console
- **Severity-Level Filtering**: Deep-linking for critical incidents (`/alerts?severity=CRITICAL`).
- **SLA Countdown Timer**: Live countdown clocks tracking remaining time before unacknowledged critical anomalies escalate to senior management.
- **Automated Dispatch**: Instant push triggers to SMS, WhatsApp, and field veterinarian dispatch systems.

#### 7. `/profile` - Field Inspector Profile and Hardware Tokens
- **Cryptographic Key Management**: Hardware-bound Ed25519 public key display and CSPRNG device token authentication.
- **Field Inspector Credentials**: Certified operator ID, assigned dairy federation division, and security clearance level.
- **Active Hardware Scanners**: Paired handheld spectrometers and IoT probes with battery health and calibration expiry dates.
- **Security Audit Trail**: Real-time log of security events, token rotations, and certified inspection submissions.

#### 8. `/settings` - Enterprise Platform Diagnostics
- **Real-Time Backend Latency Probe**: Live ping to `http://127.0.0.1:8000/health` with sub-millisecond response time display.
- **Data Synchronization Controls**: Manual force-sync trigger and conflict resolution rule configuration.
- **Database Health**: Active TimescaleDB connection pools, table partition status, and disk utilization.
- **Audit Log Retention Policy**: Configurable retention thresholds compliant with the Digital Personal Data Protection (DPDP) Act 2023.

#### 9. `*` - Not Found Fallback
- **Context-Aware Error Resolution**: Clean 404 page providing one-click recovery paths back to core operational modules.

---

## 5. Mobile Agritech Application (Expo React Native)

The mobile client is engineered for remote rural environments with zero cellular connectivity:

- **Offline-First Synchronization**: All scan records, sensor telemetry, and farmer transactions are journaled locally with Lamport timestamps. Transactions sync automatically upon reconnecting to 2G/3G/4G or Wi-Fi.
- **Edge Chemometrics Engine**: Runs full spectral pre-processing (Standard Normal Variate + Savitzky-Golay 1st derivative) and PLS-R matrix multiplication on-device in under 80 milliseconds.
- **Out-of-Distribution (OOD) Guard**: Calculates sample Mahalanobis distance against the training centroid. If $D_M > 12.5$, the app warns the user that the sample is atypical and prevents unreliable predictions.
- **8 Indian Regional Languages**: Comprehensive native translations for:
  - English
  - Hindi (हिन्दी)
  - Marathi (मराठी)
  - Gujarati (ગુજરાતી)
  - Punjabi (ਪੰਜਾਬੀ)
  - Telugu (తెలుగు)
  - Tamil (தமிழ்)
  - Kannada (ಕನ್ನಡ)
- **Voice Guidance**: Audio advisories guide operators through sample loading, reference white-tile calibration, and scan execution.

---

## 6. Cloud Core and TimescaleDB Infrastructure

The cloud backend is built on FastAPI and TimescaleDB for time-series scalability:

- **FastAPI Core**: Asynchronous ASGI server providing RESTful endpoints, OpenAPI/Swagger interactive documentation (`/docs`), and WebSocket telemetry streams.
- **TimescaleDB Telemetry Hypertables**: Partitioned time-series storage for high-frequency silage probe data, tracking temperature, pH, and VOCs over months with automatic data compression.
- **Lamport Clock Synchronization**: Resolves distributed offline edits using logical clocks and deterministic UUID tie-breaking, ensuring zero data loss during multi-device synchronization.
- **Cryptographic Traceability**: Generates and verifies Ed25519 digital signatures for consignment QR codes, ensuring complete tamper evidence across supply chain custody handoffs.

---

## 7. Hardware and Embedded Systems

### Handheld NIR Spectrometer (ESP32-S3)
- **Spectral Engine**: 256-pixel InGaAs linear photodiode array covering 900 nm to 1700 nm with 6.0 nm FWHM optical resolution.
- **Illumination**: Dual tungsten-halogen micro-lamps with regulated constant-current driver and gold-plated integrating reflection chamber.
- **Microcontroller**: ESP32-S3 dual-core Xtensa LX7 running at 240 MHz with 8MB PSRAM and 16MB Flash.
- **Power Management**: 6,800 mAh Li-ion battery pack with USB-C PD fast charging. Provides **379 completed scans per full charge** against a requirement of $\ge 60$.
- **BOM Economics**: Targeted Bill of Materials cost of **INR 11,145** at 1,000-unit manufacturing volume.

### Autonomous Silage IoT Probe Lance (ESP32-C6)
- **Multi-Depth Lance**: 2.2-meter stainless steel lance with 4 isolated temperature sensors spaced at 0.3m, 0.8m, 1.4m, and 2.1m.
- **Solid-State pH**: ISFET (Ion-Sensitive Field-Effect Transistor) solid-state pH sensor resistant to aggressive lactic and acetic acids in silage leachate.
- **Microcontroller**: ESP32-C6 32-bit RISC-V core supporting Wi-Fi 6, Bluetooth 5 (LE), and Zigbee/Thread (802.15.4).
- **Ultra-Low Power**: Deep-sleep current of $7.2\ \mu\text{A}$. Operates on a single 5,000 mAh $\text{LiSOCl}_2$ cell for **34.7 months of continuous operation** with 30-minute wake-and-transmit cycles.
- **BOM Economics**: Targeted Bill of Materials cost of **INR 3,150** at 1,000-unit manufacturing volume.

---

## 8. Installation and Quick Start

### Quick Start via Automated Launcher (`start.bat`)

The fastest way to install dependencies and run the entire platform on Windows:

1. Double-click **`start.bat`** in the repository root (or run `.\start.bat` in Command Prompt / PowerShell).
2. The script will automatically:
   - Verify Python 3.10+ installation.
   - Verify Node.js 18+ and npm installation.
   - Install missing Python packages (`uvicorn`, `fastapi`, `pydantic`, `sqlalchemy`, `httpx`).
   - Install missing web dashboard dependencies (`npm install`).
   - Validate contracts codegen.
   - Launch the Cloud Core API on `http://127.0.0.1:8000`.
   - Launch the Web Intelligence Dashboard on `http://localhost:5173`.
   - Open your default web browser to the dashboard automatically.

---

### Manual Step-by-Step Setup

If you prefer to configure and run services manually:

#### 1. Prerequisites
- **Python**: Version 3.10 or higher (`python --version`)
- **Node.js**: Version 18.0.0 LTS or higher (`node --version`)
- **npm**: Version 9.0.0 or higher (`npm --version`)

#### 2. Install Backend Dependencies
```bash
# Navigate to repository root
cd d:\Ruthu\aahar-hardened\aahar

# Install Python dependencies
python -m pip install uvicorn fastapi pydantic pydantic-settings sqlalchemy httpx
```

#### 3. Install Web Dashboard Dependencies
```bash
cd dashboard
npm install
cd ..
```

#### 4. Run Contracts Code Generation
```bash
node contracts/codegen/gen_ts.mjs
```

#### 5. Start Cloud Core API
```bash
# In Terminal 1:
python -m uvicorn cloud.app.main:app --host 127.0.0.1 --port 8000 --reload
```
- API Root: `http://127.0.0.1:8000`
- Interactive Swagger UI: `http://127.0.0.1:8000/docs`
- Health Probe: `http://127.0.0.1:8000/health`

#### 6. Start Web Intelligence Dashboard
```bash
# In Terminal 2:
cd dashboard
npm run dev
```
- Web Application: `http://localhost:5173`

---

## 9. Verification and Test Suite

To verify system integrity across all layers:

### Python Backend Unit and Integration Tests
```bash
pytest cloud/tests -v
```

### Chemometrics ML Pipeline Tests
```bash
pytest ml/tests -v
```

### Web Dashboard Build and Bundle Validation
```bash
cd dashboard
npm run build
```
*(Builds clean production assets with zero lint or type errors in ~1.5s).*

### Mobile Test Suite
```bash
cd mobile
npm test
```

---

## 10. Standards and Regulatory Compliance

- **BIS IS 2052:2009**: Compounded Cattle Feeds Specification for crude protein, crude fat, crude fiber, acid insoluble ash, and urea nitrogen limits.
- **FSSAI Food Safety and Standards (Animal Feed) Regulations**: Adulteration limits and toxic contaminant surveillance.
- **Digital Personal Data Protection (DPDP) Act 2023**: Secure cryptographic key management, farmer consent logging, and field inspector credential governance.
- **ISO 12099:2017**: Animal feeding stuffs, cereals and milled cereal products — Guidelines for the application of near infrared spectrometry.

---

## 11. Technical Deep-Dive Documentation

For detailed mathematical derivations, optical ray matrices, chemometric algorithms, biophysical differential equations, cryptographic specifications, and database DDL schemas, refer to:

- **[`EXTRA.md`](file:///d:/Ruthu/aahar-hardened/aahar/EXTRA.md)**: Exhaustive Technical, Chemometric, Biophysical and Cryptographic Reference Manual.
