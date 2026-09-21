/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  AAHAR — AUTO-GENERATED FROM /contracts — DO NOT EDIT       ║
 * ║  Source: contracts/codegen/gen_ts.mjs                       ║
 * ║  To change types, edit the JSON Schema and re-run codegen.  ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 * Generated at: 2026-09-21T14:43:31.182Z
 * Schema version: see individual interface JSDoc
 */

/* eslint-disable */
// @ts-nocheck — This file is generated. Linting runs on the source schemas.

// ─── Enumerations ────────────────────────────────────────────────────────────

/** Standardised feed categories supported by the AAHAR NIR models. */
export type FeedType =
  | 'MAIZE_SILAGE'
  | 'WHEAT_STRAW'
  | 'COTTONSEED_CAKE'
  | 'MUSTARD_CAKE'
  | 'TMR'
  | 'GREEN_FODDER'
  | 'CONCENTRATE_MIX'
  | 'BERSEEM'
  | 'NAPIER'
  | 'SORGHUM_SILAGE'
  | 'GROUNDNUT_CAKE'
  | 'RICE_STRAW'
  | 'SOYBEAN_MEAL'
  | 'MAIZE_GRAIN'
  | 'OTHER';

export const FeedTypeMeta: Record<FeedType, {
  label_en: string;
  label_hi: string;
  label_pa: string;
  icon: string;
  model_group: string;
}> = {
  'MAIZE_SILAGE': {"label_en":"Maize Silage","label_hi":"मक्का साइलेज","label_pa":"ਮੱਕੀ ਸਾਈਲੇਜ","icon":"🌽","model_group":"silage"},
  'WHEAT_STRAW': {"label_en":"Wheat Straw","label_hi":"गेहूं का भूसा","label_pa":"ਕਣਕ ਦੀ ਤੂੜੀ","icon":"🌾","model_group":"roughage"},
  'COTTONSEED_CAKE': {"label_en":"Cottonseed Cake","label_hi":"कपास की खल","label_pa":"ਕਪਾਹ ਦੀ ਖੱਲ","icon":"🫘","model_group":"concentrate"},
  'MUSTARD_CAKE': {"label_en":"Mustard Cake","label_hi":"सरसों की खल","label_pa":"ਰਾਈ ਦੀ ਖੱਲ","icon":"🫘","model_group":"concentrate"},
  'TMR': {"label_en":"Total Mixed Ration","label_hi":"कुल मिश्रित राशन","label_pa":"ਕੁੱਲ ਮਿਲਾਇਆ ਰਾਸ਼ਨ","icon":"🥣","model_group":"tmr"},
  'GREEN_FODDER': {"label_en":"Green Fodder","label_hi":"हरा चारा","label_pa":"ਹਰਾ ਚਾਰਾ","icon":"🌿","model_group":"roughage"},
  'CONCENTRATE_MIX': {"label_en":"Concentrate Mix","label_hi":"सांद्र मिश्रण","label_pa":"ਕੰਸਨਟ੍ਰੇਟ ਮਿਕਸ","icon":"🧪","model_group":"concentrate"},
  'BERSEEM': {"label_en":"Berseem","label_hi":"बरसीम","label_pa":"ਬਰਸੀਮ","icon":"🌱","model_group":"legume"},
  'NAPIER': {"label_en":"Napier Grass","label_hi":"नेपियर घास","label_pa":"ਨੇਪੀਅਰ ਘਾਹ","icon":"🌾","model_group":"roughage"},
  'SORGHUM_SILAGE': {"label_en":"Sorghum Silage","label_hi":"ज्वार साइलेज","label_pa":"ਜਵਾਰ ਸਾਈਲੇਜ","icon":"🌽","model_group":"silage"},
  'GROUNDNUT_CAKE': {"label_en":"Groundnut Cake","label_hi":"मूंगफली की खल","label_pa":"ਮੂੰਗਫਲੀ ਦੀ ਖੱਲ","icon":"🫘","model_group":"concentrate"},
  'RICE_STRAW': {"label_en":"Rice Straw","label_hi":"धान का पुआल","label_pa":"ਝੋਨੇ ਦੀ ਤੂੜੀ","icon":"🌾","model_group":"roughage"},
  'SOYBEAN_MEAL': {"label_en":"Soybean Meal","label_hi":"सोयाबीन की खल","label_pa":"ਸੋਇਆਬੀਨ ਮੀਲ","icon":"🫘","model_group":"concentrate"},
  'MAIZE_GRAIN': {"label_en":"Maize Grain","label_hi":"मक्का का दाना","label_pa":"ਮੱਕੀ ਦਾ ਦਾਣਾ","icon":"🌽","model_group":"grain"},
  'OTHER': {"label_en":"Other","label_hi":"अन्य","label_pa":"ਹੋਰ","icon":"❓","model_group":"other"},
};

/** Overall quality grade assigned to a tested feed sample. */
export type FeedGrade =
  | 'A'
  | 'B'
  | 'C'
  | 'REJECT';

export const FeedGradeMeta: Record<FeedGrade, {
  label_en: string;
  label_hi: string;
  colour_hex: string;
  colour_name: string;
  spoken_en: string;
}> = {
  'A': {"label_en":"Grade A — Excellent","label_hi":"ग्रेड A — उत्तम","colour_hex":"#2E7D32","colour_name":"green","spoken_en":"This feed is excellent quality."},
  'B': {"label_en":"Grade B — Good","label_hi":"ग्रेड B — अच्छा","colour_hex":"#1565C0","colour_name":"blue","spoken_en":"This feed is of good quality."},
  'C': {"label_en":"Grade C — Fair","label_hi":"ग्रेड C — ठीक","colour_hex":"#F9A825","colour_name":"amber","spoken_en":"This feed is fair. Use with care."},
  'REJECT': {"label_en":"REJECT","label_hi":"अस्वीकार","colour_hex":"#C62828","colour_name":"red","spoken_en":"Do not feed this to your animals."},
};

/** Lifecycle state of a record's synchronisation with the cloud. */
export type SyncState =
  | 'pending'
  | 'in_flight'
  | 'synced'
  | 'conflict'
  | 'rejected';

export const SyncStateMeta: Record<SyncState, {
  description: string;
}> = {
  'pending': {"description":"Queued locally, not yet attempted."},
  'in_flight': {"description":"Upload attempted, awaiting server confirmation."},
  'synced': {"description":"Server confirmed receipt and stored."},
  'conflict': {"description":"Server returned a conflict (mutable entities only)."},
  'rejected': {"description":"Server rejected — see sync_reject_reason."},
};

