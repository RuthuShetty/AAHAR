/**
 * AAHAR Mobile — Spectral Preprocessing (TypeScript)
 * Mirror of ml/pipelines/preprocessing.py running on-device via typed arrays.
 * Zero external dependencies — works fully offline.
 */

// ─── Constants ─────────────────────────────────────────────────────────────
const WHITE_REF = 58000.0;
const DARK_REF  = 120.0;

/**
 * Convert raw NIR sensor counts to absorbance values.
 * A = log10(white_ref / (I - dark_ref))
 */
export function rawToAbsorbance(counts: Float64Array): Float64Array {
  const out = new Float64Array(counts.length);
  for (let i = 0; i < counts.length; i++) {
    const I = Math.max(counts[i] - DARK_REF, 0.1);
    out[i] = Math.log10(WHITE_REF / I);
  }
  return out;
}

/**
 * Standard Normal Variate (SNV) correction.
 * Transforms a single spectrum to mean=0, std=1.
 */
export function snv(spectrum: Float64Array): Float64Array {
  const n = spectrum.length;
  let sum = 0.0;
  for (let i = 0; i < n; i++) sum += spectrum[i];
  const mean = sum / n;
  let ss = 0.0;
  for (let i = 0; i < n; i++) ss += (spectrum[i] - mean) ** 2;
  const std = Math.sqrt(ss / Math.max(n - 1, 1));
  const out = new Float64Array(n);
  const divisor = std < 1e-8 ? 1.0 : std;
  for (let i = 0; i < n; i++) out[i] = (spectrum[i] - mean) / divisor;
  return out;
}

/**
 * Savitzky-Golay filter coefficients for window=11, poly=2, 1st derivative.
 * Pre-computed to avoid polynomial fitting at inference time.
 * Reference: scipy.signal.savgol_coeffs(11, 2, deriv=1)
 */
export const SG_COEFFS_11_2_DERIV1: Float64Array = (() => {
  // Coefficients from scipy.signal.savgol_coeffs(11, 2, deriv=1, use='dot')
  // Normalised by delta (assume unit wavenumber spacing = 1)
  const raw = [
    -5.0, -4.0, -3.0, -2.0, -1.0, 0.0, 1.0, 2.0, 3.0, 4.0, 5.0,
  ];
  // Normalisation factor: sum(c_i * i) ... for unit spacing use 1/110
  const norm = 110.0;
  return new Float64Array(raw.map(v => v / norm));
})();

/**
 * Apply Savitzky-Golay 1st derivative smoothing.
 * Window=11, poly=2 — matches Python pipeline exactly.
 * Edge points are handled with reflection padding.
 */
export function savgolDeriv1(spectrum: Float64Array): Float64Array {
  const n = spectrum.length;
  const half = 5;  // (11 - 1) / 2
  const out = new Float64Array(n);
  const c = SG_COEFFS_11_2_DERIV1;

  for (let i = 0; i < n; i++) {
    let val = 0.0;
    for (let j = -half; j <= half; j++) {
      // Reflection padding at edges
      let idx = i + j;
      if (idx < 0) idx = -idx;
      if (idx >= n) idx = 2 * (n - 1) - idx;
      idx = Math.max(0, Math.min(n - 1, idx));
      val += c[j + half] * spectrum[idx];
    }
    out[i] = val;
  }
  return out;
}

/**
 * Full preprocessing chain: raw counts → SNV → Savitzky-Golay 1st derivative.
 * This mirrors ml/pipelines/preprocessing.py::preprocess() exactly.
 *
 * @param counts - Raw sensor counts (Float64Array of length n_bands)
 * @returns Preprocessed spectrum ready for model inference
 */
export function preprocess(counts: Float64Array): Float64Array {
  const absorbance = rawToAbsorbance(counts);
  const snvCorr    = snv(absorbance);
  const deriv      = savgolDeriv1(snvCorr);
  return deriv;
}

/**
 * Batch preprocessing — processes multiple spectra.
 * Input:  flat Float32Array of length N * B (row-major)
 * Output: flat Float32Array of length N * B (row-major)
 */
export function preprocessBatch(flat: Float32Array, nBands: number): Float32Array {
  const n = flat.length / nBands;
  const out = new Float32Array(flat.length);
  for (let i = 0; i < n; i++) {
    const raw64 = new Float64Array(nBands);
    for (let b = 0; b < nBands; b++) raw64[b] = flat[i * nBands + b];
    const proc = preprocess(raw64);
    for (let b = 0; b < nBands; b++) out[i * nBands + b] = proc[b];
  }
  return out;
}
