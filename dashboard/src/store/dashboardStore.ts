import { create } from 'zustand';
import type { Batch, FeedType } from '../types/contracts';

export interface DeviatingField {
  field: string;
  declared: number;
  measured: number;
  deviation_pct: number;
  tolerance_used: number;
}

export interface DisputeRecord {
  id: string;
  batch_id: string;
  batch_code: string;
  mill_name: string;
  measurement_id: string;
  farm_id: string;
  farm_name: string;
  deviating_fields: DeviatingField[];
  created_at: string;
  status: 'OPEN' | 'UNDER_REVIEW' | 'RESOLVED_VALID' | 'RESOLVED_INVALID' | 'ESCALATED';
  fpo_note?: string | null;
  resolved_at?: string | null;
}

export interface ProbeReadingPoint {
  depth_m: number;
  temp_c: number;
  status: 'optimal' | 'warning' | 'critical';
}

export interface BunkerProbeLance {
  id: string;
  lance_code: string;
  x_m: number;
  y_m: number;
  ph: number;
  moisture_pct: number;
  co2_ppm: number;
  voc_ppb: number;
  readings: ProbeReadingPoint[];
}

export interface BunkerTwinData {
  id: string;
  farm_id: string;
  name: string;
  crop: FeedType;
  pack_date: string;
  length_m: number;
  width_m: number;
  height_m: number;
  density_kg_dm_m3: number;
  face_sealed: boolean;
  probes: BunkerProbeLance[];
  spoilage_forecast: {
    front_velocity_m_per_day: number;
    hours_to_critical: number;
    dmi_loss_pct_forecast: number;
    current_front_pos_m: number;
    day_positions_m: number[]; // 8 values [day 0 to day 7]
    recommended_feedout_rate_tonnes_per_day: number;
    risk_level: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
  };
}

export interface ScannerDevice {
  device_id: string;
  operator_name: string;
  village: string;
  lat: number;
  lng: number;
  battery_pct: number;
  is_online: boolean;
  scans_today: number;
  last_calibrated_at: string;
  firmware_version: string;
}

export interface SupplierScorecard {
  id: string;
  name: string;
  district: string;
  tonnes_supplied: number;
  batches_count: number;
  tests_performed: number;
  avg_cp_deviation_pct: number; // negative = delivered less than declared
  adulteration_rate_pct: number; // urea/silica/melamine incidents
  dispute_count: number;
  disputes_lost: number;
  quality_score: number; // 0 to 100
  rating: 'TIER_1' | 'TIER_2' | 'TIER_3' | 'FLAGGED';
}

export interface ModelMetric {
  id: string;
  name: string;
  unit: string;
  rmsep: number;
  target_rmsep: number;
  r2: number;
  ood_rate_pct: number;
  drift_90d_pct: number;
  last_evaluated: string;
  status: 'EXCELLENT' | 'GOOD' | 'CALIBRATION_DUE';
}

export interface AlertItem {
  id: string;
  severity: 'CRITICAL' | 'WARNING' | 'INFO';
  title: string;
  message: string;
  entity_type: 'BATCH' | 'BUNKER' | 'SCANNER' | 'SUPPLIER' | 'SHIPMENT';
  entity_id: string;
  timestamp: string;
  acknowledged: boolean;
}

export interface TelemetryCheckpoint {
  id: string;
  name: string;
  location: string;
  timestamp: string;
  status: 'COMPLETED' | 'IN_PROGRESS' | 'PENDING';
  scanner_id?: string;
  verified: boolean;
}

export interface TrackingShipment {
  id: string;
  batch_id: string;
  batch_code: string;
  feed_type: FeedType;
  quantity_tonnes: number;
  origin: string;
  destination: string;
  status: 'IN_TRANSIT' | 'AT_CHECKPOINT' | 'DELIVERED' | 'DELAYED';
  transporter: string;
  driver_name: string;
  driver_phone: string;
  vehicle_no: string;
  speed_kmh: number;
  cargo_temp_c: number;
  ambient_humidity_pct: number;
  battery_pct: number;
  vibration_g: number;
  total_distance_km: number;
  distance_remaining_km: number;
  eta_minutes: number;
  progress_pct: number;
  current_lat: number;
  current_lng: number;
  route_coords: [number, number][];
  checkpoints: TelemetryCheckpoint[];
  last_ping: string;
}

export interface UserProfile {
  id: string;
  fullName: string;
  designation: string;
  department: string;
  email: string;
  phone: string;
  organization: string;
  fpoCode: string;
  district: string;
  zone: string;
  assignedScanners: string[];
  permissions: string[];
  lastLogin: string;
  sessionId: string;
}

export interface SystemSettings {
  apiBaseUrl: string;
  wsAlertsUrl: string;
  telemetryIntervalSec: number;
  autoRefresh: boolean;
  tempThresholdC: number;
  cpTolerancePct: number;
  moistureWarningPct: number;
  oodMahalanobisThreshold: number;
  enableSoundAlerts: boolean;
  apiKey: string;
  auditLogging: boolean;
}

export interface DashboardState {
  activeTab: 'traceability' | 'bunker' | 'fleet' | 'suppliers' | 'models' | 'alerts' | 'profile' | 'settings';
  setActiveTab: (tab: DashboardState['activeTab']) => void;

  mobileMenuOpen: boolean;
  setMobileMenuOpen: (open: boolean) => void;

  searchQuery: string;
  setSearchQuery: (q: string) => void;

  batches: Batch[];
  selectedBatchId: string | null;
  setSelectedBatchId: (id: string | null) => void;

  shipments: TrackingShipment[];
  selectedShipmentId: string | null;
  setSelectedShipmentId: (id: string | null) => void;

  disputes: DisputeRecord[];
  selectedDisputeId: string | null;
  setSelectedDisputeId: (id: string | null) => void;

