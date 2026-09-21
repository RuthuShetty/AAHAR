/**
 * AAHAR Mobile — Local SQLite Schema Definitions & Migrations
 * Aligned with contracts/schema/*.schema.json and ADR-002 offline-first sync.
 */

export const SCHEMA_VERSION = 1;

export const CREATE_TABLES_SQL = `
CREATE TABLE IF NOT EXISTS schema_migrations (
  version INTEGER PRIMARY KEY,
  applied_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS farms (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  farmer_name TEXT NOT NULL,
  contact_phone TEXT NOT NULL,
  location TEXT,
  fpo_id TEXT,
  lamport_clocks TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS herds (
  farm_id TEXT PRIMARY KEY,
  total_cattle INTEGER NOT NULL,
  milking_cows INTEGER NOT NULL,
  dry_cows INTEGER NOT NULL,
  calves INTEGER NOT NULL,
  breeds TEXT NOT NULL,
  avg_daily_yield_litres REAL NOT NULL,
  feed_on_hand TEXT NOT NULL,
  lamport_clocks TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (farm_id) REFERENCES farms(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS bunkers (
  id TEXT PRIMARY KEY,
  farm_id TEXT NOT NULL,
  name TEXT NOT NULL,
  structure_type TEXT NOT NULL,
  dimensions TEXT NOT NULL,
  ensiling_date TEXT NOT NULL,
  crop_type TEXT NOT NULL,
  probe_ids TEXT NOT NULL,
  lamport_clocks TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (farm_id) REFERENCES farms(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS measurements (
  id TEXT PRIMARY KEY,
  device_id TEXT NOT NULL,
  farm_id TEXT NOT NULL,
  captured_at TEXT NOT NULL,
  feed_type TEXT NOT NULL,
  sample_batch_code TEXT,
  overall_grade TEXT NOT NULL,
  in_distribution INTEGER NOT NULL DEFAULT 1,
  proximates TEXT NOT NULL,
  adulterants TEXT NOT NULL,
  safety TEXT NOT NULL,
  value_for_money TEXT,
  notes TEXT,
  operator_id TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (farm_id) REFERENCES farms(id)
);

CREATE TABLE IF NOT EXISTS spectra (
  measurement_id TEXT PRIMARY KEY,
  wavelength_start_nm REAL NOT NULL,
  wavelength_end_nm REAL NOT NULL,
  num_bands INTEGER NOT NULL,
  wavelengths TEXT NOT NULL,
  intensities TEXT NOT NULL,
  repeats TEXT,
  temperature_c REAL NOT NULL,
  humidity_pct REAL NOT NULL,
  ambient_light_lux REAL,
  dark_subtracted INTEGER NOT NULL DEFAULT 1,
  white_referenced INTEGER NOT NULL DEFAULT 1,
  integration_time_ms REAL NOT NULL,
  raw_crc16 INTEGER NOT NULL,
  FOREIGN KEY (measurement_id) REFERENCES measurements(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS probe_readings (
  id TEXT PRIMARY KEY,
  probe_id TEXT NOT NULL,
  bunker_id TEXT NOT NULL,
  captured_at TEXT NOT NULL,
  depth_m REAL NOT NULL,
  ph REAL NOT NULL,
  core_temperature_c REAL NOT NULL,
  moisture_pct REAL NOT NULL,
  co2_ppm REAL NOT NULL,
  o2_pct REAL NOT NULL,
  voc_index REAL NOT NULL,
  fermentation_index REAL NOT NULL,
  FOREIGN KEY (bunker_id) REFERENCES bunkers(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS advisories (
  id TEXT PRIMARY KEY,
  measurement_id TEXT NOT NULL,
  overall_grade TEXT NOT NULL,
  summary_en TEXT NOT NULL,
  summary_hi TEXT NOT NULL,
  summary_pa TEXT NOT NULL,
  summary_mr TEXT NOT NULL,
  summary_gu TEXT NOT NULL,
  summary_te TEXT NOT NULL,
  summary_kn TEXT NOT NULL,
  summary_bn TEXT NOT NULL,
  actions TEXT NOT NULL,
  herd_impacts TEXT NOT NULL,
  ration_adjustments TEXT NOT NULL,
  generated_at TEXT NOT NULL,
  FOREIGN KEY (measurement_id) REFERENCES measurements(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS batches (
  id TEXT PRIMARY KEY,
  qr_code TEXT UNIQUE NOT NULL,
  supplier_name TEXT NOT NULL,
  feed_type TEXT NOT NULL,
  declared_profile TEXT NOT NULL,
  mismatch_detected INTEGER NOT NULL DEFAULT 0,
  dispute_status TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sync_queue (
  id TEXT PRIMARY KEY,
  entity TEXT NOT NULL,
  record_id TEXT NOT NULL,
  schema_version INTEGER NOT NULL DEFAULT 3,
  farm_id TEXT NOT NULL,
  device_id TEXT NOT NULL,
  captured_at TEXT NOT NULL,
  clock_counter INTEGER NOT NULL,
  sync_state TEXT NOT NULL DEFAULT 'pending',
  priority TEXT NOT NULL DEFAULT 'high',
  payload_hash TEXT NOT NULL,
  payload TEXT NOT NULL,
  retry_count INTEGER NOT NULL DEFAULT 0,
  last_attempt_at TEXT,
  error_message TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sync_runs (
  id TEXT PRIMARY KEY,
  started_at TEXT NOT NULL,
  ended_at TEXT,
  bytes_uploaded INTEGER NOT NULL DEFAULT 0,
  bytes_downloaded INTEGER NOT NULL DEFAULT 0,
  records_pushed INTEGER NOT NULL DEFAULT 0,
  records_pulled INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL,
  error_message TEXT
);

CREATE INDEX IF NOT EXISTS idx_measurements_farm ON measurements(farm_id, captured_at DESC);
CREATE INDEX IF NOT EXISTS idx_probe_readings_bunker ON probe_readings(bunker_id, captured_at DESC);
CREATE INDEX IF NOT EXISTS idx_sync_queue_status ON sync_queue(sync_state, priority, captured_at ASC);
`;
