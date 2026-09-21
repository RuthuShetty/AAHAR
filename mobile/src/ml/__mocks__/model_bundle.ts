/**
 * AAHAR Mobile — SYNTHETIC model bundle. TEST FIXTURE ONLY.
 *
 * CORRECTION: the previous header claimed these weights were "derived from
 * analytical physics of NIR spectra" and that the file "ships in the app
 * bundle". Neither was true, and the claim was dangerous.
 *
 * Every coefficient below is Gaussian noise: mulberry32(0xDEADBEEF) passed
 * through a Box-Muller transform. There is no spectroscopy in it. Predictions
 * made with this bundle are random numbers with units attached.
 *
 * It is retained ONLY to exercise the shape of the inference pipeline in unit
 * tests. It must never be installed via installModelBundle() -- that function
 * requires a verified signature and training provenance, which synthetic
 * weights cannot have.
 */

import type { ModelBundle } from '../inference_engine';
import type { PLSCoefficients } from '../pls_inference';
import type { MahalanobisState } from '../ood_detector';
import type { AdulterantWeights } from '../adulterant_classifier';

const N_BANDS = 228;
const N_LV    = 12;
const N_OUT   = 7;
const N_COMP  = 20;

// ─── Deterministic seeded RNG (Mulberry32) ────────────────────────────────
function mulberry32(seed: number) {
  return function () {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = t + Math.imul(t ^ (t >>> 7), 61 | t) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function normalRng(rng: () => number) {
  return () => {
    // Box-Muller
    const u = rng(), v = rng();
    return Math.sqrt(-2 * Math.log(u + 1e-12)) * Math.cos(2 * Math.PI * v);
  };
}

// ─── Build PLS Coefficients ────────────────────────────────────────────────
function buildPLSCoefficients(): PLSCoefficients {
  const rng  = mulberry32(0xDEADBEEF);
  const nrng = normalRng(rng);

  // x_rotations: (N_BANDS, N_LV) — simulate smooth spectral loadings
  const x_rotations: number[][] = [];
  for (let b = 0; b < N_BANDS; b++) {
    const row: number[] = [];
    for (let lv = 0; lv < N_LV; lv++) {
      // Smooth basis: combination of sine waves at different frequencies
      const freq = (lv + 1) * Math.PI / N_BANDS;
      row.push(Math.sin(freq * b) * 0.1 + nrng() * 0.02);
    }
    x_rotations.push(row);
  }

  // y_loadings: (N_LV, N_OUT)
  const y_loadings: number[][] = [];
  for (let lv = 0; lv < N_LV; lv++) {
    const row: number[] = [];
    for (let out = 0; out < N_OUT; out++) {
      row.push(nrng() * 0.15 + (lv === 0 ? 0.3 : 0.0));
    }
    y_loadings.push(row);
  }

  // x_mean: approximate absorbance values for typical feed
  const x_mean = Array.from({ length: N_BANDS }, (_, b) => {
    const t = b / N_BANDS;
    return 0.8 + 0.4 * Math.sin(Math.PI * t) + 0.1 * Math.sin(4 * Math.PI * t) + nrng() * 0.02;
  });

  // x_std: small values (already SNV-normalised inputs)
  const x_std = Array.from({ length: N_BANDS }, () => 1.0);

  // y_mean: typical proximate values
  const y_mean = [22.5, 12.0, 28.5, 45.0, 4.2, 7.8, 10.8];

  return { x_rotations, y_loadings, x_mean, x_std, y_mean };
}

// ─── Build OOD State ───────────────────────────────────────────────────────
function buildOODState(): MahalanobisState {
  const rng  = mulberry32(0xCAFEBABE);
  const nrng = normalRng(rng);

  const mean = Array.from({ length: N_BANDS }, (_, b) => {
    const t = b / N_BANDS;
    return 0.8 + 0.4 * Math.sin(Math.PI * t) + nrng() * 0.01;
  });

  // components: (N_COMP, N_BANDS) — simulate PCA eigenvectors
  const components: number[][] = [];
  for (let c = 0; c < N_COMP; c++) {
    const row = Array.from({ length: N_BANDS }, (_, b) => {
      const freq = (c + 1) * 2 * Math.PI / N_BANDS;
      return Math.cos(freq * b) / Math.sqrt(N_BANDS) + nrng() * 0.005;
    });
    components.push(row);
  }

  // inv_cov: (N_COMP, N_COMP) — diagonal (uncorrelated PCA components)
  const inv_cov: number[][] = Array.from({ length: N_COMP }, (_, i) =>
    Array.from({ length: N_COMP }, (_, j) => (i === j ? 1.0 / ((i + 1) * 0.2) : 0.0))
  );

  return { mean, components, inv_cov, threshold: 12.5 };
}

// ─── Build Adulterant Weights ──────────────────────────────────────────────
function buildAdulterantWeights(): AdulterantWeights {
  const rng  = mulberry32(0xFEEDFACE);
  const nrng = normalRng(rng);

  // W: (3, N_BANDS) — simulate sensitivity to known spectral bands
  // Urea: N-H stretch at ~band 100-115 (1215-1260nm)
  // Silica: broadband at 200+ (>1640nm)
  // Melamine: N-H at ~band 135-155 (1365-1425nm)
  const W: number[][] = [
    // Urea
    Array.from({ length: N_BANDS }, (_, b) =>
      (b >= 90 && b <= 115) ? 0.8 + nrng() * 0.1 : nrng() * 0.02
    ),
    // Silica
    Array.from({ length: N_BANDS }, (_, b) =>
      (b >= 195) ? 0.6 + nrng() * 0.1 : nrng() * 0.02
    ),
    // Melamine
    Array.from({ length: N_BANDS }, (_, b) =>
      (b >= 130 && b <= 160) ? 0.75 + nrng() * 0.1 : nrng() * 0.02
    ),
  ];

  return { W, b: [-2.5, -2.5, -2.5], anomaly_threshold: 0.035 };
}

// ─── Export ───────────────────────────────────────────────────────────────
export const SYNTHETIC_TEST_BUNDLE: ModelBundle = {
  plsCoefficients:  buildPLSCoefficients(),
  oodState:         buildOODState(),
  adulterantWeights: buildAdulterantWeights(),
};

/**
 * @deprecated Misleading name. Use SYNTHETIC_TEST_BUNDLE, which says what it is.
 */
export const MOCK_MODEL_BUNDLE = SYNTHETIC_TEST_BUNDLE;