/** Real-time status of an active NIR scan on the handheld device. */
export type ScanStatus =
  | 'idle'
  | 'chamber_open'
  | 'warming_up'
  | 'scanning'
  | 'transferring'
  | 'complete'
  | 'error'
  | 'calibrating';

export const ScanStatusMeta: Record<ScanStatus, {
  description: string;
}> = {
  'idle': {"description":"Device ready, chamber closed."},
  'chamber_open': {"description":"Sample chamber door is open."},
  'warming_up': {"description":"Light source stabilising (< 10 s)."},
  'scanning': {"description":"Active spectral sweep in progress."},
  'transferring': {"description":"BLE transfer to phone in progress."},
  'complete': {"description":"Transfer complete, inference starting."},
  'error': {"description":"Scan failed — see error_code."},
  'calibrating': {"description":"White/dark reference calibration running."},
};

/** Detected or screened adulterant types. */
export type AdulterantType =
  | 'UREA'
  | 'SAND_SILICA'
  | 'MELAMINE'
  | 'NONE';

export const AdulterantTypeMeta: Record<AdulterantType, {
  label_en: string;
  label_hi: string;
  severity: string;
  source: string;
}> = {
  'UREA': {"label_en":"Urea","label_hi":"यूरिया","severity":"high","source":"FSSAI notification 2.6.3"},
  'SAND_SILICA': {"label_en":"Sand / Silica","label_hi":"रेत / सिलिका","severity":"medium","source":"FSSAI"},
  'MELAMINE': {"label_en":"Melamine / NPN","label_hi":"मेलामाइन","severity":"critical","source":"FSSAI, EFSA"},
  'NONE': {"label_en":"None detected","label_hi":"कुछ नहीं","severity":"none","source":null},
};

/** Screening result band for mycotoxin risk. Never a quantitative claim. */
export type ToxinBand =
  | 'LOW'
  | 'MEDIUM'
  | 'HIGH'
  | 'UNKNOWN';

export const ToxinBandMeta: Record<ToxinBand, {
  label_en: string;
  label_hi: string;
  aflatoxin_ppb_approx: string;
  colour_hex: string;
}> = {
  'LOW': {"label_en":"Low Risk","label_hi":"कम जोखिम","aflatoxin_ppb_approx":"< 20","colour_hex":"#2E7D32"},
  'MEDIUM': {"label_en":"Medium Risk","label_hi":"मध्यम जोखिम","aflatoxin_ppb_approx":"20–50","colour_hex":"#F9A825"},
  'HIGH': {"label_en":"High Risk","label_hi":"अधिक जोखिम","aflatoxin_ppb_approx":"> 50","colour_hex":"#C62828"},
  'UNKNOWN': {"label_en":"Could not assess","label_hi":"अज्ञात","aflatoxin_ppb_approx":null,"colour_hex":"#757575"},
};

/** Supported languages for UI, voice, and advisory content. */
export type Language =
  | 'en'
  | 'hi'
  | 'pa'
  | 'mr'
  | 'gu'
  | 'te'
  | 'kn'
  | 'bn';

export const LanguageMeta: Record<Language, {
  label: string;
  rtl: boolean;
  tts_voice: string;
}> = {
  'en': {"label":"English","rtl":false,"tts_voice":"en-IN-NeerjaNeural"},
  'hi': {"label":"हिन्दी","rtl":false,"tts_voice":"hi-IN-SwaraNeural"},
  'pa': {"label":"ਪੰਜਾਬੀ","rtl":false,"tts_voice":"pa-IN-GurpreetNeural"},
  'mr': {"label":"मराठी","rtl":false,"tts_voice":"mr-IN-AarohiNeural"},
  'gu': {"label":"ગુજરાતી","rtl":false,"tts_voice":"gu-IN-DhwaniNeural"},
  'te': {"label":"తెలుగు","rtl":false,"tts_voice":"te-IN-MohanNeural"},
  'kn': {"label":"ಕನ್ನಡ","rtl":false,"tts_voice":"kn-IN-GaganNeural"},
  'bn': {"label":"বাংলা","rtl":false,"tts_voice":"bn-IN-TanishaaNeural"},
};

/** Hardware SKU determines which parameters are available in the app. */
export type DeviceSKU =
  | 'AAHAR_PRO'
  | 'AAHAR_LITE';

export const DeviceSKUMeta: Record<DeviceSKU, {
  label: string;
  sensor: string;
  capabilities: string;
}> = {
  'AAHAR_PRO': {"label":"AAHAR Pro","sensor":"Hamamatsu C12880MA","capabilities":["nutrition","adulteration","mycotoxin","mould","foreign_matter"]},
  'AAHAR_LITE': {"label":"AAHAR Lite","sensor":"AS7265x","capabilities":["nutrition","adulteration_urea","mould"]},
};

/** Connection and operational status of a silage probe node. */
export type ProbeStatus =
  | 'ONLINE_LORA'
  | 'ONLINE_BLE'
  | 'OFFLINE'
  | 'LOW_BATTERY'
  | 'FAULT'
  | 'CALIBRATING';

export const ProbeStatusMeta: Record<ProbeStatus, {
  description: string;
}> = {
  'ONLINE_LORA': {"description":"Connected via LoRaWAN gateway."},
  'ONLINE_BLE': {"description":"Connected via BLE relay through phone."},
  'OFFLINE': {"description":"No reading in last 2× sample interval."},
  'LOW_BATTERY': {"description":"Battery below 15%."},
  'FAULT': {"description":"Sensor fault — see error_code."},
  'CALIBRATING': {"description":"In-situ calibration running."},
};

/** Silage fermentation phase derived from probe readings. */
export type FermentationPhase =
  | 'AEROBIC'
  | 'ACTIVE_ANAEROBIC'
  | 'STABLE'
  | 'AEROBIC_SPOILAGE'
  | 'CLOSTRIDIAL';

export const FermentationPhaseMeta: Record<FermentationPhase, {
  label_en: string;
  days_typical: string;
  description: string;
}> = {
  'AEROBIC': {"label_en":"Aerobic Phase","days_typical":"0–3","description":"O₂ present, temperature rising. Normal."},
  'ACTIVE_ANAEROBIC': {"label_en":"Active Fermentation","days_typical":"3–21","description":"Lactic acid production, pH falling. Good."},
  'STABLE': {"label_en":"Stable Preservation","days_typical":"21+","description":"pH < 4.5, stable. Well preserved."},
  'AEROBIC_SPOILAGE': {"label_en":"Aerobic Spoilage","days_typical":"varies","description":"O₂ ingress after face opening. Act now."},
  'CLOSTRIDIAL': {"label_en":"Clostridial Risk","days_typical":"varies","description":"pH > 5.0, NH₃ rising. Poor fermentation."},
};

