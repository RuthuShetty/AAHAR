/**
 * AAHAR Mobile — installed model bundle registry.
 *
 * WHY THIS EXISTS
 * The only ModelBundle in this repository is src/ml/__mocks__/model_bundle.ts.
 * Its header claims the weights are "derived from analytical physics of NIR
 * spectra". They are not: every coefficient is drawn from a Box-Muller
 * transform over a Mulberry32 PRNG seeded with 0xDEADBEEF. They are Gaussian
 * noise. Feeding a real spectrum through them produces a number with no
 * relationship to the sample.
 *
 * Until a bundle trained against wet-chemistry ground truth is published and
 * signed, this registry returns null in any non-test build, and the scan
 * screen surfaces "no model installed" rather than showing a farmer a
 * fabricated crude-protein figure they may buy or cull against.
 */
import type { ModelBundle } from './inference_engine';

export interface InstalledBundleMeta {
  id: string;
  version: string;
  sha256: string;
  signatureVerified: boolean;
  trainedOnSamples: number;
  validationRmsep: Record<string, number>;
}

let installedBundle: ModelBundle | null = null;
let installedMeta: InstalledBundleMeta | null = null;

/** Set by the OTA/model-download flow after signature + digest verification. */
export function installModelBundle(bundle: ModelBundle, meta: InstalledBundleMeta): void {
  if (!meta.signatureVerified) {
    throw new Error('Refusing to install an unverified model bundle.');
  }
  if (meta.trainedOnSamples <= 0) {
    throw new Error('Refusing to install a bundle with no training provenance.');
  }
  installedBundle = bundle;
  installedMeta = meta;
}

/** Returns the installed bundle, or null when none has been verified. */
export function getInstalledModelBundle(): ModelBundle | null {
  return installedBundle;
}

export function getInstalledModelMeta(): InstalledBundleMeta | null {
  return installedMeta;
}

export function clearInstalledModelBundle(): void {
  installedBundle = null;
  installedMeta = null;
}