  bunker: BunkerTwinData;
  bunkerScrubDay: number;
  setBunkerScrubDay: (day: number) => void;

  scanners: ScannerDevice[];
  suppliers: SupplierScorecard[];
  models: ModelMetric[];
  alerts: AlertItem[];

  userProfile: UserProfile;
  updateUserProfile: (profile: Partial<UserProfile>) => void;

  systemSettings: SystemSettings;
  updateSystemSettings: (settings: Partial<SystemSettings>) => void;
  generateApiKey: () => string;
  resetSettingsToDefault: () => void;

  // Actions
  registerBatch: (batch: {
    mill_id: string;
    mill_name: string;
    batch_code: string;
    feed_type: FeedType;
    production_date: string;
    expiry_date?: string;
    quantity_tonnes?: number;
    declared_profile: {
      crude_protein_pct_dm: number;
      moisture_pct: number;
      adf_pct_dm?: number;
      ndf_pct_dm?: number;
      crude_fat_pct_dm?: number;
      ash_pct_dm?: number;
      me_mj_kg_dm?: number;
    };
  }) => Batch;

  evaluateTestAgainstBatch: (
    batchId: string,
    measured: {
      crude_protein_pct_dm: number;
      moisture_pct: number;
      adf_pct_dm?: number;
      ndf_pct_dm?: number;
      ash_pct_dm?: number;
      urea_detected?: boolean;
      silica_detected?: boolean;
      melamine_detected?: boolean;
    }
  ) => {
    isBreach: boolean;
    deviatingFields: DeviatingField[];
    summary: string;
  };

  createDispute: (
    batchId: string,
    measurementId: string,
    farmId: string,
    farmName: string,
    deviatingFields: DeviatingField[],
    fpoNote?: string
  ) => DisputeRecord;

  updateDisputeStatus: (
    disputeId: string,
    status: DisputeRecord['status'],
    fpoNote?: string
  ) => void;

  acknowledgeAlert: (alertId: string) => void;
  triggerLiveAlert: (alert: Omit<AlertItem, 'id' | 'timestamp' | 'acknowledged'>) => void;
  resetStore: () => void;
}

// ─── Initial Seed Data ────────────────────────────────────────────────────────

export const INITIAL_BATCHES: Batch[] = [
  {
    mill_id: '0191ebc2-7b64-7930-9092-23c01fa91001',
    batch_code: 'AMUL-MS-2026-B108',
    feed_type: 'MAIZE_SILAGE',
    production_date: '2026-09-01',
    expiry_date: '2027-03-01',
    quantity_tonnes: 85.0,
    declared_profile: {
      crude_protein_pct_dm: 8.8,
      moisture_pct: 66.5,
      adf_pct_dm: 24.2,
      ndf_pct_dm: 44.5,
      crude_fat_pct_dm: 3.2,
      ash_pct_dm: 4.8,
      me_mj_kg_dm: 10.6,
      lab_report_url: 'https://cdn.aahar.ai/reports/nabl_amul_b108.pdf',
      lab_test_date: '2026-09-02',
    },
    qr_payload: 'aahar://batch/0191ebc2-7b64-7930-9092-23c01fa91001',
    qr_signed: 'ed25519:6a39b2e04e9c71a39fbc810427189c45b73f3608de120485a08ef48529cbba78',
    disputes: [],
    aggregate_stats: {
      test_count: 14,
      avg_cp_measured: 8.65,
      avg_deviation_cp: -1.7,
      dispute_count: 0,
      last_tested_at: '2026-09-17T14:30:00Z',
    },
  },
  {
    mill_id: '0191ebc2-7b64-7930-9092-23c01fa91002',
    batch_code: 'GAC-CSC-2026-09',
    feed_type: 'COTTONSEED_CAKE',
    production_date: '2026-09-05',
    expiry_date: '2026-12-05',
    quantity_tonnes: 40.0,
    declared_profile: {
      crude_protein_pct_dm: 24.5,
      moisture_pct: 8.0,
      adf_pct_dm: 28.0,
      ndf_pct_dm: 42.0,
      crude_fat_pct_dm: 7.5,
      ash_pct_dm: 6.2,
      me_mj_kg_dm: 11.2,
      lab_report_url: 'https://cdn.aahar.ai/reports/nabl_gac_09.pdf',
      lab_test_date: '2026-09-06',
    },
    qr_payload: 'aahar://batch/0191ebc2-7b64-7930-9092-23c01fa91002',
    qr_signed: 'ed25519:9f8e7d6c5b4a3928170e1f2d3c4b5a6978876a5b4c3d2e1f0a9b8c7d6e5f4a3b',
    disputes: [
      {
        id: '0191ebc2-7b64-7930-9092-d00100000001',
        measurement_id: '0191ebc2-7b64-7930-9092-m00100000001',
        farm_id: '0191ebc2-7b64-7930-9092-f00100000001',
        deviating_fields: [
          {
            field: 'crude_protein_pct_dm',
            declared: 24.5,
            measured: 20.8,
            deviation_pct: 15.1,
            tolerance_used: 5.0,
          },
        ],
        created_at: '2026-09-15T09:12:00Z',
        status: 'UNDER_REVIEW',
        fpo_note: 'Farmer Patel tested 3 sacks from lot 09. CP is 3.7% below guaranteed minimum (15.1% relative deficit). Mill rep notified.',
        resolved_at: null,
      },
    ],
    aggregate_stats: {
      test_count: 8,
      avg_cp_measured: 21.2,
      avg_deviation_cp: -13.4,
      dispute_count: 1,
      last_tested_at: '2026-09-17T11:20:00Z',
    },
  },
  {
    mill_id: '0191ebc2-7b64-7930-9092-23c01fa91003',
    batch_code: 'CARG-DSC-404',
    feed_type: 'CONCENTRATE_MIX',
    production_date: '2026-09-10',
    expiry_date: '2026-11-10',
    quantity_tonnes: 60.0,
    declared_profile: {
      crude_protein_pct_dm: 20.0,
      moisture_pct: 10.0,
      adf_pct_dm: 14.5,
      ndf_pct_dm: 32.0,
      crude_fat_pct_dm: 4.5,
      ash_pct_dm: 7.0,
      me_mj_kg_dm: 11.8,
      lab_report_url: 'https://cdn.aahar.ai/reports/nabl_carg_404.pdf',
      lab_test_date: '2026-09-11',
    },
    qr_payload: 'aahar://batch/0191ebc2-7b64-7930-9092-23c01fa91003',
    qr_signed: 'ed25519:112233445566778899aabbccddeeff00112233445566778899aabbccddeeff00',
    disputes: [],
    aggregate_stats: {
      test_count: 19,
      avg_cp_measured: 20.15,
      avg_deviation_cp: +0.75,
      dispute_count: 0,
      last_tested_at: '2026-09-18T08:45:00Z',
    },
  },
];