/** Common dairy cattle breeds in India. Used for nutrition requirement lookup. */
export type HerdBreed =
  | 'HF'
  | 'JERSEY'
  | 'HF_CROSS'
  | 'JERSEY_CROSS'
  | 'SAHIWAL'
  | 'GIR'
  | 'THARPARKAR'
  | 'MURRAH'
  | 'SURTI'
  | 'NILI_RAVI'
  | 'OTHER';

export const HerdBreedMeta: Record<HerdBreed, {
  label_en: string;
  type: string;
}> = {
  'HF': {"label_en":"Holstein-Friesian","type":"exotic"},
  'JERSEY': {"label_en":"Jersey","type":"exotic"},
  'HF_CROSS': {"label_en":"HF Crossbred","type":"crossbred"},
  'JERSEY_CROSS': {"label_en":"Jersey Crossbred","type":"crossbred"},
  'SAHIWAL': {"label_en":"Sahiwal","type":"indigenous"},
  'GIR': {"label_en":"Gir","type":"indigenous"},
  'THARPARKAR': {"label_en":"Tharparkar","type":"indigenous"},
  'MURRAH': {"label_en":"Murrah Buffalo","type":"buffalo"},
  'SURTI': {"label_en":"Surti Buffalo","type":"buffalo"},
  'NILI_RAVI': {"label_en":"Nili-Ravi Buffalo","type":"buffalo"},
  'OTHER': {"label_en":"Other / Unknown","type":"other"},
};

/** Stage of the lactation cycle. Used for nutritional requirement calculation. */
export type LactationStage =
  | 'EARLY'
  | 'PEAK'
  | 'MID'
  | 'LATE'
  | 'DRY'
  | 'PREGNANT'
  | 'HEIFER';

export const LactationStageMeta: Record<LactationStage, {
  label_en: string;
  days_range: string;
  label_hi: string;
}> = {
  'EARLY': {"label_en":"Early Lactation","days_range":"0–100","label_hi":"प्रारंभिक दुग्धकाल"},
  'PEAK': {"label_en":"Peak Lactation","days_range":"30–60","label_hi":"चरम दुग्धकाल"},
  'MID': {"label_en":"Mid Lactation","days_range":"100–200","label_hi":"मध्य दुग्धकाल"},
  'LATE': {"label_en":"Late Lactation","days_range":"200–305","label_hi":"अंतिम दुग्धकाल"},
  'DRY': {"label_en":"Dry Period","days_range":"305–365","label_hi":"सूखी अवधि"},
  'PREGNANT': {"label_en":"Pregnant","days_range":null,"label_hi":"गर्भवती"},
  'HEIFER': {"label_en":"Heifer / Growing","days_range":null,"label_hi":"बछड़ी"},
};

/** Severity level for push/SMS alerts. */
export type AlertSeverity =
  | 'INFO'
  | 'CAUTION'
  | 'CRITICAL';

export const AlertSeverityMeta: Record<AlertSeverity, {
  colour_hex: string;
  sms_eligible: boolean;
}> = {
  'INFO': {"colour_hex":"#1565C0","sms_eligible":false},
  'CAUTION': {"colour_hex":"#F9A825","sms_eligible":true},
  'CRITICAL': {"colour_hex":"#C62828","sms_eligible":true},
};

// ─── Zod Runtime Validators ───────────────────────────────────────────────────
// These are generated alongside the TypeScript types for runtime validation
// of sync payloads received from devices and the cloud.

import { z } from 'zod';

export const zFeedType = z.enum(['MAIZE_SILAGE', 'WHEAT_STRAW', 'COTTONSEED_CAKE', 'MUSTARD_CAKE', 'TMR', 'GREEN_FODDER', 'CONCENTRATE_MIX', 'BERSEEM', 'NAPIER', 'SORGHUM_SILAGE', 'GROUNDNUT_CAKE', 'RICE_STRAW', 'SOYBEAN_MEAL', 'MAIZE_GRAIN', 'OTHER']);
export const zFeedGrade = z.enum(['A', 'B', 'C', 'REJECT']);
export const zSyncState = z.enum(['pending', 'in_flight', 'synced', 'conflict', 'rejected']);
export const zScanStatus = z.enum(['idle', 'chamber_open', 'warming_up', 'scanning', 'transferring', 'complete', 'error', 'calibrating']);
export const zAdulterantType = z.enum(['UREA', 'SAND_SILICA', 'MELAMINE', 'NONE']);
export const zToxinBand = z.enum(['LOW', 'MEDIUM', 'HIGH', 'UNKNOWN']);
export const zLanguage = z.enum(['en', 'hi', 'pa', 'mr', 'gu', 'te', 'kn', 'bn']);
export const zDeviceSKU = z.enum(['AAHAR_PRO', 'AAHAR_LITE']);
export const zProbeStatus = z.enum(['ONLINE_LORA', 'ONLINE_BLE', 'OFFLINE', 'LOW_BATTERY', 'FAULT', 'CALIBRATING']);
export const zFermentationPhase = z.enum(['AEROBIC', 'ACTIVE_ANAEROBIC', 'STABLE', 'AEROBIC_SPOILAGE', 'CLOSTRIDIAL']);
export const zHerdBreed = z.enum(['HF', 'JERSEY', 'HF_CROSS', 'JERSEY_CROSS', 'SAHIWAL', 'GIR', 'THARPARKAR', 'MURRAH', 'SURTI', 'NILI_RAVI', 'OTHER']);
export const zLactationStage = z.enum(['EARLY', 'PEAK', 'MID', 'LATE', 'DRY', 'PREGNANT', 'HEIFER']);
export const zAlertSeverity = z.enum(['INFO', 'CAUTION', 'CRITICAL']);

export const zNumericResult = z.object({
  value:      z.number(),
  ci_low:     z.number(),
  ci_high:    z.number(),
  confidence: z.number().min(0).max(1),
  unit:       z.string(),
});

export type NumericResult = z.infer<typeof zNumericResult>;

