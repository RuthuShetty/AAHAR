# AAHAR 8-Minute Master Live Demonstration Script
**Target Duration:** 8 minutes 00 seconds  
**Presenters:** Technical Lead / Founder + Co-presenter (Farmer / Field Operator Role)  
**Required Demo Gear:**
1. Physical AAHAR Handheld NIR Scanner (or 3D digital twin device mirror).
2. Mobile phone running AAHAR Expo app (pre-loaded with local offline SQLite database).
3. Sample tray: 1 clean maize silage sample, 1 bag of cottonseed cake adulterated with 2% urea, sample scoop.
4. Large screen mirror displaying phone and Web Dashboard simultaneously.

---

## Timed Script & Action Choreography

### 0:00 – 0:45 | Beat 1: The Problem (The Hidden Thief in the Manger)
- **Speaker:** "Good morning. In India, feed represents over 70% of a dairy farmer's cost of milk production. Last month in Anand district, a farmer named Ramesh Patel paid ₹ 2,400 a quintal for cottonseed cake. His cows' milk yield crashed by 3 liters a day. Why? Because that feed was secretly spiked with 6% synthetic urea and 8% silica sand. To a visual inspection, it looks identical. To chemical testing, it takes 10 days and ₹ 1,500 at a distant lab. By then, the cows are sick and the money is gone. Today, we change that forever."
- **Visual:** Slide showing visual comparison of clean vs spiked cake, and annual profit loss per smallholder (₹ 42,000/year).

---

### 0:45 – 1:30 | Beat 2: The Physical Device & S1 Digital Twin
- **Speaker:** "This is AAHAR — the first rugged, AI-enabled handheld NIR spectrometer engineered for Indian dairy cooperatives at under ₹ 12,000."
- **Action:** Presenter holds up the handheld scanner. On the mirrored phone screen, the **S1 Device Twin** 3D model immediately springs to life, rotating smoothly in 60 FPS, mirroring the live battery (88%) and breathing green WS2812 LED status ring.
- **Key Message:** "Notice: the app connects in under 2 seconds over BLE 5.0. No pairing PIN, no complex configuration."

---

### 1:30 – 3:00 | Beat 3: The Live Test in Airplane Mode
- **Speaker:** "Now watch closely. I am placing this phone into **Airplane Mode** right now. Cellular OFF. Wi-Fi OFF. We are simulating a remote cattle shed with zero network bars."
- **Action:**
  1. Swipe down phone control center, tap Airplane Mode.
  2. Scoop feed into scanner sample cup, close chamber latch (Hall sensor clicks).
  3. Tap **"TEST FEED"** in the app.
  4. Handheld LED ring pulses in rotating emerald green.
  5. The phone displays the **S2 Optical Beam Simulation**: showing the 900–1700 nm spectral sweep penetrating the biomass sample in real time.
- **Key Message:** "In 90 seconds, the Hamamatsu C12880MA acquires 228 calibrated spectral bands across 3 repeat sweeps, with CRC-16 error checking."

---

### 3:00 – 3:45 | Beat 4: 3D Nutrient Volume & The Catch
- **Action:** App chiming sound plays. Progress bar completes.
- **Visual:** The **S3 Nutrient Volume** 3D scene renders:
  - Total Mixed Ration cylinder rotates under farmer's finger gesture.
  - Crude Protein fraction shows **20.8%** (Amber warning, declared 24.5%).
  - Moisture shows **8.2%**.
  - Suddenly, glowing red inclusion nodules pulse inside the matrix with warning indicator: **"UREA DETECTED (Prob 0.88 > 0.40 Threshold)"**.
- **Audio:** Offline Punjabi voice prompt plays automatically through phone speaker:
  > *"ਇਸ ਖੁਰਾਕ ਵਿੱਚ ਯੂਰੀਆ ਮਿਲਾਵਟ ਪਾਈ ਗਈ ਹੈ। ਪਸ਼ੂਆਂ ਨੂੰ ਨਾ ਦਿਓ। ਪ੍ਰੋਟੀਨ 'ਤੇ ₹ 71 ਪ੍ਰਤੀ ਕਿਲੋ ਦਾ ਨੁਕਸਾਨ ਹੈ।"*
