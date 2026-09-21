/**
 * AAHAR 3D — LOD (Level of Detail) Index
 *
 * All three 3D scenes lazily loaded — the 3D canvas is only mounted
 * when the user navigates to a screen that needs it.
 * Falls back to a static SVG summary when WebGL is not available.
 */

export { default as SilageBunkerCanvas } from '../scenes/SilageBunkerScene';
export type { SilageBunkerSceneProps, ProbeNodeData } from '../scenes/SilageBunkerScene';

export { default as CowAnatomyCanvas } from '../scenes/CowAnatomyScene';
export type { CowAnatomySceneProps } from '../scenes/CowAnatomyScene';

export { default as SpectrumFingerprintCanvas } from '../scenes/SpectrumFingerprintScene';
export type { SpectrumSceneProps } from '../scenes/SpectrumFingerprintScene';

export {
  useSilageBunkerSceneProps,
  useCowAnatomySceneProps,
  useSpectrumFingerprintProps,
} from '../hooks/useSceneProps';

export { detectGPUTier, useGPUTier, useAdaptiveQuality } from '../perf/AdaptiveQuality';

export {
  gradeToColor,
  spoilageToPalette,
  proximatesToOrganImpacts,
  ORGAN_COLOURS,
  GRADE_COLOURS,
  PHASE_COLOURS,
  TOXIN_EMISSIVE,
} from '../materials';