export const zSyncEnvelope = z.object({
  id:                 z.string().uuid(),
  entity:             z.enum(['measurement','spectrum','farm','herd','bunker','probe_reading','advisory','batch','sync_run','device_calibration','ota_event']),
  schema_version:     z.number().int().positive(),
  farm_id:            z.string().uuid(),
  device_id:          z.string().regex(/^AAHAR-(P|L|S|G)-[0-9]{6}$/),
  captured_at:        z.string().datetime({ offset: true }),
  server_received_at: z.string().datetime({ offset: true }).nullable(),
  clock:              z.object({ device: z.string(), counter: z.number().int().min(0) }),
  sync_state:         z.enum(['pending','in_flight','synced','conflict','rejected']),
  sync_reject_reason: z.string().nullable().optional(),
  payload_hash:       z.string().regex(/^sha256:[a-f0-9]{64}$/),
  payload:            z.record(z.unknown()),
  tags:               z.array(z.string().max(64)).max(20).optional(),
});

export type SyncEnvelope = z.infer<typeof zSyncEnvelope>;

// ─── Core Shared Types ────────────────────────────────────────────────────────

/** NumericResult: every measurement value with confidence interval. Never display value without CI. */
export interface NumericResult {
  value:      number;
  ci_low:     number; // Lower bound of 95% CI
  ci_high:    number; // Upper bound of 95% CI
  confidence: number; // 0–1. < 0.6 = low confidence warning
  unit:       string; // Key from units.json
}

export interface LamportClock { device: string; counter: number; }

export interface SyncEnvelope {
  /**
   * UUIDv7 — time-ordered, generated offline, globally collision-free. Encodes millisecond timestamp in first 48 bits.
   */
  id: string /* uuid */;

  /**
   * Discriminator for the payload type. Determines which schema validates the payload.
   */
  entity: 'measurement' | 'spectrum' | 'farm' | 'herd' | 'bunker' | 'probe_reading' | 'advisory' | 'batch' | 'sync_run' | 'device_calibration' | 'ota_event';

  /**
   * Schema version of the payload. CI fails if the generated code does not match the current version.
   */
  schema_version: number;

  /**
   * The farm this record belongs to. Used for row-level security on the server.
   */
  farm_id: string /* uuid */;

  /**
   * Canonical device identifier. P=Pro handheld, L=Lite handheld, S=Silage probe, G=Gateway. e.g. AAHAR-P-004821
   */
  device_id: string;

  /**
   * ISO 8601 timestamp from the device clock at moment of capture. May differ from server_received_at when offline.
   */
  captured_at: string /* ISO 8601 datetime */;

  /**
   * Set by the server on first receipt. Null until synced. Never modified after first set.
   */
  server_received_at?: string /* ISO 8601 datetime */ | null;

  /**
   * Lamport logical clock for causal ordering across offline devices.
   */
  clock: {
  /** The device_id that owns this Lamport counter. */
  device: string;
  /** Monotonically increasing counter. Incremented on every local write and on receipt of a higher remote counter. */
  counter: number;
};

  /**
   * Local sync lifecycle state. 'pending'=queued for upload, 'in_flight'=upload attempted, 'synced'=server confirmed, 'conflict'=server returned conflict (mutable entities only), 'rejected'=server rejected with reason.
   */
  sync_state: 'pending' | 'in_flight' | 'synced' | 'conflict' | 'rejected';

  /**
   * Human-readable rejection reason from server. Only set when sync_state='rejected'.
   */
  sync_reject_reason?: string | null;

  /**
   * SHA-256 of the canonical JSON-serialised payload. Used for idempotent upsert and corruption detection.
   */
  payload_hash: string;

  /**
   * The actual entity data. Validated against the entity-specific schema determined by the 'entity' discriminator.
   */
  payload: Record<string, unknown>;

  /**
   * Optional free-form tags for filtering and organisation. e.g. ['pilot', 'suspect-batch', 'calibration']
   */
  tags?: string[];
}

// ── Measurement (schema v3) ──
/** Immutable record of a single feed quality test. Contains all 15 parameters from Table 4.1, confidence intervals, and derived outputs. Append-only — never updated after creation. */
export interface Measurement {
  /**
   * FeedType enum key. Determines which sub-model was active during inference.
   */
  feed_type: string;

  /**
   * DeviceSKU enum key. Determines which parameters are populated vs null.
   */
  device_sku: string;

  /**
   * Wall-clock time from scan start to spectrum transfer complete, in milliseconds.
   */
  scan_duration_ms: number;

  /**
   * Total on-device ML inference time across all models, in milliseconds.
   */
  inference_duration_ms?: number;

  /**
   * Ambient conditions from BME688 at time of scan. Used for spectral compensation.
   */
  environment?: {
  temperature_c: number;
  humidity_pct: number;
  pressure_hpa: number;
  /** BME688 VOC index 0–500. Null if sensor not warmed up. */
  voc_index?: number | null;
};

  /**
   * Proximate analysis results. All values on dry-matter basis unless noted.
   */
  proximates: {
  /** Moisture as % of fresh weight. Model: PLS-R 12LV. Target RMSEP: ±1.2% */
  moisture_pct: unknown;
  /** Crude protein % DM (N×6.25). Model: 1D-CNN+PLS ensemble. Target RMSEP: ±1.5% */
  crude_protein_pct_dm: unknown;
  /** Acid detergent fibre % DM. Model: PLS-R. Target RMSEP: ±2.1% */
  adf_pct_dm: unknown;
  /** Neutral detergent fibre % DM. Model: PLS-R. Target RMSEP: ±2.6% */
  ndf_pct_dm: unknown;
  /** Ether extract / crude fat % DM. Target RMSEP: ±0.8%. Null for AAHAR Lite on certain feeds. */
  crude_fat_pct_dm?: unknown;
  /** Total mineral / ash % DM. Target RMSEP: ±1.1% */
  ash_pct_dm?: unknown;
  /** Metabolisable energy MJ/kg DM. Derived from CP/ADF/EE/Ash via MAFF equations. Target RMSEP: ±0.6 MJ */
  me_mj_kg_dm?: unknown;
  /** Calcium/Phosphorus status from camera-read colorimetric strip. 3-class, F1 ≥ 0.85. Null if strip not used. */
  ca_p_status?: 'DEFICIT' | 'ADEQUATE' | 'EXCESS' | null | null;
  /** Model confidence for Ca/P classification. Null if ca_p_status is null. */
  ca_p_confidence?: number | null;
};

