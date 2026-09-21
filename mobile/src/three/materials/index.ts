/**
 * AAHAR 3D — Shared Materials & Colour System
 * Every colour in every 3D scene is driven by live state, never hardcoded.
 */

import * as THREE from 'three';
import type { FeedGrade, ToxinBand, FermentationPhase } from '../../types/contracts';

// ─── Feed Grade → colour ────────────────────────────────────────────────────
export const GRADE_COLOURS: Record<FeedGrade, THREE.Color> = {
  A:      new THREE.Color('#2E7D32'),
  B:      new THREE.Color('#1565C0'),
  C:      new THREE.Color('#F9A825'),
  REJECT: new THREE.Color('#C62828'),
};

export function gradeToColor(grade: FeedGrade): THREE.Color {
  return GRADE_COLOURS[grade] ?? new THREE.Color('#757575');
}

// ─── Confidence → opacity ────────────────────────────────────────────────────
export function confidenceToOpacity(confidence: number): number {
  return 0.3 + 0.7 * Math.max(0, Math.min(1, confidence));
}

// ─── Spoilage front temperature palette (0 = good, 1 = spoiled) ─────────────
export function spoilageToPalette(t: number): THREE.Color {
  // Blue (0.0) → Yellow (0.5) → Red (1.0)
  const c = new THREE.Color();
  if (t < 0.5) {
    c.lerpColors(new THREE.Color('#1565C0'), new THREE.Color('#F9A825'), t * 2);
  } else {
    c.lerpColors(new THREE.Color('#F9A825'), new THREE.Color('#C62828'), (t - 0.5) * 2);
  }
  return c;
}

// ─── Fermentation phase → material ─────────────────────────────────────────
export const PHASE_COLOURS: Record<FermentationPhase, string> = {
  AEROBIC:          '#F9A825',
  ACTIVE_ANAEROBIC: '#2E7D32',
  STABLE:           '#1565C0',
  AEROBIC_SPOILAGE: '#C62828',
  CLOSTRIDIAL:      '#6A1B9A',
};

// ─── Toxin band → emissive ──────────────────────────────────────────────────
export const TOXIN_EMISSIVE: Record<ToxinBand, string> = {
  LOW:     '#004D40',
  MEDIUM:  '#E65100',
  HIGH:    '#B71C1C',
  UNKNOWN: '#212121',
};

// ─── Organ impact colour (anatomy scene) ─────────────────────────────────────
export type OrganImpact = 'HEALTHY' | 'STRESSED' | 'AT_RISK' | 'CRITICAL';
export const ORGAN_COLOURS: Record<OrganImpact, { base: string; emissive: string; pulse: boolean }> = {
  HEALTHY:  { base: '#D32F2F', emissive: '#1B0000', pulse: false },
  STRESSED: { base: '#E65100', emissive: '#3E1100', pulse: false },
  AT_RISK:  { base: '#B71C1C', emissive: '#8B0000', pulse: true  },
  CRITICAL: { base: '#FF1744', emissive: '#FF1744', pulse: true  },
};

// ─── Proximate health → organ impact mapping ──────────────────────────────
export interface ProximateSnapshot {
  crude_protein_pct_dm: number;
  ndf_pct_dm: number;
  me_mj_kg_dm: number;
  moisture_pct: number;
  ash_pct_dm: number;
}

export function proximatesToOrganImpacts(p: ProximateSnapshot): {
  rumen: OrganImpact;
  liver: OrganImpact;
  udder: OrganImpact;
  bone:  OrganImpact;
} {
  // Rumen health: NDF 28–35% optimal, low NDF = acidosis risk
  const rumen: OrganImpact =
    p.ndf_pct_dm < 20 ? 'CRITICAL' :
    p.ndf_pct_dm < 28 ? 'AT_RISK' :
    p.ndf_pct_dm < 38 ? 'HEALTHY' : 'STRESSED';

  // Liver: protein > 45% = urea toxicity risk; very low ME = mobilisation
  const liver: OrganImpact =
    p.crude_protein_pct_dm > 45 ? 'CRITICAL' :
    p.crude_protein_pct_dm > 40 ? 'AT_RISK' :
    p.me_mj_kg_dm < 7.5        ? 'STRESSED' : 'HEALTHY';

  // Udder: ME drives milk yield; ME < 8.5 = production loss
  const udder: OrganImpact =
    p.me_mj_kg_dm < 7.0  ? 'CRITICAL' :
    p.me_mj_kg_dm < 8.5  ? 'AT_RISK' :
    p.me_mj_kg_dm < 10.0 ? 'STRESSED' : 'HEALTHY';

  // Bone: ash proxy for Ca/P; very low ash = mineral deficiency risk
  const bone: OrganImpact =
    p.ash_pct_dm < 4.0  ? 'CRITICAL' :
    p.ash_pct_dm < 6.0  ? 'AT_RISK' :
    p.ash_pct_dm < 8.0  ? 'STRESSED' : 'HEALTHY';

  return { rumen, liver, udder, bone };
}

// ─── NIR band quality zone colour ───────────────────────────────────────────
export function nirBandColor(wavelength_nm: number, absorbance: number, grade: FeedGrade): THREE.Color {
  // Highlight key absorption windows
  const isProteinBand = (wavelength_nm >= 1500 && wavelength_nm <= 1700);
  const isMoistureBand = (wavelength_nm >= 1400 && wavelength_nm <= 1450);
  const isFatBand = (wavelength_nm >= 1720 && wavelength_nm <= 1760);

  if (isProteinBand) return new THREE.Color('#1565C0').multiplyScalar(0.5 + absorbance * 0.5);
  if (isMoistureBand) return new THREE.Color('#00838F').multiplyScalar(0.5 + absorbance * 0.5);
  if (isFatBand)     return new THREE.Color('#F9A825').multiplyScalar(0.5 + absorbance * 0.5);
  return gradeToColor(grade).multiplyScalar(0.3 + absorbance * 0.4);
}

// ─── Shared glass material ───────────────────────────────────────────────────
export const glassMaterial = new THREE.MeshPhysicalMaterial({
  color:            0xffffff,
  metalness:        0.0,
  roughness:        0.05,
  transmission:     0.95,
  transparent:      true,
  opacity:          0.3,
  envMapIntensity:  1.5,
  thickness:        0.5,
});

// ─── Ground / floor material ─────────────────────────────────────────────────
export const groundMaterial = new THREE.MeshStandardMaterial({
  color:     0x1a1a2e,
  roughness: 0.9,
  metalness: 0.0,
});
