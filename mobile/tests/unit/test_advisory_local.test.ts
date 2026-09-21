/**
 * AAHAR Mobile — Local Advisory Engine & VFM Unit Tests
 * Verifies on-device rule evaluation across 8 languages and 3D herd impact mapping.
 */

import { describe, it, expect } from 'vitest';
import { generateLocalAdvisory } from '../../src/advisory/localEngine';
import { calculateVfm } from '../../src/advisory/vfmCalculator';
import { mapHerdImpacts } from '../../src/advisory/herdImpactMapper';

describe('AAHAR Mobile On-Device Advisory Engine', () => {
  it('should assign Grade A for clean, balanced feed and generate 8-locale summaries', () => {
    const advisory = generateLocalAdvisory({
      measurementId: 'meas-clean-01',
      feedType: 'COTTONSEED_CAKE',
      proximates: {
        crude_protein: 25.0,
        moisture: 11.5,
        dry_matter: 88.5,
        adf: 27.0,
        ndf: 43.0,
        crude_fat: 7.0,
        ash: 5.0,
        me_mj_kg: 11.6,
      },
      adulterants: {
        urea_detected: false,
        urea_pct: 0,
        silica_pct: 1.0,
      },
      safety: {
        aflatoxin_b1_risk: 'LOW',
        mould_surface_pct: 1.2,
      },
    });

    expect(advisory.feed_grade).toBe('A');
    expect(advisory.text.en).toContain('Grade A');
    expect(advisory.text.hi).toContain('25.0% क्रूड प्रोटीन');
    expect(advisory.text.pa).toContain('25.0% ਕੱਚਾ ਪ੍ਰੋਟੀਨ');
    expect(advisory.text.mr).toBeDefined();
    expect(advisory.text.gu).toBeDefined();
    expect(advisory.text.te).toBeDefined();
    expect(advisory.text.kn).toBeDefined();
    expect(advisory.text.bn).toBeDefined();
  });

  it('should immediately REJECT feed when urea adulteration >= 0.5%', () => {
    const advisory = generateLocalAdvisory({
      measurementId: 'meas-urea-spiked',
      feedType: 'COTTONSEED_CAKE',
      proximates: {
        crude_protein: 26.0,
        moisture: 12.0,
      },
      adulterants: {
        urea_detected: true,
        urea_pct: 2.5,
      },
    });

    expect(advisory.feed_grade).toBe('REJECT');
    expect(advisory.actions[0].priority).toBe(1);
    expect(advisory.actions[0].action_key).toBe('stop_feeding_urea_adulterated');
  });

  it('should REJECT feed when aflatoxin risk is HIGH and map to liver toxicity', () => {
    const advisory = generateLocalAdvisory({
      measurementId: 'meas-afla-high',
      feedType: 'MAIZE_GRAIN',
      proximates: { crude_protein: 9.2 },
      safety: { aflatoxin_b1_risk: 'HIGH', mould_surface_pct: 8.5 },
    });

    expect(advisory.feed_grade).toBe('REJECT');
    const liverImpact = advisory.herd_impacts.find((i) => i.body_system === 'LIVER');
    expect(liverImpact).toBeDefined();
    expect(liverImpact?.severity).toBe('CRITICAL');
  });

  it('should accurately calculate Value for Money (₹/kg protein)', () => {
    // Cottonseed cake: price ₹ 3,400 / quintal (₹ 34/kg feed). CP 25%.
    // Cost per kg protein = 34 / 0.25 = ₹ 136. Benchmark = 340. Great value!
    const vfm1 = calculateVfm('COTTONSEED_CAKE', 25.0, 3400);
    expect(vfm1).not.toBeNull();
    expect(vfm1?.cost_per_kg_protein).toBe(136);
    expect(vfm1?.price_verdict).toBe('EXCELLENT_VALUE');

    // Overpriced sample: CP only 10%, price ₹ 4,200/quintal = ₹ 42/kg. Cost = 42/0.10 = 420.
    const vfm2 = calculateVfm('COTTONSEED_CAKE', 10.0, 4200);
    expect(vfm2?.price_verdict).toBe('OVERPRICED');
  });

  it('should map rumen, liver, udder, and skeleton anatomical impacts correctly', () => {
    const impacts = mapHerdImpacts({
      crude_protein: 9.0, // low CP -> udder
      me_mj_kg: 7.5,      // low ME -> udder
      adf: 52.0,          // high ADF -> rumen
      aflatoxin_band: 'HIGH', // aflatoxin -> liver
      silica_pct: 5.5,    // high silica -> skeleton
    });

    const regions = impacts.map((i) => i.anatomical_region);
    expect(regions).toContain('liver');
    expect(regions).toContain('rumen');
    expect(regions).toContain('udder');
    expect(regions).toContain('skeleton');
  });
});