- **Speaker:** "The app doesn't just show numbers. It translates chemometrics into economics: *'You overpaid ₹ 71 per kg of actual protein. This batch is cheated.'*"

---

### 3:45 – 4:30 | Beat 5: 3D Cow Herd Impact & Lab Referral
- **Speaker:** "What happens if a farmer feeds this anyway?"
- **Action:** Tap **"VIEW HERD IMPACT"**. The **S5 Anatomical Cow** 3D twin appears.
  - The cow's liver and rumen illuminate in pulsating high-contrast red.
  - Nutrient flow particles turn from tranquil blue to toxic crimson.
  - Tap on the glowing liver: advisory pops up: *"Rumen ammonia toxicity risk. Fatal to pregnant heifers. Do not feed."*
- **Action:** Tap one large green button: **"Refer Sample to NDDB Reference Lab"**. A pre-addressed dispatch barcode is generated instantly.

---

### 4:30 – 5:15 | Beat 6: The Silage Bunker Digital Twin & Spoilage Front
- **Speaker:** "Now let's look at ensiled forage. Silage spoils from aerobic degradation the moment oxygen enters the face."
- **Action:** Open Bunker tab. The **S4 Silage Bunker Digital Twin** renders:
  - $24\text{m} \times 7\text{m}$ trapezoidal bunker with concrete walls.
  - 4 IoT Probe Lances (ESP32-C6 nodes) with 4-depth thermistors visible inside the stack.
  - Presenter drags the **7-Day Timeline Scrubber** from Day 0 to Day 5.
  - The translucent crimson spoilage front advances from $1.80\text{m}$ to $3.42\text{m}$.
- **Speaker:** "The ML model calculates front velocity at 0.14 m/day. The advisory tells the farmer: *'Increase feedout rate to 2.5 tonnes/day to stay ahead of aerobic heating.'*"

---

### 5:15 – 6:15 | Beat 7: The Cloud Sync Moment
- **Speaker:** "Remember: everything so far was completely offline in SQLite. Now, the farmer walks into the milk collection center and reconnects to Wi-Fi."
- **Action:**
  1. Turn Airplane Mode OFF.
  2. Mobile sync icon flashes green: 2 records push in 120 ms using field-level Lamport clocks.
  3. Cut to large screen displaying the **AAHAR Web Dashboard**:
  4. Instantly, without refreshing, the new test appears in the Anand Union ledger!
  5. The **Alert Console** pops up a live WebSocket notification: *"CRITICAL: Urea Adulteration Detected in Mogri Village"*.

---

### 6:15 – 7:00 | Beat 8: Batch QR Traceability & Dispute Desk
- **Speaker:** "Here is how cooperatives protect their farmers from fraudulent mills."
- **Action:**
  1. Presenter clicks on **Batch Traceability**.
  2. Displays Feed Mill Batch `GAC-CSC-2026-09` registered by Godrej Agrovet with declared 24.5% CP and Ed25519 signature.
  3. The farmer's measured test (20.8% CP) is automatically compared.
  4. System flags **15.1% relative deficit** (exceeding 5.0% contract tolerance).
  5. One-click: **"File Formal Dispute with FPO Arbitrator"**.
  6. Dispute Case #D001 opens on screen with full evidence log, ready for credit settlement.

---

### 7:00 – 8:00 | Beat 9: Scientific Honesty & The Pilot Ask
- **Speaker:** "We do not believe in black-box marketing claims. We believe in open science."
- **Visual:** Display the **NABL Lab-Correlation Chart** (`docs/lab-correlation-report.md`):
  - 50 real farm scans across 3 pilot sites.
  - Real RMSEP: $\pm 0.42\%$ DM on protein, $\pm 0.68\%$ on moisture ($R^2 = 0.942$).
- **Speaker:** "We publish our honest error margins and model limitations. Today, AAHAR is 100% code-complete, passing 100% of our test suites across firmware, mobile, cloud, ML, and dashboard. We are seeking 3 forward-thinking dairy unions to deploy 50 handhelds and 200 silage probes for our 6-month field trial. Thank you."
