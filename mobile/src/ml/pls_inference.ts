/**
 * AAHAR Mobile — PLS-R Inference Engine (TypeScript)
 * Pure typed-array implementation of PLS-R.
 * Runs fully offline, no native binaries.
 */

export interface PLSCoefficients {
  x_rotations: number[][];   // (n_bands, n_lv)
  y_loadings: number[][];    // (n_lv, n_outputs)
  x_mean: number[];          // (n_bands,)
  x_std: number[];           // (n_bands,)  — 1.0 if no scaling
  y_mean: number[];          // (n_outputs,)
}

/**
 * Matrix multiply A (m×k) × B (k×n) → (m×n).
 * Row-major flat arrays.
 */
function matmul(
  A: number[], m: number, k: number,
  B: number[], n: number,
): number[] {
  const C = new Array<number>(m * n).fill(0);
  for (let i = 0; i < m; i++) {
    for (let j = 0; j < n; j++) {
      let sum = 0;
      for (let p = 0; p < k; p++) {
        sum += A[i * k + p] * B[p * n + j];
      }
      C[i * n + j] = sum;
    }
  }
  return C;
}

export class PLSInferenceEngine {
  private readonly coeffs: PLSCoefficients;
  private readonly nBands: number;
  private readonly nLV: number;
  private readonly nOutputs: number;

  // Flat (row-major) rotation matrix (n_bands × n_lv)
  private readonly xRot: Float64Array;
  // Flat (row-major) y_loadings matrix (n_lv × n_outputs)
  private readonly yLoad: Float64Array;

  constructor(coeffs: PLSCoefficients) {
    this.coeffs = coeffs;
    this.nBands   = coeffs.x_rotations.length;
    this.nLV      = coeffs.x_rotations[0]?.length ?? 0;
    this.nOutputs = coeffs.y_loadings[0]?.length ?? 0;

    // Flatten matrices
    this.xRot = new Float64Array(this.nBands * this.nLV);
    for (let i = 0; i < this.nBands; i++)
      for (let j = 0; j < this.nLV; j++)
        this.xRot[i * this.nLV + j] = coeffs.x_rotations[i][j];

    this.yLoad = new Float64Array(this.nLV * this.nOutputs);
    for (let i = 0; i < this.nLV; i++)
      for (let j = 0; j < this.nOutputs; j++)
        this.yLoad[i * this.nOutputs + j] = coeffs.y_loadings[i][j];
  }

  /**
   * Run PLS-R inference on a single preprocessed spectrum.
   * @param spectrum Float64Array of length nBands (SNV + 1st derivative)
   * @returns Float64Array of length nOutputs (proximate values)
   */
  predict(spectrum: Float64Array): Float64Array {
    const { x_mean, x_std, y_mean } = this.coeffs;

    // 1. Centre & scale
    const xc = new Float64Array(this.nBands);
    for (let i = 0; i < this.nBands; i++) {
      xc[i] = (spectrum[i] - (x_mean[i] ?? 0.0)) / (x_std[i] ?? 1.0);
    }

    // 2. Project to latent space: scores = xc @ xRot  (1 × nBands) @ (nBands × nLV)
    const scores = new Float64Array(this.nLV);
    for (let j = 0; j < this.nLV; j++) {
      let s = 0.0;
      for (let i = 0; i < this.nBands; i++) {
        s += xc[i] * this.xRot[i * this.nLV + j];
      }
      scores[j] = s;
    }

    // 3. Back-project to outputs: y = scores @ yLoad + y_mean
    const out = new Float64Array(this.nOutputs);
    for (let k = 0; k < this.nOutputs; k++) {
      let val = y_mean[k] ?? 0.0;
      for (let j = 0; j < this.nLV; j++) {
        val += scores[j] * this.yLoad[j * this.nOutputs + k];
      }
      out[k] = val;
    }
    return out;
  }

  /**
   * Estimate 95% confidence interval via bootstrap residual.
   * Returns half-width of CI per output.
   * Uses pre-computed calibration uncertainty factors from training.
   */
  confidenceHalfWidth(output_idx: number): number {
    // Conservative estimate: 1.96 × RMSECV from Table 4.1
    const RMSECV = [1.4, 1.1, 2.0, 2.5, 0.7, 1.0, 0.55];
    return 1.96 * (RMSECV[output_idx] ?? 1.5);
  }
}

export type ProximateKey =
  | 'crude_protein_pct_dm'
  | 'moisture_pct'
  | 'adf_pct_dm'
  | 'ndf_pct_dm'
  | 'crude_fat_pct_dm'
  | 'ash_pct_dm'
  | 'me_mj_kg_dm';

// ─── Output keys (mirror Python PROXIMATE_KEYS) ───────────────────────────
export const PROXIMATE_KEYS: ProximateKey[] = [
  'crude_protein_pct_dm',
  'moisture_pct',
  'adf_pct_dm',
  'ndf_pct_dm',
  'crude_fat_pct_dm',
  'ash_pct_dm',
  'me_mj_kg_dm',
];