  /**
   * Food safety and adulteration screening results.
   */
  safety: {
  adulteration: {
  /** Overall adulteration verdict. SUSPECT if any single adulterant confidence 0.5–0.8, ADULTERATED if > 0.8. */
  verdict: 'CLEAN' | 'SUSPECT' | 'ADULTERATED';
  confidence: number;
  /** Urea adulteration detection. F1 ≥ 0.93 at ≥1% w/w. Null if device not capable. */
  urea?: {
  detected: boolean;
  confidence: number;
  /** Rough estimated % w/w. Only shown with screening disclaimer. Null if not detected. */
  estimated_pct?: number | null;
  /** Urease strip confirmation via camera vision. Null if strip not used. */
  strip_confirmed?: boolean | null;
} | null;
  sand_silica?: {
  detected: boolean;
  confidence: number;
  estimated_pct?: number | null;
} | null;
  /** Melamine/NPN anomaly detection via autoencoder. AUC ≥ 0.88. AAHAR Pro only. */
  melamine_npn?: {
  /** Reconstruction error normalised to [0, inf]. > threshold_melamine_anomaly flags as suspect. */
  anomaly_score: number;
  flagged: boolean;
} | null;
};
  /** Mycotoxin screening. Screening only — never quantitative. AAHAR Pro only. */
  mycotoxin: {
  aflatoxin_band: 'LOW' | 'MEDIUM' | 'HIGH' | 'UNKNOWN';
  aflatoxin_confidence?: number;
  total_mycotoxin_band: 'LOW' | 'MEDIUM' | 'HIGH' | 'UNKNOWN';
  total_mycotoxin_confidence?: number;
  /** Raw 365nm UV fluorescence intensity, device-normalised. */
  fluorescence_score?: number | null;
  /** True if aflatoxin_band == HIGH or confidence < 0.6. */
  lab_referral_required?: boolean;
};
  mould: {
  detected: boolean;
  /** Estimated % of image area with visible mould. MobileNetV3-seg, mIoU ≥ 0.72. */
  surface_coverage_pct: number;
  species_group?: 'ASPERGILLUS' | 'FUSARIUM' | 'PENICILLIUM' | 'MIXED' | 'UNKNOWN' | null | null;
  confidence?: number;
  /** YOLO-nano foreign matter detection on macro images. F1 ≥ 0.88. */
  foreign_matter_detected?: boolean;
  /** e.g. ['plastic', 'stone', 'insect'] */
  foreign_matter_types?: string[];
};
};

  /**
   * Derived outputs computed from proximate + safety results.
   */
  derived: {
  /** Overall feed grade. A→green, B→blue, C→amber, REJECT→red. */
  feed_grade: 'A' | 'B' | 'C' | 'REJECT';
  /** Short machine-readable reason codes that determined the grade. e.g. ['urea_detected', 'cp_below_minimum', 'high_moisture'] */
  feed_grade_reasons?: string[];
  /** Value comparison against local market rates. Null if price not entered. */
  value_for_money?: {
  price_paid_inr_per_kg: number;
  /** price_paid / (crude_protein_pct_dm / 100) */
  cost_per_kg_protein_inr: number;
  /** From offline-bundled regional price table. */
  market_avg_inr: number;
  /** Negative = good deal. Positive = overpaid. */
  overpaid_inr?: number;
  verdict: 'GOOD_VALUE' | 'FAIR' | 'OVERPRICED' | 'GROSSLY_OVERPRICED';
} | null;
  /** Plain-language storage advisory key, resolved to locale string in the UI. e.g. 'dry_within_3_days' */
  storage_action?: string | null;
  /** Plain-language safety action key. e.g. 'do_not_feed_pregnant' */
  safety_action?: string | null;
};

  /**
   * The herd record used for ration balancing at time of test. Null if no herd profile set up.
   */
  herd_context_id?: string /* uuid */ | null;

  /**
   * UUIDv7 of the advisory record generated from this measurement.
   */
  advisory_id?: string /* uuid */ | null;

  /**
   * Optional: price the farmer paid. Enables value-for-money calculation.
   */
  price_paid_inr_per_kg?: number | null;

  /**
   * UUIDv7 of the raw spectrum record stored separately (large payload).
   */
  spectrum_id?: string /* uuid */ | null;

  /**
   * UUIDv7s of the 4-angle macro photo records stored separately.
   */
  macro_image_ids?: string /* uuid */[];

  /**
   * Ensemble confidence across all active models. < 0.6 triggers 'low confidence' UI warning.
   */
  confidence_overall: number;

  /**
   * False if Mahalanobis distance of the spectrum from training manifold exceeds threshold. If false, UI must show 'unusual sample — send to lab' and refuse to print a grade.
   */
  in_distribution: boolean;

  /**
   * Version string of each model bundle active during inference. For audit and retraining queue.
   */
  model_versions?: Record<string, string>;

  /**
   * Keyed by Language enum. Pre-rendered advisory text stored with the record for offline display.
   */
  local_advisory_text?: Record<string, string> | null;

  /**
   * If this test was triggered by scanning a QR batch, the batch UUID. Enables declared-vs-measured diff.
   */
  qr_batch_id?: string /* uuid */ | null;
}

export interface NumericResult {
  /**
   * Point estimate from the model.
   */
  value: number;

  /**
   * Lower bound of the 95% confidence interval.
   */
  ci_low: number;

  /**
   * Upper bound of the 95% confidence interval.
   */
  ci_high: number;

  /**
   * Model confidence in this prediction. < 0.6 = low confidence.
   */
  confidence: number;

  /**
   * Unit key from units.json, e.g. 'pct_dm', 'mj_per_kg_dm'
   */
  unit: string;
}

// ── Spectrum (schema v2) ──
/** Raw NIR spectrum payload. Immutable, large — stored separately from measurement. 228 bands × 3 repeats. Wi-Fi only sync by default. */
export interface Spectrum {
  /**
   * UUIDv7 of the parent measurement record.
   */
  measurement_id: string /* uuid */;

  /**
   * DeviceSKU enum key.
   */
  device_sku: string;

  /**
   * Physical sensor model. Determines wavelength grid and calibration polynomial.
   */
  sensor_model: 'C12880MA' | 'AS7265x';

  /**
   * Wavelength axis in nanometres. Length determines number of bands. Hamamatsu: 228 bands 340–850nm. AS7265x: 18 bands 410–940nm.
   */
  wavelengths_nm: number[];

