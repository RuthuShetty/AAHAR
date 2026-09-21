/**
 * AAHAR Mobile — 3D Herd Impact Mapper
 * Maps nutritional parameters and adulterants to anatomical regions of the dairy cow (Scene S5).
 */

export interface HerdImpactFinding {
  anatomical_region: 'rumen' | 'liver' | 'udder' | 'skeleton';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title_en: string;
  explanation_en: string;
  remedy_en: string;
  affected_metric: string;
}

export function mapHerdImpacts(params: {
  crude_protein: number;
  me_mj_kg?: number;
  adf?: number;
  ndf?: number;
  urea_detected?: boolean;
  urea_pct?: number;
  aflatoxin_band?: 'LOW' | 'MEDIUM' | 'HIGH';
  silica_pct?: number;
}): HerdImpactFinding[] {
  const impacts: HerdImpactFinding[] = [];

  // 1. Liver — Aflatoxins or Toxic Adulterants
  if (params.aflatoxin_band === 'HIGH') {
    impacts.push({
      anatomical_region: 'liver',
      severity: 'critical',
      title_en: 'Severe Liver Toxicity & Immune Suppression',
      explanation_en: 'High aflatoxin B1 levels accumulate in liver tissue, causing hepatotoxicity and immune failure in dairy cows.',
      remedy_en: 'Discard this batch immediately. Do not feed to lactating or pregnant cows. Add toxin binder to safe feed.',
      affected_metric: 'aflatoxin_b1',
    });
  } else if (params.aflatoxin_band === 'MEDIUM') {
    impacts.push({
      anatomical_region: 'liver',
      severity: 'medium',
      title_en: 'Moderate Liver Stress',
      explanation_en: 'Elevated fungal metabolites induce liver strain and decrease milk synthesis.',
      remedy_en: 'Dilute 1:4 with clean green fodder and incorporate a bentonite/yeast-based toxin binder.',
      affected_metric: 'aflatoxin_b1',
    });
  }

  // 2. Rumen — Urea Toxicity or Fibre Imbalance
  if (params.urea_detected && (params.urea_pct ?? 0) >= 0.5) {
    impacts.push({
      anatomical_region: 'rumen',
      severity: 'critical',
      title_en: 'Acute Rumen Ammonia Toxicity',
      explanation_en: 'Rapid urease hydrolysis produces ammonia faster than rumen microbes can utilize, risking acute alkalosis and death.',
      remedy_en: 'STOP feeding immediately. Administer oral vinegar (5% acetic acid) if accidental ingestion occurred.',
      affected_metric: 'urea',
    });
  } else if ((params.adf ?? 0) > 48 || (params.ndf ?? 0) > 70) {
    impacts.push({
      anatomical_region: 'rumen',
      severity: 'medium',
      title_en: 'Rumen Impaction & Slow Fermentation',
      explanation_en: 'Excessive lignified fiber severely restricts microbial passage rate and voluntary feed intake.',
      remedy_en: 'Chop fodder to 2-3 cm and mix with succulent green fodder or molasses to stimulate rumen flora.',
      affected_metric: 'adf',
    });
  }

  // 3. Udder — Energy / Protein Deficit
  if (params.crude_protein < 12 && (params.me_mj_kg ?? 10) < 8.5) {
    impacts.push({
      anatomical_region: 'udder',
      severity: 'high',
      title_en: 'Reduced Milk Yield & Lactation Crash',
      explanation_en: 'Inadequate crude protein and metabolisable energy forces the cow to mobilize body reserves, causing lactation drop.',
      remedy_en: 'Supplement with 1.2 kg mustard cake or high-protein compound feed per cow daily.',
      affected_metric: 'crude_protein',
    });
  }

  // 4. Skeleton — Excess Silica / Mineral Deficit
  if ((params.silica_pct ?? 0) > 4.0) {
    impacts.push({
      anatomical_region: 'skeleton',
      severity: 'medium',
      title_en: 'Abomasal Irritation & Mineral Chelation',
      explanation_en: 'Excessive sand/silica causes digestive mucosa wear, impairs bone mineral absorption, and leads to tooth wear.',
      remedy_en: 'Sieve or winnow the grain/cake before feeding to remove heavy mineral sediment.',
      affected_metric: 'silica',
    });
  }

  return impacts;
}