export const INITIAL_DISPUTES: DisputeRecord[] = [
  {
    id: '0191ebc2-7b64-7930-9092-d00100000001',
    batch_id: '0191ebc2-7b64-7930-9092-23c01fa91002',
    batch_code: 'GAC-CSC-2026-09',
    mill_name: 'Godrej Agrovet Forage Ltd',
    measurement_id: '0191ebc2-7b64-7930-9092-m00100000001',
    farm_id: '0191ebc2-7b64-7930-9092-f00100000001',
    farm_name: 'Patel Dairy & Breeding Farm (Anand)',
    deviating_fields: [
      {
        field: 'crude_protein_pct_dm',
        declared: 24.5,
        measured: 20.8,
        deviation_pct: 15.1,
        tolerance_used: 5.0,
      },
    ],
    created_at: '2026-09-15T09:12:00Z',
    status: 'UNDER_REVIEW',
    fpo_note: 'Farmer Patel tested 3 sacks from lot 09. CP is 3.7% below guaranteed minimum (15.1% relative deficit). Mill rep notified.',
    resolved_at: null,
  },
];

const INITIAL_BUNKER: BunkerTwinData = {
  id: '0191ebc2-7b64-7930-9092-b00100000001',
  farm_id: '0191ebc2-7b64-7930-9092-f00100000001',
  name: 'Bunker 1 — Main Corn Silage Stack',
  crop: 'MAIZE_SILAGE',
  pack_date: '2026-08-14',
  length_m: 24.0,
  width_m: 7.0,
  height_m: 3.2,
  density_kg_dm_m3: 235,
  face_sealed: false,
  probes: [
    {
      id: 'probe-01',
      lance_code: 'LANCE-01-A (Face)',
      x_m: 3.0,
      y_m: 3.5,
      ph: 4.65,
      moisture_pct: 68.2,
      co2_ppm: 19500,
      voc_ppb: 280,
      readings: [
        { depth_m: 0.2, temp_c: 38.4, status: 'critical' },
        { depth_m: 0.6, temp_c: 32.1, status: 'warning' },
        { depth_m: 1.0, temp_c: 24.8, status: 'optimal' },
        { depth_m: 1.5, temp_c: 21.3, status: 'optimal' },
      ],
    },
    {
      id: 'probe-02',
      lance_code: 'LANCE-02-B (Mid-Front)',
      x_m: 8.5,
      y_m: 2.2,
      ph: 4.15,
      moisture_pct: 66.8,
      co2_ppm: 15200,
      voc_ppb: 140,
      readings: [
        { depth_m: 0.2, temp_c: 27.5, status: 'optimal' },
        { depth_m: 0.6, temp_c: 24.2, status: 'optimal' },
        { depth_m: 1.0, temp_c: 22.0, status: 'optimal' },
        { depth_m: 1.5, temp_c: 20.8, status: 'optimal' },
      ],
    },
    {
      id: 'probe-03',
      lance_code: 'LANCE-03-C (Mid-Back)',
      x_m: 15.0,
      y_m: 4.8,
      ph: 3.88,
      moisture_pct: 65.4,
      co2_ppm: 13800,
      voc_ppb: 95,
      readings: [
        { depth_m: 0.2, temp_c: 23.8, status: 'optimal' },
        { depth_m: 0.6, temp_c: 22.4, status: 'optimal' },
        { depth_m: 1.0, temp_c: 21.1, status: 'optimal' },
        { depth_m: 1.5, temp_c: 20.2, status: 'optimal' },
      ],
    },
    {
      id: 'probe-04',
      lance_code: 'LANCE-04-D (Deep Rear)',
      x_m: 20.5,
      y_m: 3.5,
      ph: 3.82,
      moisture_pct: 65.0,
      co2_ppm: 12400,
      voc_ppb: 80,
      readings: [
        { depth_m: 0.2, temp_c: 22.1, status: 'optimal' },
        { depth_m: 0.6, temp_c: 21.0, status: 'optimal' },
        { depth_m: 1.0, temp_c: 20.5, status: 'optimal' },
        { depth_m: 1.5, temp_c: 19.8, status: 'optimal' },
      ],
    },
  ],
  spoilage_forecast: {
    front_velocity_m_per_day: 0.14,
    hours_to_critical: 48,
    dmi_loss_pct_forecast: 4.8,
    current_front_pos_m: 1.8,
    day_positions_m: [1.8, 2.05, 2.33, 2.65, 3.01, 3.42, 3.88, 4.38],
    recommended_feedout_rate_tonnes_per_day: 2.5,
    risk_level: 'HIGH',
  },
};