  /**
   * Outer array = repeats (3 for production scan). Inner array = counts per wavelength band.
   */
  intensities_raw: number[][];

  /**
   * Corrected reflectance: (raw - dark) / (white - dark). Same shape as intensities_raw.
   */
  intensities_corrected: number[][];

  /**
   * Dark reference counts captured with shutter closed. Same length as wavelengths_nm.
   */
  dark_reference: number[];

  /**
   * White reference counts from Spectralon tile. Captured at scan start. Same length as wavelengths_nm.
   */
  white_reference: number[];

  /**
   * Number of spectral sweeps in this capture. Production: 3.
   */
  repeats: number;

  /**
   * Sensor integration time in microseconds. Auto-selected to avoid saturation.
   */
  integration_time_us?: number;

  /**
   * Sensor gain setting. Sensor-dependent.
   */
  gain?: number;

  /**
   * Estimated signal-to-noise ratio in dB. Computed from repeat variance. < 20 dB triggers a retake prompt.
   */
  snr_db?: number | null;

  /**
   * Indices of any saturated bands (count at max ADC). Should be empty for a good scan.
   */
  saturation_bands?: number[];

  /**
   * Whether temperature drift correction was applied using BME688 reading.
   */
  temperature_compensation_applied?: boolean;

  /**
   * ID of the calibration file that was active when this spectrum was captured.
   */
  calibration_id?: string;

  /**
   * BLE transfer quality metrics.
   */
  transfer_stats?: {
  total_chunks?: number;
  retransmitted?: number;
  transfer_ms?: number;
  throughput_kbps?: number;
};

  /**
   * Ordered list of preprocessing steps applied before inference. e.g. ['snv', 'savitzky_golay_11_2']
   */
  preprocessing_applied?: string[];
}

// ── Farm (schema v2) ──
/** Mutable farm profile. Uses field-level Lamport clocks for offline conflict resolution: two offline edits to different fields both survive; same field follows last-write-wins. */
export interface Farm {
  /**
   * Farm name or owner name as used locally.
   */
  name: string;

  /**
   * Verified phone number (E.164, India only for v1). Used for OTP auth and SMS alerts.
   */
  owner_phone: string;

  owner_name?: string;

  /**
   * Farm location for regional analytics and lab directory lookup.
   */
  location: {
  /** Indian state name in English. */
  state: string;
  /** District name in English. */
  district: string;
  village?: string | null;
  pincode?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  /** GPS accuracy in metres at time of location capture. */
  geo_accuracy_m?: number | null;
};

  /**
   * Language enum key. App switches to this language on farm profile load.
   */
  language_preference?: string;

  /**
   * Linked FPO/co-operative for dashboard aggregation and device sharing.
   */
  fpo_id?: string /* uuid */ | null;

  /**
   * Devices registered to this farm.
   */
  device_ids?: string[];

  /**
   * Optional farm photo stored in MinIO.
   */
  photo_url?: string /* URI */ | null;

  /**
   * DPDP Act 2023 consent record. Must be obtained before any data leaves the device.
   */
  consent?: {
  given: boolean;
  given_at: string /* ISO 8601 datetime */;
  /** Consent form version string. e.g. 'v1.2' */
  version: string;
  revoked?: boolean;
  revoked_at?: string /* ISO 8601 datetime */ | null;
};

  /**
   * Field-level Lamport clock map. Every top-level mutable field has an entry here. Format: { 'field_name': { 'device': 'AAHAR-P-004821', 'counter': 42 } }. Used by sync engine for conflict resolution.
   */
  fields: Record<string, {
  device: string;
  counter: number;
}>;

  /**
   * Optional notes by the FPO supervisor or vet.
   */
  notes?: string | null;
}

// ── Herd (schema v2) ──
/** Mutable herd composition record for a farm. Used by the advisory engine to compute ration correction. Field-level Lamport clocks for offline merge. */
export interface Herd {
  farm_id: string /* uuid */;

  /**
   * Individual or group animal records. Groups share the same breed/stage.
   */
  animals: {
  /** UUIDv7 for this animal/group record. */
  id: string /* uuid */;
  /** Ear tag or name, farmer-assigned. */
  tag?: string | null;
  /** HerdBreed enum key. */
  breed: string;
  /** LactationStage enum key. */
  lactation_stage: string;
  /** Number of animals in this group (1 for individual). */
  count: number;
  body_weight_kg?: number | null;
  /** Average daily milk yield for this group. Used for ME and CP requirement calculation. */
  milk_yield_kg_day?: number | null;
  milk_fat_pct?: number | null;
  days_in_milk?: number | null;
  /** For pregnant animals. Used to increase nutritional requirements in third trimester. */
  pregnancy_week?: number | null;
  notes?: string | null;
}[];

  /**
   * Current feed stocks. Used by ration balancer to work with what the farmer actually has.
   */
  feed_on_hand?: {
  /** FeedType enum key. */
  feed_type: string;
  quantity_kg: number;
  /** Link to the most recent test result for this stock. */
  measurement_id?: string /* uuid */ | null;
}[];

  /**
   * Denormalised count. Must equal sum of animals[].count. Validated on write.
   */
  total_animals?: number;

  /**
   * Field-level Lamport clocks for offline merge.
   */
  fields: Record<string, {
  device: string;
  counter: number;
}>;
}

// ── Bunker (schema v2) ──
/** Silage bunker / bag registration. Mutable geometry and metadata. Drives the 3D digital twin (S4). Field-level Lamport clocks for offline merge. */
export interface Bunker {
  farm_id: string /* uuid */;

  /**
   * Farmer-assigned name, e.g. 'North Bunker' or 'Bag #3'.
   */
  name: string;

  /**
   * Silage storage structure type. Determines 3D twin geometry.
   */
  type: 'BUNKER' | 'PILE' | 'BAG' | 'TOWER' | 'PIT';

  /**
   * True-scale dimensions for 3D twin. All in metres.
   */
  dimensions: {
  length_m: number;
  width_m: number;
  height_m: number;
  /** For bunker silos with sloped walls. */
  wall_angle_deg?: number | null;
};

  capacity_tonnes?: number | null;

  /**
   * Estimated current fill level as % of capacity. Updated by farmer or FPO supervisor.
   */
  fill_pct?: number | null;

  /**
   * FeedType enum key for the ensiled crop. e.g. 'MAIZE_SILAGE', 'SORGHUM_SILAGE'.
   */
  crop_type: string;

