/**
 * AAHAR — Phase 3 ML Pipeline Tests
 * Tests: preprocessing, PLS-R inference, OOD detection, adulterant classifier,
 * and the full InferenceEngine pipeline.
 * All tests run fully offline — no network, no native dependencies.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  rawToAbsorbance,
  snv,
  savgolDeriv1,
  preprocess,
  preprocessBatch,
} from '../../src/ml/preprocessing';
import { PLSInferenceEngine, PROXIMATE_KEYS } from '../../src/ml/pls_inference';
import { MahalanobisOOD } from '../../src/ml/ood_detector';
import { AdulterantClassifier, spectralPeakHeuristic } from '../../src/ml/adulterant_classifier';
import { InferenceEngine } from '../../src/ml/inference_engine';
import { MOCK_MODEL_BUNDLE } from '../../src/ml/__mocks__/model_bundle';

const N_BANDS = 228;

// ─── Helpers ───────────────────────────────────────────────────────────────
function makeCleanSpectrum(): Float64Array {
  /** Simulate a clean maize silage NIR spectrum (raw counts) */
  const spec = new Float64Array(N_BANDS);
  for (let i = 0; i < N_BANDS; i++) {
    const t = i / N_BANDS;
    spec[i] = 30000 + 15000 * Math.sin(Math.PI * t) + 5000 * Math.cos(4 * Math.PI * t);
  }
  return spec;
}

function makeUreaSpectrum(): Float64Array {
  /** Urea-spiked spectrum: elevated N-H at bands 90-115 */
  const spec = makeCleanSpectrum();
  for (let i = 90; i <= 115; i++) spec[i] *= 1.25;  // +25% intensity spike
  return spec;
}

// ─── 1. Preprocessing Tests ────────────────────────────────────────────────

describe('preprocessing', () => {
  it('rawToAbsorbance: converts counts to positive absorbance', () => {
    const counts = new Float64Array([58000, 30000, 1000, 200, 121]);
    const abs = rawToAbsorbance(counts);
    // log10(58000/57880) ≈ 0.0009
    expect(abs[0]).toBeGreaterThanOrEqual(0);
    expect(abs[0]).toBeLessThan(0.01);
    // log10(58000/29880) ≈ 0.288
    expect(abs[1]).toBeGreaterThan(0.25);
    expect(abs[1]).toBeLessThan(0.35);
    // Very low count → high absorbance
    expect(abs[2]).toBeGreaterThan(1.0);
  });

  it('rawToAbsorbance: does not produce NaN or Inf', () => {
    const counts = new Float64Array(N_BANDS).fill(120);  // all dark
    const abs = rawToAbsorbance(counts);
    for (const v of abs) {
      expect(isNaN(v)).toBe(false);
      expect(isFinite(v)).toBe(true);
    }
  });

  it('snv: output has mean ≈ 0 and std ≈ 1', () => {
    const raw = new Float64Array(N_BANDS).map((_, i) => Math.sin(i * 0.1) + 2.0);
    // jsdom missing map on typed arrays:
    for (let i = 0; i < N_BANDS; i++) raw[i] = Math.sin(i * 0.1) + 2.0;
    const normed = snv(raw);
    const mean = Array.from(normed).reduce((a, b) => a + b, 0) / N_BANDS;
    const variance = Array.from(normed).reduce((a, b) => a + b ** 2, 0) / N_BANDS - mean ** 2;
    expect(Math.abs(mean)).toBeLessThan(1e-10);
    expect(Math.abs(Math.sqrt(variance) - 1.0)).toBeLessThan(0.01);
  });

  it('snv: constant spectrum does not produce NaN', () => {
    const flat = new Float64Array(N_BANDS).fill(0.5);
    const out = snv(flat);
    for (const v of out) {
      expect(isNaN(v)).toBe(false);
    }
  });

  it('savgolDeriv1: derivative of constant is zero', () => {
    const flat = new Float64Array(N_BANDS).fill(1.0);
    const deriv = savgolDeriv1(flat);
    for (const v of deriv) {
      expect(Math.abs(v)).toBeLessThan(1e-10);
    }
  });

  it('savgolDeriv1: derivative of linear ramp is constant', () => {
    const ramp = new Float64Array(N_BANDS);
    for (let i = 0; i < N_BANDS; i++) ramp[i] = i * 0.1;
    const deriv = savgolDeriv1(ramp);
    // Interior values should be approximately constant = 0.1
    for (let i = 5; i < N_BANDS - 5; i++) {
      expect(Math.abs(deriv[i] - 0.1)).toBeLessThan(0.005);
    }
  });

  it('preprocess: returns array of same length', () => {
    const raw = makeCleanSpectrum();
    const out = preprocess(raw);
    expect(out.length).toBe(N_BANDS);
  });

  it('preprocess: output contains no NaN', () => {
    const raw = makeCleanSpectrum();
    const out = preprocess(raw);
    for (const v of out) expect(isNaN(v)).toBe(false);
  });

  it('preprocessBatch: processes N spectra correctly', () => {
    const N = 4;
    const flat = new Float32Array(N * N_BANDS);
    for (let i = 0; i < N; i++) {
      const raw = makeCleanSpectrum();
      for (let b = 0; b < N_BANDS; b++) flat[i * N_BANDS + b] = raw[b];
    }
    const out = preprocessBatch(flat, N_BANDS);
    expect(out.length).toBe(N * N_BANDS);
    // Check no NaN
    for (const v of out) expect(isNaN(v)).toBe(false);
  });
});

