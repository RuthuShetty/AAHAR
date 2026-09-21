/**
 * AAHAR Mobile — On-Device Deterministic Advisory Engine
 * Operates 100% offline in airplane mode.
 * Generates typed Advisory records strictly conforming to contracts/schema/advisory.schema.json.
 */

import { Advisory, FeedType } from '../types/contracts';
import { calculateVfm } from './vfmCalculator';
import { mapHerdImpacts } from './herdImpactMapper';

export interface LocalAdvisoryInput {
  measurementId: string;
  feedType: FeedType;
  proximates: {
    crude_protein: number;
    moisture?: number;
    dry_matter?: number;
    adf?: number;
    ndf?: number;
    crude_fat?: number;
    ash?: number;
    me_mj_kg?: number;
  };
  adulterants?: {
    urea_detected?: boolean;
    urea_pct?: number;
    silica_detected?: boolean;
    silica_pct?: number;
    melamine_detected?: boolean;
  };
  safety?: {
    aflatoxin_b1_risk?: 'LOW' | 'MEDIUM' | 'HIGH';
    mould_surface_pct?: number;
  };
  feedPricePerQuintal?: number;
}

export function generateLocalAdvisory(input: LocalAdvisoryInput): Advisory {
  const { proximates, adulterants, safety } = input;
  const cp = proximates.crude_protein;
  const moisture = proximates.moisture ?? 12.0;
  const ureaPct = adulterants?.urea_pct ?? 0;
  const ureaDetected = Boolean(adulterants?.urea_detected || ureaPct >= 0.5);
  const silicaPct = adulterants?.silica_pct ?? 0;
  const aflatoxinRisk = safety?.aflatoxin_b1_risk ?? 'LOW';
  const mouldPct = safety?.mould_surface_pct ?? 0;

  let grade: 'A' | 'B' | 'C' | 'REJECT' = 'A';
  const actions: Advisory['actions'] = [];
  const adjustments: NonNullable<NonNullable<Advisory['ration_correction']>['adjustments']> = [];

  // 1. Check Rejection Criteria (Safety First)
  if (ureaDetected && ureaPct >= 0.5) {
    grade = 'REJECT';
    actions.push({
      priority: 1,
      category: 'SAFETY',
      action_key: 'stop_feeding_urea_adulterated',
      action_params: { urea_pct: ureaPct },
      severity: 'CRITICAL',
    });
  } else if (aflatoxinRisk === 'HIGH') {
    grade = 'REJECT';
    actions.push({
      priority: 1,
      category: 'SAFETY',
      action_key: 'do_not_feed_aflatoxin_high',
      severity: 'CRITICAL',
      lab_name: 'NDDB CALF Lab / NDRI Karnal',
    });
  } else if (silicaPct >= 5.0 || mouldPct >= 15.0) {
    grade = 'REJECT';
    actions.push({
      priority: 1,
      category: 'SAFETY',
      action_key: 'excessive_mould_contamination',
      severity: 'CRITICAL',
    });
  } else if (cp < 8.0 || moisture > 70.0) {
    grade = 'C';
    actions.push({
      priority: 2,
      category: 'FEEDING',
      action_key: 'supplement_protein_deficit',
      severity: 'CAUTION',
    });
  } else if (cp < 16.0 && (input.feedType === 'COTTONSEED_CAKE' || input.feedType === 'MUSTARD_CAKE')) {
    grade = 'B';
    actions.push({
      priority: 3,
      category: 'FEEDING',
      action_key: 'maintain_balanced_diet',
      severity: 'INFO',
    });
  }

  // Storage advisory for high moisture
  if (moisture > 14.0 && input.feedType !== 'MAIZE_SILAGE' && input.feedType !== 'GREEN_FODDER') {
    actions.push({
      priority: 2,
      category: 'STORAGE',
      action_key: 'dry_to_under_14_within_3_days',
      severity: 'CAUTION',
    });
  }

  // Ration adjustment recommendations
  if (grade === 'C' || (grade === 'B' && cp < 14)) {
    adjustments.push({
      feed_type: 'MUSTARD_CAKE',
      change_kg_per_animal_per_day: 0.8,
      rationale_key: 'compensate_protein_deficit',
    });
  }

  // 3D Herd Impacts
  const rawImpacts = mapHerdImpacts({
    crude_protein: cp,
    me_mj_kg: proximates.me_mj_kg,
    adf: proximates.adf,
    ndf: proximates.ndf,
    urea_detected: ureaDetected,
    urea_pct: ureaPct,
    aflatoxin_band: aflatoxinRisk,
    silica_pct: silicaPct,
  });

  const herdImpacts: Advisory['herd_impacts'] = rawImpacts.map((imp) => {
    let bodySystem: Advisory['herd_impacts'][number]['body_system'] = 'GENERAL';
    if (imp.anatomical_region === 'liver') bodySystem = 'LIVER';
    else if (imp.anatomical_region === 'rumen') bodySystem = 'RUMEN';
    else if (imp.anatomical_region === 'udder') bodySystem = 'UDDER';
    else if (imp.anatomical_region === 'skeleton') bodySystem = 'SKELETON';

    return {
      body_system: bodySystem,
      severity: imp.severity === 'critical' ? 'CRITICAL' : imp.severity === 'high' ? 'CAUTION' : 'INFO',
      explanation_key: imp.title_en,
      fix_key: imp.remedy_en,
    };
  });

  // Build multilingual summaries
  const summaries = {
    en: grade === 'REJECT'
      ? `UNSAFE FEED: Rejected due to contamination or adulteration. Do not feed to herd.`
      : `Tested sample is Grade ${grade} with ${cp.toFixed(1)}% crude protein.`,
    hi: grade === 'REJECT'
      ? `असुरक्षित चारा: मिलावट या विषैले तत्व के कारण अस्वीकार। पशुओं को न खिलाएं।`
      : `जांचा गया चारा ग्रेड ${grade} है, जिसमें ${cp.toFixed(1)}% क्रूड प्रोटीन है।`,
    pa: grade === 'REJECT'
      ? `ਅਸੁਰੱਖਿਅਤ ਖ਼ੁਰਾਕ: ਮਿਲਾਵਟ ਜਾਂ ਉੱਲੀ ਕਾਰਨ ਰੱਦ। ਪਸ਼ੂਆਂ ਨੂੰ ਬਿਲਕੁਲ ਨਾ ਦਿਓ।`
      : `ਪਰਖੀ ਗਈ ਖ਼ੁਰਾਕ ਗ੍ਰੇਡ ${grade} ਹੈ, ਜਿਸ ਵਿੱਚ ${cp.toFixed(1)}% ਕੱਚਾ ਪ੍ਰੋਟੀਨ ਹੈ।`,
    mr: grade === 'REJECT'
      ? `असुरक्षित चारा: भेसळ किंवा बुरशीमुळे नाकारला आहे. जनावरांना खायला घालू नका.`
      : `तपासलेला चारा ग्रेड ${grade} दर्जाचा असून यामध्ये ${cp.toFixed(1)}% क्रूड प्रोटीन आहे.`,
    gu: grade === 'REJECT'
      ? `અસુરક્ષિત ખોરાક: ભેળસેળને કારણે નકારવામાં આવ્યો છે. પશુઓને ન આપો.`
      : `તપાસેલ ખોરાક ગ્રેડ ${grade} છે, જેમાં ${cp.toFixed(1)}% ક્રૂડ પ્રોટીન છે.`,
    te: grade === 'REJECT'
      ? `ప్రమాదకరమైన దాణా: కల్తీ లేదా విషపూరితమైనందున తిరస్కరించబడింది.`
      : `పరీక్షించిన దాణా గ్రేడ్ ${grade}, ఇందులో ${cp.toFixed(1)}% క్రూడ్ ప్రోటీన్ ఉంది.`,
    kn: grade === 'REJECT'
      ? `ಅಸುರಕ್ಷಿತ ಮೇವು: ಕಲಬೆರಕೆ ಅಥವಾ ವಿಷತ್ವದ ಕಾರಣ ತಿರಸ್ಕರಿಸಲಾಗಿದೆ.`
      : `ಪರೀಕ್ಷಿಸಿದ ಮೇವು ಗ್ರೇಡ್ ${grade} ಗುಣಮಟ್ಟ ಹೊಂದಿದ್ದು, ${cp.toFixed(1)}% ಪ್ರೋಟೀನ್ ಇದೆ.`,
    bn: grade === 'REJECT'
      ? `অনিরাপদ খাদ্য: ভেজাল বা ক্ষতিকর বিষাক্ততার কারণে বাতিল করা হয়েছে।`
      : `পরীক্ষিত খাদ্য গ্রেড ${grade} মানের, এতে ${cp.toFixed(1)}% ক্রুড প্রোটিন রয়েছে।`,
  };

  return {
    measurement_id: input.measurementId,
    feed_grade: grade,
    is_server_authoritative: false,
    computed_at: new Date().toISOString(),
    actions,
    ration_correction: adjustments.length > 0 ? { adjustments } : null,
    herd_impacts: herdImpacts,
    text: summaries,
  };
}