  /**
   * Date the bunker was sealed / ensiling started. Used for fermentation phase calculation.
   */
  ensiling_date: string /* ISO 8601 date */;

  /**
   * Date the face was first opened for feedout. Triggers aerobic spoilage risk model.
   */
  opening_date?: string /* ISO 8601 date */ | null;

  /**
   * Cardinal direction of the feed-out face. For feedout planning in the 3D twin.
   */
  face_direction?: 'NORTH' | 'SOUTH' | 'EAST' | 'WEST' | 'UNKNOWN' | null | null;

  /**
   * Registered probe lance positions in the bunker coordinate system. Origin = NW corner, +X = East, +Y = Up, +Z = South.
   */
  probe_positions: {
  probe_device_id: string;
  /** Farmer-assigned label, e.g. 'Centre probe'. */
  label?: string | null;
  x_m: number;
  /** Depth from surface. */
  y_m: number;
  z_m: number;
  /** Lance insertion depth. */
  depth_from_surface_m?: number;
}[];

  /**
   * UUIDv7s of bunker photos stored in MinIO.
   */
  photo_ids?: string /* uuid */[];

  /**
   * Sealing material type. Affects O₂ ingress model.
   */
  cover_material?: 'PLASTIC_FILM' | 'SOIL' | 'TYRES' | 'MIXED' | null | null;

  /**
   * FermentationPhase enum key. Derived from probe readings, updated by the cloud on each sync.
   */
  fermentation_phase?: string | null;

  /**
   * Latest Fermentation Quality Index (0–100). Derived on the cloud, synced back.
   */
  latest_fqi?: number | null;

  /**
   * Latest feedout recommendation from the spoilage forecast model.
   */
  feedout_recommendation?: {
  computed_at?: string /* ISO 8601 datetime */;
  advance_cm_per_day?: number;
  spoilage_front_m?: number;
  /** Advisory action key, e.g. 'open_left_face_within_5_days' */
  action_key?: string;
  days_until_action?: number | null;
} | null;

  /**
   * Field-level Lamport clocks.
   */
  fields: Record<string, {
  device: string;
  counter: number;
}>;
}

// ── ProbeReading (schema v2) ──
/** Immutable time-series reading from a silage probe node. Append-only. 9 parameters from Table 4.2. Ingested via MQTT or BLE relay. */
export interface ProbeReading {
  bunker_id: string /* uuid */;

  probe_device_id: string;

  /**
   * Monotonically increasing sequence number per probe. Used to detect gaps.
   */
  reading_sequence?: number;

  /**
   * ISFET pH probe reading. Range 3.0–7.5, accuracy ±0.1.
   */
  ph: {
  value: number;
  /** Raw millivolt output before temperature compensation. */
  raw_mv: number;
  temp_compensated?: boolean;
  calibration_offset?: number;
};

  /**
   * Temperature readings from DS18B20 array at 4 depths. Index 0=surface, 3=deepest.
   */
  temperatures_c: {
  depth_cm: number;
  value_c: number;
}[];

  moisture_pct: {
  value: number;
  capacitive_raw?: number | null;
  resistive_raw?: number | null;
};

  /**
   * NDIR CO₂ reading. MH-Z19C. Range 0–10000 ppm, accuracy ±50 ppm.
   */
  co2_ppm: {
  value: number;
  raw_adc?: number | null;
};

  /**
   * Electrochemical O₂ sensor. Range 0–25%, accuracy ±0.2%.
   */
  o2_pct: {
  value: number;
};

  /**
   * BME688 MOS array VOC / gas index readings. Relative, indexed.
   */
  voc?: {
  gas_resistance_ohm?: number;
  voc_index?: number;
  /** Relative ethanol indication 0–1. */
  ethanol_rel?: number | null;
  /** Relative NH₃ indication 0–1. High = protein breakdown. */
  nh3_rel?: number | null;
} | null;

  /**
   * Composite score derived from pH trajectory, temp delta, CO₂, VOC. 80–100=excellent, 60–79=good, 40–59=fair, <40=poor.
   */
  fermentation_quality_index: number;

  /**
   * Derived mould growth probability. AUC ≥ 0.86. Null until forecast model has enough history (min 24 h).
   */
  mould_probability?: number | null;

  /**
   * Estimated aerobic spoilage front position in metres from the feed-out face. Null if face not yet opened.
   */
  spoilage_front_m?: number | null;

  /**
   * Active alert conditions at time of reading. Each triggers push/SMS if AlertSeverity=CRITICAL.
   */
  alert_flags?: 'HIGH_PH' | 'TEMP_SPIKE' | 'O2_INGRESS' | 'NH3_SPIKE' | 'LOW_BATTERY' | 'MOULD_RISK' | 'CLOSTRIDIAL_RISK'[];

  battery_pct?: number;

  solar_charging?: boolean | null;

  /**
   * Radio link quality.
   */
  signal?: {
  transport?: 'LORA' | 'BLE' | 'WIFI' | 'STORED';
  rssi_dbm?: number | null;
  snr_db?: number | null;
};
}

// ── Advisory (schema v2) ──
/** Derived advisory record generated from a measurement + herd context. A local version is stored on-device. Server may recompute an authoritative version after sync. Both versions are kept. */
export interface Advisory {
  measurement_id: string /* uuid */;

  herd_id?: string /* uuid */ | null;

  /**
   * True = computed by cloud with full model context. False = computed on-device from local rule engine.
   */
  is_server_authoritative?: boolean;

  computed_at?: string /* ISO 8601 datetime */;

  feed_grade: 'A' | 'B' | 'C' | 'REJECT';

  /**
   * Ordered list of actions the farmer should take, highest priority first.
   */
  actions: {
  priority: number;
  category: 'SAFETY' | 'STORAGE' | 'FEEDING' | 'VETERINARY' | 'LAB_REFERRAL' | 'ECONOMIC';
  /** Machine-readable key resolved to locale string in the UI. */
  action_key: string;
  /** Interpolation parameters for the action string template. */
  action_params?: Record<string, unknown>;
  severity: 'INFO' | 'CAUTION' | 'CRITICAL';
  /** Nearest NABL lab name. Only set for LAB_REFERRAL category. */
  lab_name?: string | null;
  lab_address?: string | null;
  lab_phone?: string | null;
}[];

  /**
   * Specific ration adjustment for this herd + this feed result. Null if no herd profile set.
   */
  ration_correction: {
  /** Advisory template key, e.g. 'add_mustard_cake'. */
  summary_key?: string;
  adjustments?: {
  feed_type: string;
  /** Positive = add, negative = reduce. */
  change_kg_per_animal_per_day: number;
  rationale_key?: string;
}[];
} | null;

