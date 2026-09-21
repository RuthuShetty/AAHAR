/**
 * AAHAR — Phase 4: 3D System Tests
 * Tests the state-driven colour system, organ impact mapping,
 * and scene prop hooks — all without a WebGL context.
 */

import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import {
  gradeToColor, spoilageToPalette, confidenceToOpacity,
  proximatesToOrganImpacts, ORGAN_COLOURS, GRADE_COLOURS, PHASE_COLOURS,
  type OrganImpact, type ProximateSnapshot,
} from '../../src/three/materials';

// ─── 1. Material & Colour System ─────────────────────────────────────────────

describe('gradeToColor', () => {
  it('A grade returns green', () => {
    const c = gradeToColor('A');
    expect(c).toBeInstanceOf(THREE.Color);
    // #2E7D32 → r≈0.18, g≈0.49, b≈0.196
    expect(c.g).toBeGreaterThan(c.r);
    expect(c.g).toBeGreaterThan(c.b);
  });

  it('REJECT grade returns red', () => {
    const c = gradeToColor('REJECT');
    expect(c.r).toBeGreaterThan(c.g);
    expect(c.r).toBeGreaterThan(c.b);
  });

  it('returns a Color for all 4 grades', () => {
    (['A', 'B', 'C', 'REJECT'] as const).forEach(grade => {
      expect(gradeToColor(grade)).toBeInstanceOf(THREE.Color);
    });
  });
});

describe('spoilageToPalette', () => {
  it('t=0 returns bluish colour (healthy)', () => {
    const c = spoilageToPalette(0);
    expect(c.b).toBeGreaterThan(c.r);
  });

  it('t=1 returns reddish colour (spoiled)', () => {
    const c = spoilageToPalette(1);
    expect(c.r).toBeGreaterThan(c.b);
  });

  it('t=0.5 is yellowish (mid-range)', () => {
    const c = spoilageToPalette(0.5);
    // #F9A825 — high r, high g, low b
    expect(c.r).toBeGreaterThan(c.b);
    expect(c.g).toBeGreaterThan(c.b);
  });

  it('returns THREE.Color instance for all values', () => {
    [0, 0.25, 0.5, 0.75, 1.0].forEach(t => {
      expect(spoilageToPalette(t)).toBeInstanceOf(THREE.Color);
    });
  });

  it('r-channel increases from blue(t=0) to yellow(t=0.5)', () => {
    const r0 = spoilageToPalette(0).r;
    const r5 = spoilageToPalette(0.5).r;
    // Blue (#1565C0) has r≈0.08, yellow (#F9A825) has r≈0.98 → r increases
    expect(r5).toBeGreaterThan(r0);
  });
});

describe('confidenceToOpacity', () => {
  it('confidence=1 → opacity near 1.0', () => {
    expect(confidenceToOpacity(1.0)).toBeCloseTo(1.0);
  });

  it('confidence=0 → opacity ≥ 0.3 (always visible)', () => {
    expect(confidenceToOpacity(0.0)).toBeCloseTo(0.3);
  });

  it('confidence=0.5 → opacity ≈ 0.65', () => {
    expect(confidenceToOpacity(0.5)).toBeCloseTo(0.65);
  });

  it('clamps to [0.3, 1.0] for out-of-range inputs', () => {
    expect(confidenceToOpacity(-1)).toBeCloseTo(0.3);
    expect(confidenceToOpacity(2)).toBeCloseTo(1.0);
  });
});

// ─── 2. Organ Impact Mapping ─────────────────────────────────────────────────