const INITIAL_SCANNERS: ScannerDevice[] = [
  {
    device_id: 'AAHAR-S-000101',
    operator_name: 'Ramesh Sharma (Field Vet)',
    village: 'Anand Central',
    lat: 22.5645,
    lng: 72.9289,
    battery_pct: 88,
    is_online: true,
    scans_today: 24,
    last_calibrated_at: '2026-09-18T07:15:00Z',
    firmware_version: 'v2.1.0-esp32s3',
  },
  {
    device_id: 'AAHAR-S-000102',
    operator_name: 'Dinesh Varma (Co-op Lead)',
    village: 'Mogri Circle',
    lat: 22.5321,
    lng: 72.9512,
    battery_pct: 42,
    is_online: true,
    scans_today: 18,
    last_calibrated_at: '2026-09-17T18:00:00Z',
    firmware_version: 'v2.1.0-esp32s3',
  },
  {
    device_id: 'AAHAR-S-000103',
    operator_name: 'Bhavna Ben (Dairy Extension)',
    village: 'Chikhodra',
    lat: 22.5891,
    lng: 73.0123,
    battery_pct: 19,
    is_online: true,
    scans_today: 31,
    last_calibrated_at: '2026-09-18T06:30:00Z',
    firmware_version: 'v2.0.8-esp32s3',
  },
  {
    device_id: 'AAHAR-S-000104',
    operator_name: 'Amit Patel (FPO Tech)',
    village: 'Bakrol',
    lat: 22.5482,
    lng: 72.9145,
    battery_pct: 95,
    is_online: false,
    scans_today: 0,
    last_calibrated_at: '2026-09-16T10:00:00Z',
    firmware_version: 'v2.1.0-esp32s3',
  },
];

const INITIAL_SUPPLIERS: SupplierScorecard[] = [
  {
    id: 'supp-01',
    name: 'Amul Cattle Feed Plant (Kanjari)',
    district: 'Kheda',
    tonnes_supplied: 1420,
    batches_count: 36,
    tests_performed: 312,
    avg_cp_deviation_pct: -0.8,
    adulteration_rate_pct: 0.0,
    dispute_count: 1,
    disputes_lost: 0,
    quality_score: 96,
    rating: 'TIER_1',
  },
  {
    id: 'supp-02',
    name: 'Cargill Dairy Nutrition India',
    district: 'Ahmedabad',
    tonnes_supplied: 890,
    batches_count: 22,
    tests_performed: 184,
    avg_cp_deviation_pct: +0.4,
    adulteration_rate_pct: 0.0,
    dispute_count: 0,
    disputes_lost: 0,
    quality_score: 94,
    rating: 'TIER_1',
  },
  {
    id: 'supp-03',
    name: 'Godrej Agrovet Forage Ltd',
    district: 'Vadodara',
    tonnes_supplied: 650,
    batches_count: 18,
    tests_performed: 142,
    avg_cp_deviation_pct: -4.2,
    adulteration_rate_pct: 2.1,
    dispute_count: 4,
    disputes_lost: 3,
    quality_score: 72,
    rating: 'TIER_2',
  },
  {
    id: 'supp-04',
    name: 'Shree Krishna Feed Traders',
    district: 'Anand',
    tonnes_supplied: 210,
    batches_count: 7,
    tests_performed: 48,
    avg_cp_deviation_pct: -9.8,
    adulteration_rate_pct: 8.3,
    dispute_count: 5,
    disputes_lost: 5,
    quality_score: 41,
    rating: 'FLAGGED',
  },
];

const INITIAL_MODELS: ModelMetric[] = [
  {
    id: 'model-cp',
    name: 'Crude Protein (CP)',
    unit: '% DM',
    rmsep: 0.42,
    target_rmsep: 0.60,
    r2: 0.942,
    ood_rate_pct: 1.8,
    drift_90d_pct: 0.5,
    last_evaluated: '2026-09-18T04:00:00Z',
    status: 'EXCELLENT',
  },
  {
    id: 'model-moisture',
    name: 'Moisture',
    unit: '%',
    rmsep: 0.68,
    target_rmsep: 1.00,
    r2: 0.961,
    ood_rate_pct: 1.2,
    drift_90d_pct: 0.3,
    last_evaluated: '2026-09-18T04:00:00Z',
    status: 'EXCELLENT',
  },
  {
    id: 'model-adf',
    name: 'Acid Detergent Fiber (ADF)',
    unit: '% DM',
    rmsep: 0.94,
    target_rmsep: 1.20,
    r2: 0.915,
    ood_rate_pct: 2.4,
    drift_90d_pct: 1.1,
    last_evaluated: '2026-09-18T04:00:00Z',
    status: 'GOOD',
  },
  {
    id: 'model-ndf',
    name: 'Neutral Detergent Fiber (NDF)',
    unit: '% DM',
    rmsep: 1.12,
    target_rmsep: 1.50,
    r2: 0.928,
    ood_rate_pct: 2.1,
    drift_90d_pct: 0.8,
    last_evaluated: '2026-09-18T04:00:00Z',
    status: 'GOOD',
  },
  {
    id: 'model-ash',
    name: 'Crude Ash',
    unit: '% DM',
    rmsep: 0.58,
    target_rmsep: 0.80,
    r2: 0.892,
    ood_rate_pct: 3.2,
    drift_90d_pct: 1.4,
    last_evaluated: '2026-09-18T04:00:00Z',
    status: 'GOOD',
  },
  {
    id: 'model-ph',
    name: 'Silage pH',
    unit: 'pH',
    rmsep: 0.12,
    target_rmsep: 0.20,
    r2: 0.954,
    ood_rate_pct: 0.9,
    drift_90d_pct: 0.2,
    last_evaluated: '2026-09-18T04:00:00Z',
    status: 'EXCELLENT',
  },
  {
    id: 'model-adulteration',
    name: 'Urea / Silica Adulteration',
    unit: 'Prob',
    rmsep: 0.04,
    target_rmsep: 0.08,
    r2: 0.985,
    ood_rate_pct: 0.4,
    drift_90d_pct: 0.1,
    last_evaluated: '2026-09-18T04:00:00Z',
    status: 'EXCELLENT',
  },
  {
    id: 'model-aflatoxin',
    name: 'Aflatoxin B1 Screening',
    unit: 'ppb',
    rmsep: 4.2,
    target_rmsep: 6.0,
    r2: 0.887,
    ood_rate_pct: 4.5,
    drift_90d_pct: 2.8,
    last_evaluated: '2026-09-18T04:00:00Z',
    status: 'GOOD',
  },
];