  /**
   * Body system impacts for the S5 Herd Impact 3D scene. Each entry maps to a highlighted region on the cow model.
   */
  herd_impacts: {
  body_system: 'RUMEN' | 'UDDER' | 'LIVER' | 'SKELETON' | 'REPRODUCTIVE' | 'IMMUNE' | 'GENERAL';
  severity: 'INFO' | 'CAUTION' | 'CRITICAL';
  /** Template key for tap-to-explain text and TTS. */
  explanation_key: string;
  /** Template key for the specific fix action. */
  fix_key?: string | null;
}[];

  /**
   * e.g. 'overpriced_protein'. Resolved to locale string with params.
   */
  value_for_money_summary_key?: string | null;

  value_for_money_params?: Record<string, unknown> | null;

  /**
   * Pre-rendered advisory text keyed by Language enum key. All 8 languages populated before the record is stored.
   */
  text: {
  en: string;
  hi?: string;
  pa?: string;
  mr?: string;
  gu?: string;
  te?: string;
  kn?: string;
  bn?: string;
};

  /**
   * UUIDv7s of pre-generated TTS audio files, keyed by language. Bundled offline.
   */
  tts_ids?: Record<string, string /* uuid */>;
}

// ── Batch (schema v2) ──
/** Feed mill batch record for QR traceability. A mill registers a batch with its declared profile. Farmers scan the QR to compare declared vs measured. Mismatches trigger dispute records. */
export interface Batch {
  /**
   * UUID of the registered feed mill organisation.
   */
  mill_id: string /* uuid */;

  /**
   * Mill's own batch/lot code. Displayed on the QR scan result.
   */
  batch_code: string;

  /**
   * FeedType enum key.
   */
  feed_type: string;

  production_date: string /* ISO 8601 date */;

  expiry_date?: string /* ISO 8601 date */ | null;

  quantity_tonnes?: number | null;

  /**
   * Mill's declared nutritional profile. Compared against farmer's measurement.
   */
  declared_profile: {
  crude_protein_pct_dm: number;
  moisture_pct: number;
  adf_pct_dm?: number | null;
  ndf_pct_dm?: number | null;
  crude_fat_pct_dm?: number | null;
  ash_pct_dm?: number | null;
  me_mj_kg_dm?: number | null;
  /** NABL lab report PDF stored in MinIO. */
  lab_report_url?: string /* URI */ | null;
  lab_test_date?: string /* ISO 8601 date */ | null;
};

  /**
   * The exact string encoded in the QR code. Format: 'aahar://batch/{uuid}'. Scanned by farmer app.
   */
  qr_payload: string;

  /**
   * Ed25519 signature of qr_payload. Verified on-device with bundled public key.
   */
  qr_signed?: string;

  /**
   * Dispute records created when farmer measurements deviate beyond tolerance from declared profile.
   */
  disputes?: {
  id: string /* uuid */;
  /** The farmer's measurement that triggered the dispute. */
  measurement_id: string /* uuid */;
  farm_id?: string /* uuid */;
  deviating_fields: {
  /** e.g. 'crude_protein_pct_dm' */
  field: string;
  declared: number;
  measured: number;
  /** Absolute percentage deviation. Dispute triggered when > threshold from thresholds.json. */
  deviation_pct: number;
  /** The tolerance threshold that was exceeded. */
  tolerance_used?: number;
}[];
  created_at: string /* ISO 8601 datetime */;
  status: 'OPEN' | 'UNDER_REVIEW' | 'RESOLVED_VALID' | 'RESOLVED_INVALID' | 'ESCALATED';
  fpo_note?: string | null;
  resolved_at?: string /* ISO 8601 datetime */ | null;
}[];

  /**
   * Cloud-computed aggregate from all farmer tests against this batch. Updated on sync.
   */
  aggregate_stats?: {
  test_count?: number;
  avg_cp_measured?: number | null;
  avg_deviation_cp?: number | null;
  dispute_count?: number;
  last_tested_at?: string /* ISO 8601 datetime */ | null;
} | null;
}


// ─── Utility Types ────────────────────────────────────────────────────────────

/** A sync envelope wrapping a specific entity payload */
export type TypedSyncEnvelope<T extends SyncEnvelope['entity'], P> = Omit<SyncEnvelope, 'entity' | 'payload'> & {
  entity: T;
  payload: P;
};

export type MeasurementEnvelope  = TypedSyncEnvelope<'measurement',  Measurement>;
export type SpectrumEnvelope      = TypedSyncEnvelope<'spectrum',     Spectrum>;
export type FarmEnvelope          = TypedSyncEnvelope<'farm',         Farm>;
export type HerdEnvelope          = TypedSyncEnvelope<'herd',         Herd>;
export type BunkerEnvelope        = TypedSyncEnvelope<'bunker',       Bunker>;
export type ProbeReadingEnvelope  = TypedSyncEnvelope<'probe_reading',ProbeReading>;
export type AdvisoryEnvelope      = TypedSyncEnvelope<'advisory',     Advisory>;
export type BatchEnvelope         = TypedSyncEnvelope<'batch',        Batch>;

/** All syncable record types as a discriminated union */
export type AnyRecord =
  | MeasurementEnvelope
  | SpectrumEnvelope
  | FarmEnvelope
  | HerdEnvelope
  | BunkerEnvelope
  | ProbeReadingEnvelope
  | AdvisoryEnvelope
  | BatchEnvelope;

/** Sync push request body */
export interface SyncPushRequest {
  records: AnyRecord[];
  idempotency_key: string; // sha256 of sorted record IDs
}

/** Sync push response per record */
export interface SyncPushResult {
  id: string;
  status: 'accepted' | 'duplicate' | 'conflict' | 'rejected';
  reject_reason?: string;
  server_received_at?: string;
}

/** Sync push response body */
export interface SyncPushResponse {
  results: SyncPushResult[];
  server_time: string;
}

/** Sync pull response */
export interface SyncPullResponse {
  records: AnyRecord[];
  cursor: string;
  has_more: boolean;
  server_time: string;
}

/** Sync handshake response */
export interface SyncHandshake {
  server_time:      string;
  schema_version:   number;
  model_version:    string;
  firmware_version: string;
  cursor:           string;
  thresholds_hash:  string; // sha256 of thresholds.json — if different, pull new thresholds
}
