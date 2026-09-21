/**
 * AAHAR Mobile — Value for Money (VFM) Calculator
 * Analyzes cost per kg of protein against ICAR/NDDB market benchmarks.
 */

import { FeedType } from '../types/contracts';

export interface VfmResult {
  cost_per_kg_protein: number;
  market_benchmark: number;
  price_verdict: 'FAIR' | 'OVERPRICED' | 'EXCELLENT_VALUE';
  difference_per_kg_protein: number;
  summary_en: string;
}

// Market benchmarks for ₹ / kg crude protein (NDDB 2024-2026 dairy estimates)
export const MARKET_PROTEIN_BENCHMARKS: Partial<Record<FeedType, number>> = {
  COTTONSEED_CAKE: 340,
  MUSTARD_CAKE: 280,
  GROUNDNUT_CAKE: 360,
  SOYBEAN_MEAL: 310,
  CONCENTRATE_MIX: 320,
  MAIZE_SILAGE: 220,
  WHEAT_STRAW: 420, // Low protein makes straw expensive per kg of protein
  GREEN_FODDER: 260,
  BERSEEM: 240,
};

export function calculateVfm(
  feedType: FeedType,
  crudeProteinPct: number,
  feedPricePerQuintal?: number,
): VfmResult | null {
  if (!feedPricePerQuintal || feedPricePerQuintal <= 0 || crudeProteinPct <= 0) {
    return null;
  }

  const pricePerKgFeed = feedPricePerQuintal / 100;
  const proteinFraction = crudeProteinPct / 100;
  const costPerKgProtein = Math.round(pricePerKgFeed / proteinFraction);

  const benchmark = MARKET_PROTEIN_BENCHMARKS[feedType] ?? 320;
  const diff = costPerKgProtein - benchmark;

  let verdict: 'FAIR' | 'OVERPRICED' | 'EXCELLENT_VALUE' = 'FAIR';
  let summary = `₹ ${costPerKgProtein} per kg protein (fair market rate).`;

  if (diff > 40) {
    verdict = 'OVERPRICED';
    summary = `₹ ${costPerKgProtein} per kg protein — market avg ₹ ${benchmark}. Overpriced by ₹ ${diff}/kg.`;
  } else if (diff < -30) {
    verdict = 'EXCELLENT_VALUE';
    summary = `₹ ${costPerKgProtein} per kg protein — below market avg ₹ ${benchmark}. Great value.`;
  }

  return {
    cost_per_kg_protein: costPerKgProtein,
    market_benchmark: benchmark,
    price_verdict: verdict,
    difference_per_kg_protein: diff,
    summary_en: summary,
  };
}