const INITIAL_ALERTS: AlertItem[] = [
  {
    id: 'alt-01',
    severity: 'CRITICAL',
    title: 'Aerobic Spoilage Imminent in Bunker 1',
    message: 'Face probe LANCE-01-A registered core temp 38.4°C and pH 4.65. Advancing front will penetrate 0.53m in 48h.',
    entity_type: 'BUNKER',
    entity_id: '0191ebc2-7b64-7930-9092-b00100000001',
    timestamp: '2026-09-18T11:15:00Z',
    acknowledged: false,
  },
  {
    id: 'alt-02',
    severity: 'CRITICAL',
    title: 'Formal Dispute Pending: GAC-CSC-2026-09',
    message: 'Farmer Patel recorded 20.8% CP vs 24.5% declared (15.1% deficit exceeding 5.0% tolerance). FPO review required.',
    entity_type: 'BATCH',
    entity_id: '0191ebc2-7b64-7930-9092-23c01fa91002',
    timestamp: '2026-09-15T09:12:00Z',
    acknowledged: false,
  },
  {
    id: 'alt-03',
    severity: 'WARNING',
    title: 'Scanner AAHAR-S-000103 Low Battery',
    message: 'Device battery at 19% with 14 scheduled scans remaining in Chikhodra society. Charge before afternoon shift.',
    entity_type: 'SCANNER',
    entity_id: 'AAHAR-S-000103',
    timestamp: '2026-09-18T10:45:00Z',
    acknowledged: false,
  },
];

export const INITIAL_SHIPMENTS: TrackingShipment[] = [
  {
    id: 'TRK-AAHAR-9021',
    batch_id: '0191ebc2-7b64-7930-9092-23c01fa91002',
    batch_code: 'GAC-CSC-2026-09',
    feed_type: 'COTTONSEED_CAKE',
    quantity_tonnes: 40.0,
    origin: 'Godrej Agrovet Forage Ltd (Vadodara)',
    destination: 'Patel Dairy & Breeding Farm (Anand Central)',
    status: 'IN_TRANSIT',
    transporter: 'Gujarat Agri Logistics Co-op',
    driver_name: 'Ranjit Singh',
    driver_phone: '+91 98251 44102',
    vehicle_no: 'GJ-07-AX-4821',
    speed_kmh: 54,
    cargo_temp_c: 4.2,
    ambient_humidity_pct: 58,
    battery_pct: 94,
    vibration_g: 0.12,
    total_distance_km: 42.6,
    distance_remaining_km: 15.3,
    eta_minutes: 24,
    progress_pct: 64,
    current_lat: 22.5645,
    current_lng: 72.9289,
    route_coords: [
      [22.518, 73.045],
      [22.534, 73.012],
      [22.551, 72.978],
      [22.5645, 72.9289],
      [22.578, 72.895],
      [22.592, 72.862],
    ],
    checkpoints: [
      {
        id: 'cp-01',
        name: 'Mill Gate Departure',
        location: 'Vadodara Forage Hub',
        timestamp: '08:30 AM',
        status: 'COMPLETED',
        verified: true,
      },
      {
        id: 'cp-02',
        name: 'Weighbridge & NIR Scan',
        location: 'National Highway 48 Checkpoint',
        timestamp: '09:15 AM',
        status: 'COMPLETED',
        scanner_id: 'AAHAR-S-000101',
        verified: true,
      },
      {
        id: 'cp-03',
        name: 'Charotar Milk Corridor',
        location: 'In-Transit (Sector 4)',
        timestamp: '10:04 AM',
        status: 'IN_PROGRESS',
        verified: true,
      },
      {
        id: 'cp-04',
        name: 'Anand FPO Buffer Depot',
        location: 'Amul Dairy Rd Gate 2',
        timestamp: 'ETA 10:45 AM',
        status: 'PENDING',
        verified: false,
      },
      {
        id: 'cp-05',
        name: 'Farmer Farm Delivery',
        location: 'Patel Dairy Cluster',
        timestamp: 'ETA 11:15 AM',
        status: 'PENDING',
        verified: false,
      },
    ],
    last_ping: 'Just now (12s ago)',
  },
  {
    id: 'TRK-AAHAR-8842',
    batch_id: '0191ebc2-7b64-7930-9092-23c01fa91001',
    batch_code: 'AMUL-MS-2026-B108',
    feed_type: 'MAIZE_SILAGE',
    quantity_tonnes: 85.0,
    origin: 'Amul Cattle Feed Plant (Kanjari)',
    destination: 'Chikhodra Dairy Society Depot',
    status: 'AT_CHECKPOINT',
    transporter: 'Amul Cold-Chain Logistics',
    driver_name: 'Mahesh Solanki',
    driver_phone: '+91 97240 88219',
    vehicle_no: 'GJ-23-CD-8910',
    speed_kmh: 0,
    cargo_temp_c: 19.8,
    ambient_humidity_pct: 66,
    battery_pct: 82,
    vibration_g: 0.05,
    total_distance_km: 28.5,
    distance_remaining_km: 12.0,
    eta_minutes: 38,
    progress_pct: 58,
    current_lat: 22.5891,
    current_lng: 73.0123,
    route_coords: [
      [22.612, 73.055],
      [22.598, 73.032],
      [22.5891, 73.0123],
      [22.575, 72.980],
    ],
    checkpoints: [
      {
        id: 'cp-11',
        name: 'Feed Plant Departure',
        location: 'Kanjari Processing Plant',
        timestamp: '09:00 AM',
        status: 'COMPLETED',
        verified: true,
      },
      {
        id: 'cp-12',
        name: 'Moisture Compliance Scan',
        location: 'Chikhodra Rapid Lab',
        timestamp: '09:50 AM',
        status: 'IN_PROGRESS',
        scanner_id: 'AAHAR-S-000103',
        verified: true,
      },
      {
        id: 'cp-13',
        name: 'Society Silage Bunker Delivery',
        location: 'Chikhodra Union Bunker',
        timestamp: 'ETA 10:35 AM',
        status: 'PENDING',
        verified: false,
      },
    ],
    last_ping: '1 min ago',
  },
  {
    id: 'TRK-AAHAR-7719',
    batch_id: '0191ebc2-7b64-7930-9092-23c01fa91003',
    batch_code: 'CARG-DSC-404',
    feed_type: 'CONCENTRATE_MIX',
    quantity_tonnes: 60.0,
    origin: 'Cargill Dairy Nutrition (Ahmedabad)',
    destination: 'Mogri Co-operative Storage',
    status: 'DELIVERED',
    transporter: 'Express Agri Freight',
    driver_name: 'Kiran Varma',
    driver_phone: '+91 94280 11920',
    vehicle_no: 'GJ-01-EF-3321',
    speed_kmh: 0,
    cargo_temp_c: 18.2,
    ambient_humidity_pct: 52,
    battery_pct: 98,
    vibration_g: 0.0,
    total_distance_km: 68.0,
    distance_remaining_km: 0,
    eta_minutes: 0,
    progress_pct: 100,
    current_lat: 22.5321,
    current_lng: 72.9512,
    route_coords: [
      [22.780, 72.650],
      [22.650, 72.820],
      [22.550, 72.930],
      [22.5321, 72.9512],
    ],
    checkpoints: [
      {
        id: 'cp-21',
        name: 'Dispatched Ahmedabad',
        location: 'Cargill Plant Terminal',
        timestamp: '06:15 AM',
        status: 'COMPLETED',
        verified: true,
      },
      {
        id: 'cp-22',
        name: 'Highway Weighing & NIR Screening',
        location: 'Nadiad Toll Gate',
        timestamp: '07:30 AM',
        status: 'COMPLETED',
        verified: true,
      },
      {
        id: 'cp-23',
        name: 'Delivered & Handover Confirmed',
        location: 'Mogri Co-op Hub',
        timestamp: '08:45 AM',
        status: 'COMPLETED',
        scanner_id: 'AAHAR-S-000102',
        verified: true,
      },
    ],
    last_ping: 'Delivered at 08:45 AM',
  },
];