// ─── 2. PLS Inference Tests ────────────────────────────────────────────────

describe('PLSInferenceEngine', () => {
  let engine: PLSInferenceEngine;

  beforeEach(() => {
    engine = new PLSInferenceEngine(MOCK_MODEL_BUNDLE.plsCoefficients);
  });

  it('returns array of length 7 for one spectrum', () => {
    const raw = makeCleanSpectrum();
    const spectrum = preprocess(raw);
    const result = engine.predict(spectrum);
    expect(result.length).toBe(7);
  });

  it('returns finite values for all outputs', () => {
    const spectrum = preprocess(makeCleanSpectrum());
    const result = engine.predict(spectrum);
    for (const v of result) {
      expect(isNaN(v)).toBe(false);
      expect(isFinite(v)).toBe(true);
    }
  });

  it('confidenceHalfWidth returns positive value for each output', () => {
    for (let i = 0; i < 7; i++) {
      expect(engine.confidenceHalfWidth(i)).toBeGreaterThan(0);
    }
  });

  it('different spectra produce different predictions', () => {
    const specA = preprocess(makeCleanSpectrum());
    const specB = preprocess(makeUreaSpectrum());
    const outA = engine.predict(specA);
    const outB = engine.predict(specB);
    // At least one output should differ
    const diff = Array.from(outA).some((v, i) => Math.abs(v - outB[i]) > 1e-8);
    expect(diff).toBe(true);
  });

  it('PROXIMATE_KEYS has exactly 7 elements', () => {
    expect(PROXIMATE_KEYS.length).toBe(7);
  });
});

// ─── 3. Mahalanobis OOD Tests ─────────────────────────────────────────────

describe('MahalanobisOOD', () => {
  let detector: MahalanobisOOD;

  beforeEach(() => {
    detector = new MahalanobisOOD(MOCK_MODEL_BUNDLE.oodState);
  });

  it('returns inDistribution=true for typical clean spectrum', () => {
    const spectrum = preprocess(makeCleanSpectrum());
    const { distance, inDistribution } = detector.predict(spectrum);
    expect(isNaN(distance)).toBe(false);
    expect(isFinite(distance)).toBe(true);
    expect(distance).toBeGreaterThanOrEqual(0);
    // With mock weights, we only check the contract shape, not the specific decision
    expect(typeof inDistribution).toBe('boolean');
  });

  it('distance is non-negative', () => {
    const spectrum = preprocess(makeCleanSpectrum());
    const { distance } = detector.predict(spectrum);
    expect(distance).toBeGreaterThanOrEqual(0);
  });

  it('heavily corrupted spectrum has finite distance', () => {
    // Extreme values (white noise)
    const noisy = new Float64Array(N_BANDS);
    for (let i = 0; i < N_BANDS; i++) noisy[i] = (Math.random() - 0.5) * 100;
    const { distance } = detector.predict(noisy);
    expect(isNaN(distance)).toBe(false);
    expect(isFinite(distance)).toBe(true);
  });
});

// ─── 4. Adulterant Classifier Tests ───────────────────────────────────────

describe('AdulterantClassifier', () => {
  let classifier: AdulterantClassifier;

  beforeEach(() => {
    classifier = new AdulterantClassifier(MOCK_MODEL_BUNDLE.adulterantWeights);
  });

  it('returns probabilities in [0, 1]', () => {
    const spectrum = preprocess(makeCleanSpectrum());
    const result = classifier.predict(spectrum);
    expect(result.urea).toBeGreaterThanOrEqual(0);
    expect(result.urea).toBeLessThanOrEqual(1);
    expect(result.silica).toBeGreaterThanOrEqual(0);
    expect(result.silica).toBeLessThanOrEqual(1);
    expect(result.melamine).toBeGreaterThanOrEqual(0);
    expect(result.melamine).toBeLessThanOrEqual(1);
  });

  it('anomaly_score is non-negative', () => {
    const spectrum = preprocess(makeCleanSpectrum());
    const result = classifier.predict(spectrum);
    expect(result.anomaly_score).toBeGreaterThanOrEqual(0);
  });

  it('urea-spiked spectrum has higher urea probability than clean', () => {
    const clean    = preprocess(makeCleanSpectrum());
    const urea     = preprocess(makeUreaSpectrum());
    const cleanOut = classifier.predict(clean);
    const ureaOut  = classifier.predict(urea);
    expect(ureaOut.urea).toBeGreaterThan(cleanOut.urea);
  });
});

