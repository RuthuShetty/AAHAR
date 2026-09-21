/**
 * AAHAR Mobile — On-Device Inference Engine
 * Orchestrates: Preprocessing → PLS-R → Adulterant classification → OOD check
 * Returns: InferenceResult with CIs, in_distribution flag, advisory tier.
 * Runs 100% offline. Network not touched.
 */

import { preprocess } from './preprocessing';
import { PLSInferenceEngine, PROXIMATE_KEYS, type PLSCoefficients } from './pls_inference';
import { MahalanobisOOD, type MahalanobisState } from './ood_detector';
import { AdulterantClassifier, type AdulterantWeights } from './adulterant_classifier';
import THRESHOLDS from '../../assets/ml/thresholds.json';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface ProximateValues {
  crude_protein_pct_dm: number;
  moisture_pct: number;
  adf_pct_dm: number;
  ndf_pct_dm: number;
  crude_fat_pct_dm: number;
  ash_pct_dm: number;
  me_mj_kg_dm: number;
}

export interface PredictionBand<T = number> {
  value: T;
  ci_low: T;
  ci_high: T;
  confidence: number;    // 0.0–1.0
  in_distribution: boolean;
}

export interface AdulterantResult {
  urea:    PredictionBand<boolean>;
  silica:  PredictionBand<boolean>;
  melamine: PredictionBand<boolean>;
  anomaly_score: number;    // reconstruction error (unitless)
  any_detected: boolean;
}

export interface InferenceResult {
  proximates: { [K in keyof ProximateValues]: PredictionBand<number> };
  adulteration: AdulterantResult;
  ood_distance: number;       // Mahalanobis distance
  in_distribution: boolean;
  feed_type_hint?: string;
  inference_ms: number;
  model_version: string;
}

// ─── Model bundle (loaded from assets at startup) ────────────────────────────
export interface ModelBundle {
  plsCoefficients: PLSCoefficients;
  oodState: MahalanobisState;
  adulterantWeights: AdulterantWeights;
}

// ─── Engine ─────────────────────────────────────────────────────────────────

export class InferenceEngine {
  private pls: PLSInferenceEngine;
  private ood: MahalanobisOOD;
  private adulterant: AdulterantClassifier;

  static readonly MODEL_VERSION = '1.0.0';

  constructor(bundle: ModelBundle) {
    this.pls        = new PLSInferenceEngine(bundle.plsCoefficients);
    this.ood        = new MahalanobisOOD(bundle.oodState);
    this.adulterant = new AdulterantClassifier(bundle.adulterantWeights);
  }

  /**
   * Run full inference pipeline on raw NIR sensor counts.
   *
   * @param rawCounts Float64Array of 228 raw sensor counts
   * @returns InferenceResult with all predictions, CIs, OOD flag
   */
  infer(rawCounts: Float64Array): InferenceResult {
    const t0 = Date.now();

    // 1. Preprocess
    const spectrum = preprocess(rawCounts);

    // 2. OOD detection (Mahalanobis)
    const { distance: oodDist, inDistribution } = this.ood.predict(spectrum);

    // 3. Proximate prediction via PLS-R
    const rawProx = this.pls.predict(spectrum);
    const proximates = {} as InferenceResult['proximates'];

    PROXIMATE_KEYS.forEach((key, idx) => {
      const val = rawProx[idx] ?? 0.0;
      const hw  = this.pls.confidenceHalfWidth(idx);
      // Widen CI if OOD
      const oodPenalty = inDistribution ? 1.0 : 2.5;
      proximates[key] = {
        value:           roundTo(val, 2),
        ci_low:          roundTo(val - hw * oodPenalty, 2),
        ci_high:         roundTo(val + hw * oodPenalty, 2),
        confidence:      inDistribution ? 0.88 : 0.45,
        in_distribution: inDistribution,
      };
    });

    // 4. Adulterant classification (shallow linear probe — native TS)
    const adulterationRaw = this.adulterant.predict(spectrum);
    const thresholds = (THRESHOLDS as any).adulteration;
    const adulteration: AdulterantResult = {
      urea: {
        value:           adulterationRaw.urea > thresholds.urea_prob_threshold,
        ci_low:          adulterationRaw.urea - 0.08 > thresholds.urea_prob_threshold,
        ci_high:         adulterationRaw.urea + 0.08 > thresholds.urea_prob_threshold,
        confidence:      inDistribution ? 0.91 : 0.55,
        in_distribution: inDistribution,
      },
      silica: {
        value:           adulterationRaw.silica > thresholds.silica_prob_threshold,
        ci_low:          adulterationRaw.silica - 0.09 > thresholds.silica_prob_threshold,
        ci_high:         adulterationRaw.silica + 0.09 > thresholds.silica_prob_threshold,
        confidence:      inDistribution ? 0.89 : 0.55,
        in_distribution: inDistribution,
      },
      melamine: {
        value:           adulterationRaw.melamine > thresholds.melamine_prob_threshold,
        ci_low:          adulterationRaw.melamine - 0.10 > thresholds.melamine_prob_threshold,
        ci_high:         adulterationRaw.melamine + 0.10 > thresholds.melamine_prob_threshold,
        confidence:      inDistribution ? 0.87 : 0.50,
        in_distribution: inDistribution,
      },
      anomaly_score:  adulterationRaw.anomaly_score,
      any_detected:
        adulterationRaw.urea    > thresholds.urea_prob_threshold ||
        adulterationRaw.silica  > thresholds.silica_prob_threshold ||
        adulterationRaw.melamine > thresholds.melamine_prob_threshold ||
        adulterationRaw.anomaly_score > thresholds.anomaly_recon_error_threshold,
    };

    return {
      proximates,
      adulteration,
      ood_distance:    roundTo(oodDist, 4),
      in_distribution: inDistribution,
      inference_ms:    Date.now() - t0,
      model_version:   InferenceEngine.MODEL_VERSION,
    };
  }
}

// ─── Helpers ────────────────────────────────────────────────────────────────
function roundTo(n: number, decimals: number): number {
  const factor = Math.pow(10, decimals);
  return Math.round(n * factor) / factor;
}
