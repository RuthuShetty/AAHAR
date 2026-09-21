/**
 * AAHAR Mobile — Mahalanobis OOD Detector (TypeScript)
 * Pure typed-array implementation mirroring ml/pipelines/preprocessing.py::MahalanobisOOD.
 */

export interface MahalanobisState {
  mean: number[];          // (n_bands,)
  components: number[][];  // (n_components, n_bands)
  inv_cov: number[][];     // (n_components, n_components)
  threshold: number;
}

export class MahalanobisOOD {
  private readonly mean: Float64Array;
  private readonly components: Float64Array;   // flat (n_components × n_bands)
  private readonly invCov: Float64Array;        // flat (n_components × n_components)
  private readonly threshold: number;
  private readonly nComponents: number;
  private readonly nBands: number;

  constructor(state: MahalanobisState) {
    this.nComponents = state.components.length;
    this.nBands      = state.mean.length;
    this.threshold   = state.threshold;

    this.mean = new Float64Array(state.mean);

    this.components = new Float64Array(this.nComponents * this.nBands);
    for (let i = 0; i < this.nComponents; i++)
      for (let j = 0; j < this.nBands; j++)
        this.components[i * this.nBands + j] = state.components[i][j];

    this.invCov = new Float64Array(this.nComponents * this.nComponents);
    for (let i = 0; i < this.nComponents; i++)
      for (let j = 0; j < this.nComponents; j++)
        this.invCov[i * this.nComponents + j] = state.inv_cov[i][j];
  }

  predict(spectrum: Float64Array): { distance: number; inDistribution: boolean } {
    // Centre
    const xc = new Float64Array(this.nBands);
    for (let i = 0; i < this.nBands; i++) xc[i] = spectrum[i] - this.mean[i];

    // Project to PCA scores: s = components @ xc  (n_components,)
    const scores = new Float64Array(this.nComponents);
    for (let i = 0; i < this.nComponents; i++) {
      let val = 0.0;
      for (let j = 0; j < this.nBands; j++)
        val += this.components[i * this.nBands + j] * xc[j];
      scores[i] = val;
    }

    // Mahalanobis: sqrt(s^T inv_cov s)
    let mahal = 0.0;
    for (let i = 0; i < this.nComponents; i++) {
      let tmp = 0.0;
      for (let j = 0; j < this.nComponents; j++)
        tmp += this.invCov[i * this.nComponents + j] * scores[j];
      mahal += tmp * scores[i];
    }
    const distance = Math.sqrt(Math.max(0.0, mahal));
    return { distance, inDistribution: distance <= this.threshold };
  }
}