// ─── Store Definition ─────────────────────────────────────────────────────────

export const useDashboardStore = create<DashboardState>((set, get) => ({
  activeTab: 'traceability',
  setActiveTab: (tab) => set({ activeTab: tab, mobileMenuOpen: false }),

  mobileMenuOpen: false,
  setMobileMenuOpen: (open) => set({ mobileMenuOpen: open }),

  searchQuery: '',
  setSearchQuery: (q) => set({ searchQuery: q }),

  batches: INITIAL_BATCHES,
  selectedBatchId: INITIAL_BATCHES[1].mill_id,
  setSelectedBatchId: (id) => set({ selectedBatchId: id }),

  shipments: INITIAL_SHIPMENTS,
  selectedShipmentId: INITIAL_SHIPMENTS[0].id,
  setSelectedShipmentId: (id) => set({ selectedShipmentId: id }),

  disputes: INITIAL_DISPUTES,
  selectedDisputeId: INITIAL_DISPUTES[0].id,
  setSelectedDisputeId: (id) => set({ selectedDisputeId: id }),

  bunker: INITIAL_BUNKER,
  bunkerScrubDay: 0,
  setBunkerScrubDay: (day) => set({ bunkerScrubDay: Math.max(0, Math.min(7, day)) }),

  scanners: INITIAL_SCANNERS,
  suppliers: INITIAL_SUPPLIERS,
  models: INITIAL_MODELS,
  alerts: INITIAL_ALERTS,

  registerBatch: (input) => {
    const newId = '0191ebc2-7b64-7930-9092-' + Math.random().toString(16).substring(2, 14);
    const newBatch: Batch = {
      mill_id: newId,
      batch_code: input.batch_code,
      feed_type: input.feed_type,
      production_date: input.production_date,
      expiry_date: input.expiry_date ?? null,
      quantity_tonnes: input.quantity_tonnes ?? null,
      declared_profile: {
        crude_protein_pct_dm: input.declared_profile.crude_protein_pct_dm,
        moisture_pct: input.declared_profile.moisture_pct,
        adf_pct_dm: input.declared_profile.adf_pct_dm ?? null,
        ndf_pct_dm: input.declared_profile.ndf_pct_dm ?? null,
        crude_fat_pct_dm: input.declared_profile.crude_fat_pct_dm ?? null,
        ash_pct_dm: input.declared_profile.ash_pct_dm ?? null,
        me_mj_kg_dm: input.declared_profile.me_mj_kg_dm ?? null,
        lab_report_url: null,
        lab_test_date: input.production_date,
      },
      qr_payload: `aahar://batch/${newId}`,
      // Was: `ed25519:${64 random hex chars}` -- a fabricated signature on a
      // traceability artifact, displayed in the UI as 'Ed25519 Verified'.
      // Signing is a server-side operation with a key the browser must never
      // hold. Until POST /batches returns a real signature, this is null and
      // the UI must render the batch as UNSIGNED.
      qr_signed: undefined,
      disputes: [],
      aggregate_stats: {
        test_count: 0,
        avg_cp_measured: null,
        avg_deviation_cp: null,
        dispute_count: 0,
        last_tested_at: null,
      },
    };

    set((state) => ({
      batches: [newBatch, ...state.batches],
      selectedBatchId: newId,
    }));

    return newBatch;
  },

  evaluateTestAgainstBatch: (batchId, measured) => {
    const batch = get().batches.find((b) => b.mill_id === batchId);
    if (!batch) {
      return { isBreach: false, deviatingFields: [], summary: 'Batch not found' };
    }

    const deviatingFields: DeviatingField[] = [];
    const declared = batch.declared_profile;

    // 1. Check Crude Protein (relative tolerance 5.0%)
    const cpTolerancePct = 5.0;
    const cpDeviationPct = ((declared.crude_protein_pct_dm - measured.crude_protein_pct_dm) / declared.crude_protein_pct_dm) * 100;
    if (cpDeviationPct > cpTolerancePct) {
      deviatingFields.push({
        field: 'crude_protein_pct_dm',
        declared: declared.crude_protein_pct_dm,
        measured: measured.crude_protein_pct_dm,
        deviation_pct: Number(cpDeviationPct.toFixed(1)),
        tolerance_used: cpTolerancePct,
      });
    }

    // 2. Check Moisture (relative tolerance 7.0% if moisture is higher than declared)
    const moistureTolerancePct = 7.0;
    const moistureDeviationPct = ((measured.moisture_pct - declared.moisture_pct) / declared.moisture_pct) * 100;
    if (moistureDeviationPct > moistureTolerancePct) {
      deviatingFields.push({
        field: 'moisture_pct',
        declared: declared.moisture_pct,
        measured: measured.moisture_pct,
        deviation_pct: Number(moistureDeviationPct.toFixed(1)),
        tolerance_used: moistureTolerancePct,
      });
    }

    // 3. Check Adulterants
    if (measured.urea_detected) {
      deviatingFields.push({
        field: 'adulterant_urea',
        declared: 0,
        measured: 1,
        deviation_pct: 100,
        tolerance_used: 0,
      });
    }
    if (measured.silica_detected) {
      deviatingFields.push({
        field: 'adulterant_silica',
        declared: 0,
        measured: 1,
        deviation_pct: 100,
        tolerance_used: 0,
      });
    }
    if (measured.melamine_detected) {
      deviatingFields.push({
        field: 'adulterant_melamine',
        declared: 0,
        measured: 1,
        deviation_pct: 100,
        tolerance_used: 0,
      });
    }

    const isBreach = deviatingFields.length > 0;
    const summary = isBreach
      ? `Tolerance Breach Detected! ${deviatingFields.map((d) => `${d.field}: measured ${d.measured} vs declared ${d.declared} (${d.deviation_pct}% diff)`).join(', ')}`
      : `Test passed within tolerances. Measured CP ${measured.crude_protein_pct_dm}% vs declared ${declared.crude_protein_pct_dm}%.`;

    return { isBreach, deviatingFields, summary };
  },

  createDispute: (batchId, measurementId, farmId, farmName, deviatingFields, fpoNote) => {
    const batch = get().batches.find((b) => b.mill_id === batchId);
    const disputeId = '0191ebc2-7b64-7930-9092-' + Math.random().toString(16).substring(2, 14);

    const newDispute: DisputeRecord = {
      id: disputeId,
      batch_id: batchId,
      batch_code: batch?.batch_code ?? 'UNKNOWN-BATCH',
      mill_name: 'Registered Mill',
      measurement_id: measurementId,
      farm_id: farmId,
      farm_name: farmName,
      deviating_fields: deviatingFields,
      created_at: new Date().toISOString(),
      status: 'OPEN',
      fpo_note: fpoNote ?? 'Dispute automatically filed via NIR tolerance breach detection.',
      resolved_at: null,
    };

    set((state) => {
      const updatedBatches = state.batches.map((b) => {
        if (b.mill_id === batchId) {
          const prevDisputes = b.disputes ?? [];
          const currentCount = (b.aggregate_stats?.dispute_count ?? 0) + 1;
          return {
            ...b,
            disputes: [
              ...prevDisputes,
              {
                id: disputeId,
                measurement_id: measurementId,
                farm_id: farmId,
                deviating_fields: deviatingFields,
                created_at: newDispute.created_at,
                status: 'OPEN' as const,
                fpo_note: newDispute.fpo_note,
                resolved_at: null,
              },
            ],
            aggregate_stats: {
              ...b.aggregate_stats,
              dispute_count: currentCount,
            },
          };
        }
        return b;
      });

      const newAlert: AlertItem = {
        id: 'alt-' + Math.random().toString(16).substring(2, 8),
        severity: 'CRITICAL',
        title: `New Dispute Opened: ${batch?.batch_code ?? batchId}`,
        message: `Farmer ${farmName} recorded tolerance breach on ${deviatingFields.map((d) => d.field).join(', ')}.`,
        entity_type: 'BATCH',
        entity_id: batchId,
        timestamp: newDispute.created_at,
        acknowledged: false,
      };

      return {
        batches: updatedBatches,
        disputes: [newDispute, ...state.disputes],
        selectedDisputeId: disputeId,
        alerts: [newAlert, ...state.alerts],
      };
    });

    return newDispute;
  },

  updateDisputeStatus: (disputeId, status, fpoNote) => {
    set((state) => {
      const resolvedAt = status.startsWith('RESOLVED') ? new Date().toISOString() : null;

      const updatedDisputes = state.disputes.map((d) => {
        if (d.id === disputeId) {
          return {
            ...d,
            status,
            fpo_note: fpoNote !== undefined ? fpoNote : d.fpo_note,
            resolved_at: resolvedAt ?? d.resolved_at,
          };
        }
        return d;
      });

      const updatedBatches = state.batches.map((b) => {
        if (b.disputes && b.disputes.some((d) => d.id === disputeId)) {
          return {
            ...b,
            disputes: b.disputes.map((d) => {
              if (d.id === disputeId) {
                return {
                  ...d,
                  status,
                  fpo_note: fpoNote !== undefined ? fpoNote : d.fpo_note,
                  resolved_at: resolvedAt ?? d.resolved_at,
                };
              }
              return d;
            }),
          };
        }
        return b;
      });

      return {
        disputes: updatedDisputes,
        batches: updatedBatches,
      };
    });
  },

  acknowledgeAlert: (alertId) => {
    set((state) => ({
      alerts: state.alerts.map((a) => (a.id === alertId ? { ...a, acknowledged: true } : a)),
    }));
  },

  triggerLiveAlert: (alert) => {
    const newAlert: AlertItem = {
      ...alert,
      id: 'alt-' + Math.random().toString(16).substring(2, 8),
      timestamp: new Date().toISOString(),
      acknowledged: false,
    };
    set((state) => ({ alerts: [newAlert, ...state.alerts] }));
  },

  userProfile: {
    id: 'usr_lead_patel_04',
    fullName: 'Dr. Rajesh K. Patel',
    designation: 'Senior Quality Auditor & Traceability Officer',
    department: 'Quality Assurance & Agronomic Operations',
    email: 'r.patel@amul.coop',
    phone: '+91 98250 14892',
    organization: "Amul District Co-operative Milk Producers' Union Ltd.",
    fpoCode: 'FPO-AMUL-04',
    district: 'Anand',
    zone: 'Charotar Milk Shed (Zone 4)',
    assignedScanners: ['AAHAR-S-000101', 'AAHAR-S-000102', 'AAHAR-S-000104'],
    permissions: [
      'batch:verify_certificate',
      'dispute:arbitrate',
      'silage:sensor_ingest',
      'model:eval_telemetry',
      'audit:export_compliance',
      'scanner:calibrate_zero',
    ],
    lastLogin: '2026-09-18T08:30:00Z',
    sessionId: 'aahar-sess-049f82d1',
  },

  updateUserProfile: (profileUpdates) => {
    set((state) => {
      const updated = { ...state.userProfile, ...profileUpdates };
      try {
        localStorage.setItem('aahar_user_profile', JSON.stringify(updated));
      } catch {}
      return { userProfile: updated };
    });
  },

  systemSettings: {
    apiBaseUrl: '/api',
    wsAlertsUrl: '/ws/alerts',
    telemetryIntervalSec: 10,
    autoRefresh: true,
    tempThresholdC: 38.0,
    cpTolerancePct: 2.0,
    moistureWarningPct: 12.0,
    oodMahalanobisThreshold: 12.5,
    enableSoundAlerts: false,
    apiKey: 'aahar_live_sec_f81d4fae7dec4bc6abebd1',
    auditLogging: true,
  },

  updateSystemSettings: (settingUpdates) => {
    set((state) => {
      const updated = { ...state.systemSettings, ...settingUpdates };
      try {
        localStorage.setItem('aahar_system_settings', JSON.stringify(updated));
        if (settingUpdates.apiBaseUrl !== undefined) {
          localStorage.setItem('aahar_api_base_url', settingUpdates.apiBaseUrl);
        }
      } catch {}
      return { systemSettings: updated };
    });
  },

  generateApiKey: () => {
    let key = 'aahar_live_';
    if (typeof window !== 'undefined' && window.crypto?.getRandomValues) {
      const arr = new Uint8Array(16);
      window.crypto.getRandomValues(arr);
      key += Array.from(arr, (b) => b.toString(16).padStart(2, '0')).join('');
    } else {
      key += Math.random().toString(36).substring(2) + Math.random().toString(36).substring(2);
    }
    get().updateSystemSettings({ apiKey: key });
    return key;
  },

  resetSettingsToDefault: () => {
    try {
      localStorage.removeItem('aahar_system_settings');
      localStorage.removeItem('aahar_api_base_url');
    } catch {}
    set({
      systemSettings: {
        apiBaseUrl: '/api',
        wsAlertsUrl: '/ws/alerts',
        telemetryIntervalSec: 10,
        autoRefresh: true,
        tempThresholdC: 38.0,
        cpTolerancePct: 2.0,
        moistureWarningPct: 12.0,
        oodMahalanobisThreshold: 12.5,
        enableSoundAlerts: false,
        apiKey: 'aahar_live_sec_f81d4fae7dec4bc6abebd1',
        auditLogging: true,
      },
    });
  },

  resetStore: () => {
    set({
      mobileMenuOpen: false,
      searchQuery: '',
      batches: JSON.parse(JSON.stringify(INITIAL_BATCHES)),
      selectedBatchId: INITIAL_BATCHES[1].mill_id,
      shipments: JSON.parse(JSON.stringify(INITIAL_SHIPMENTS)),
      selectedShipmentId: INITIAL_SHIPMENTS[0].id,
      disputes: JSON.parse(JSON.stringify(INITIAL_DISPUTES)),
      selectedDisputeId: INITIAL_DISPUTES[0].id,
      bunker: JSON.parse(JSON.stringify(INITIAL_BUNKER)),
      bunkerScrubDay: 0,
      scanners: JSON.parse(JSON.stringify(INITIAL_SCANNERS)),
      suppliers: JSON.parse(JSON.stringify(INITIAL_SUPPLIERS)),
      models: JSON.parse(JSON.stringify(INITIAL_MODELS)),
      alerts: JSON.parse(JSON.stringify(INITIAL_ALERTS)),
    });
  },
}));