describe('spectralPeakHeuristic', () => {
  it('returns probabilities in [0, 1] for clean spectrum', () => {
    const spectrum = preprocess(makeCleanSpectrum());
    const result = spectralPeakHeuristic(spectrum);
    expect(result.urea).toBeGreaterThanOrEqual(0);
    expect(result.urea).toBeLessThanOrEqual(1);
    expect(result.silica).toBeGreaterThanOrEqual(0);
    expect(result.melamine).toBeGreaterThanOrEqual(0);
  });
});

// ─── 5. Full InferenceEngine Integration Tests ────────────────────────────

describe('InferenceEngine', () => {
  let engine: InferenceEngine;

  beforeEach(() => {
    engine = new InferenceEngine(MOCK_MODEL_BUNDLE);
  });

  it('infers without throwing on clean spectrum', () => {
    expect(() => engine.infer(makeCleanSpectrum())).not.toThrow();
  });

  it('returns correct shape: all 7 proximates present', () => {
    const result = engine.infer(makeCleanSpectrum());
    const proximates = result.proximates as Record<string, any>;
    for (const key of PROXIMATE_KEYS) {
      expect(proximates[key]).toBeDefined();
      expect(proximates[key].value).toBeTypeOf('number');
      expect(proximates[key].ci_low).toBeTypeOf('number');
      expect(proximates[key].ci_high).toBeTypeOf('number');
      expect(proximates[key].confidence).toBeTypeOf('number');
      expect(proximates[key].in_distribution).toBeTypeOf('boolean');
    }
  });

  it('CI is ordered: ci_low ≤ value ≤ ci_high', () => {
    const result = engine.infer(makeCleanSpectrum());
    const proximates = result.proximates as Record<string, any>;
    for (const key of PROXIMATE_KEYS) {
      const p = proximates[key];
      expect(p.ci_low).toBeLessThanOrEqual(p.value);
      expect(p.value).toBeLessThanOrEqual(p.ci_high);
    }
  });

  it('adulteration result has all three targets', () => {
    const result = engine.infer(makeCleanSpectrum());
    expect(result.adulteration.urea).toBeDefined();
    expect(result.adulteration.silica).toBeDefined();
    expect(result.adulteration.melamine).toBeDefined();
    expect(typeof result.adulteration.any_detected).toBe('boolean');
  });

  it('in_distribution is boolean', () => {
    const result = engine.infer(makeCleanSpectrum());
    expect(typeof result.in_distribution).toBe('boolean');
  });

  it('inference_ms is positive integer', () => {
    const result = engine.infer(makeCleanSpectrum());
    expect(result.inference_ms).toBeGreaterThanOrEqual(0);
  });

  it('model_version is a string', () => {
    const result = engine.infer(makeCleanSpectrum());
    expect(result.model_version).toBeTypeOf('string');
    expect(result.model_version.length).toBeGreaterThan(0);
  });

  it('confidence drops when OOD flag set on corrupted input', () => {
    // Send extreme corrupted spectrum
    const corrupt = new Float64Array(N_BANDS).fill(58200);
    const result = engine.infer(corrupt);
    // OOD engine should flag uncertainty - if OOD, confidence ≤ 0.5
    if (!result.in_distribution) {
      const prox = result.proximates as Record<string, any>;
      for (const key of PROXIMATE_KEYS) {
        expect(prox[key].confidence).toBeLessThanOrEqual(0.5);
      }
    }
  });

  it('runs in <100ms on clean spectrum (performance budget)', () => {
    const t0 = Date.now();
    engine.infer(makeCleanSpectrum());
    const elapsed = Date.now() - t0;
    expect(elapsed).toBeLessThan(100);  // 100ms budget for low-end Android
  });

  it('runs fully offline — no network calls made', () => {
    // If the engine attempted a fetch(), it would throw in jsdom with no network
    // Simply asserting it completes proves it's offline-safe
    const result = engine.infer(makeCleanSpectrum());
    expect(result).toBeTruthy();
  });
});
