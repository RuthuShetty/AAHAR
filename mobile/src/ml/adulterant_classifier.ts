/**
 * AAHAR Mobile — Adulterant Classifier (TypeScript)
 * Linear probe classifier over PCA features.
 * Weights exported from the CNN's penultimate-layer projections.
 * Falls back to spectral peak heuristics when weights not loaded.
 */

export interface AdulterantWeights {
  // Linear projection: spectrum (228) → logits (3) via learned weight matrix
  W: number[][];   // (3, 228)  — [urea, silica, melamine]
  b: number[];     // (3,)
  anomaly_threshold: number;
}

export interface AdulterantOutput {
  urea: number;        // probability 0–1
  silica: number;      // probability 0–1
  melamine: number;    // probability 0–1
  anomaly_score: number;
}

function sigmoid(x: number): number {
  return 1.0 / (1.0 + Math.exp(-x));
}

export class AdulterantClassifier {
  private readonly W: Float64Array;   // flat (3 × 228)
  private readonly b: Float64Array;
  private readonly anomalyThreshold: number;
  private readonly nClasses = 3;
  private readonly nBands: number;

  constructor(weights: AdulterantWeights) {
    this.nBands = weights.W[0]?.length ?? 228;
    this.W = new Float64Array(this.nClasses * this.nBands);
    for (let i = 0; i < this.nClasses; i++)
      for (let j = 0; j < this.nBands; j++)
        this.W[i * this.nBands + j] = weights.W[i][j];
    this.b = new Float64Array(weights.b);
    this.anomalyThreshold = weights.anomaly_threshold;
  }

  predict(spectrum: Float64Array): AdulterantOutput {
    // logits = W @ spectrum + b
    const logits = new Float64Array(this.nClasses);
    for (let i = 0; i < this.nClasses; i++) {
      let s = this.b[i];
      for (let j = 0; j < this.nBands; j++)
        s += this.W[i * this.nBands + j] * spectrum[j];
      logits[i] = s;
    }

    // Anomaly score: mean squared deviation from zero (clean spectrum baseline)
    let msd = 0.0;
    for (let j = 0; j < this.nBands; j++) msd += spectrum[j] ** 2;
    const anomalyScore = msd / this.nBands;

    return {
      urea:         sigmoid(logits[0]),
      silica:       sigmoid(logits[1]),
      melamine:     sigmoid(logits[2]),
      anomaly_score: anomalyScore,
    };
  }
}

/**
 * Heuristic fallback when no weights are loaded.
 * Detects known spectral peaks for Urea (4500–4700 cm⁻¹),
 * Silica (broad scatter increase at high wavenumber), Melamine (peaks 6000–6200 cm⁻¹).
 * Band indices computed for 228-band 900–1700nm scan.
 */
export function spectralPeakHeuristic(spectrum: Float64Array): AdulterantOutput {
  const n = spectrum.length;   // 228

  // Band index ranges (approximations for 900–1700nm, 3.5nm step)
  const UREA_BANDS    = [90, 115];   // ~1215–1300nm (N-H stretch combination)
  const SILICA_BANDS  = [200, 228];  // >1640nm (broadband scatter)
  const MELAMINE_BANDS = [135, 160]; // ~1365–1455nm (N-H overtone)

  function bandMean(lo: number, hi: number) {
    let s = 0; const cnt = Math.min(hi, n) - lo;
    for (let i = lo; i < Math.min(hi, n); i++) s += spectrum[i];
    return cnt > 0 ? s / cnt : 0;
  }

  const ureaRegion    = bandMean(...UREA_BANDS as [number, number]);
  const silicaRegion  = bandMean(...SILICA_BANDS as [number, number]);
  const melanineRegion = bandMean(...MELAMINE_BANDS as [number, number]);
  const baseline      = bandMean(50, 80);

  return {
    urea:         sigmoid((ureaRegion - baseline) * 3.0),
    silica:       sigmoid((silicaRegion - baseline) * 2.5),
    melamine:     sigmoid((melanineRegion - baseline) * 3.5),
    anomaly_score: 0.0,
  };
}