describe('proximatesToOrganImpacts', () => {
  const EXCELLENT: ProximateSnapshot = {
    crude_protein_pct_dm: 22.0,
    ndf_pct_dm:           34.0,
    me_mj_kg_dm:          11.5,
    moisture_pct:         12.0,
    ash_pct_dm:           8.0,
  };

  const ACIDOSIS: ProximateSnapshot = {
    ...EXCELLENT,
    ndf_pct_dm: 18.0,   // Low NDF → rumen acidosis
  };

  const HIGH_PROTEIN: ProximateSnapshot = {
    ...EXCELLENT,
    crude_protein_pct_dm: 48.0,  // Very high → liver stress
  };

  const LOW_ENERGY: ProximateSnapshot = {
    ...EXCELLENT,
    me_mj_kg_dm: 6.5,   // Low ME → udder/milk impact
  };

  const LOW_MINERAL: ProximateSnapshot = {
    ...EXCELLENT,
    ash_pct_dm: 3.5,   // Low ash → bone stress
  };

  it('excellent ration has all organs HEALTHY', () => {
    const impacts = proximatesToOrganImpacts(EXCELLENT);
    expect(impacts.rumen).toBe('HEALTHY');
    expect(impacts.liver).toBe('HEALTHY');
    expect(impacts.udder).toBe('HEALTHY');
    expect(impacts.bone).toBe('HEALTHY');
  });

  it('low NDF escalates rumen to CRITICAL', () => {
    const impacts = proximatesToOrganImpacts(ACIDOSIS);
    expect(impacts.rumen).toBe('CRITICAL');
  });

  it('very high protein escalates liver to CRITICAL', () => {
    const impacts = proximatesToOrganImpacts(HIGH_PROTEIN);
    expect(impacts.liver).toBe('CRITICAL');
  });

  it('low ME escalates udder to CRITICAL', () => {
    const impacts = proximatesToOrganImpacts(LOW_ENERGY);
    expect(impacts.udder).toBe('CRITICAL');
  });

  it('low ash escalates bone to AT_RISK or CRITICAL', () => {
    const impacts = proximatesToOrganImpacts(LOW_MINERAL);
    expect(['AT_RISK', 'CRITICAL']).toContain(impacts.bone);
  });

  it('returns all four organ keys', () => {
    const impacts = proximatesToOrganImpacts(EXCELLENT);
    expect(impacts).toHaveProperty('rumen');
    expect(impacts).toHaveProperty('liver');
    expect(impacts).toHaveProperty('udder');
    expect(impacts).toHaveProperty('bone');
  });

  it('all impacts are valid OrganImpact values', () => {
    const VALID: OrganImpact[] = ['HEALTHY', 'STRESSED', 'AT_RISK', 'CRITICAL'];
    const impacts = proximatesToOrganImpacts(ACIDOSIS);
    Object.values(impacts).forEach(v => {
      expect(VALID).toContain(v);
    });
  });
});

// ─── 3. ORGAN_COLOURS completeness ───────────────────────────────────────────

describe('ORGAN_COLOURS', () => {
  const IMPACTS: OrganImpact[] = ['HEALTHY', 'STRESSED', 'AT_RISK', 'CRITICAL'];

  it('has all four impact levels', () => {
    IMPACTS.forEach(impact => {
      expect(ORGAN_COLOURS).toHaveProperty(impact);
    });
  });

  it('each entry has base, emissive, pulse fields', () => {
    IMPACTS.forEach(impact => {
      const col = ORGAN_COLOURS[impact];
      expect(typeof col.base).toBe('string');
      expect(typeof col.emissive).toBe('string');
      expect(typeof col.pulse).toBe('boolean');
    });
  });

  it('CRITICAL has pulse=true', () => {
    expect(ORGAN_COLOURS.CRITICAL.pulse).toBe(true);
  });

  it('HEALTHY has pulse=false', () => {
    expect(ORGAN_COLOURS.HEALTHY.pulse).toBe(false);
  });
});

// ─── 4. GRADE_COLOURS completeness ───────────────────────────────────────────

describe('GRADE_COLOURS', () => {
  it('has all four grade keys', () => {
    (['A', 'B', 'C', 'REJECT'] as const).forEach(g => {
      expect(GRADE_COLOURS).toHaveProperty(g);
      expect(GRADE_COLOURS[g]).toBeInstanceOf(THREE.Color);
    });
  });
});

// ─── 5. PHASE_COLOURS completeness ───────────────────────────────────────────

describe('PHASE_COLOURS', () => {
  const PHASES = ['AEROBIC', 'ACTIVE_ANAEROBIC', 'STABLE', 'AEROBIC_SPOILAGE', 'CLOSTRIDIAL'];

  it('has all five fermentation phases', () => {
    PHASES.forEach(phase => {
      expect(PHASE_COLOURS).toHaveProperty(phase);
      expect(typeof (PHASE_COLOURS as any)[phase]).toBe('string');
    });
  });

  it('AEROBIC_SPOILAGE is reddish hex', () => {
    const c = new THREE.Color(PHASE_COLOURS.AEROBIC_SPOILAGE);
    expect(c.r).toBeGreaterThan(c.b);
  });

  it('STABLE is bluish hex', () => {
    const c = new THREE.Color(PHASE_COLOURS.STABLE);
    expect(c.b).toBeGreaterThan(c.r);
  });
});
