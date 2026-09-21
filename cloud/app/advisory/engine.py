"""
AAHAR Advisory Recompute Engine
Evaluates feed quality against ICAR/FSSAI/NDDB standards,
generates plain-language advisories and spoken strings across 8 Indian languages,
and determines anatomical herd impact regions for the 3D cow model.
"""
from typing import Any, Dict, List, Optional

LOCALES = ["en", "hi", "pa", "mr", "gu", "te", "kn", "bn"]

# Multilingual templates for Grade announcements
GRADE_MESSAGES = {
    "A": {
        "en": "Grade A: Excellent quality feed. Safe and nutritious for your animals.",
        "hi": "ग्रेड ए: उत्कृष्ट गुणवत्ता का चारा। आपके पशुओं के लिए सुरक्षित और पौष्टिक।",
        "pa": "ਗ੍ਰੇਡ ਏ: ਉੱਤਮ ਕੁਆਲਿਟੀ ਦੀ ਖੁਰਾਕ। ਤੁਹਾਡੇ ਪਸ਼ੂਆਂ ਲਈ ਸੁਰੱਖਿਅਤ ਅਤੇ ਪੌਸ਼ਟਿਕ।",
        "mr": "दर्जा अ: उत्कृष्ट दर्जाचा चारा. जनावरांसाठी सुरक्षित आणि पौष्टिक.",
        "gu": "ગ્રેડ એ: ઉત્તમ ગુણવત્તાનો ખોરાક. પશુઓ માટે સલામત અને પૌષ્ટિક.",
        "te": "గ్రేడ్ A: అద్భుతమైన నాణ్యమైన మేత. పశువులకు సురక్షితమైనది మరియు పోషకమైనది.",
        "kn": "ಗ್ರೇಡ್ A: ಅತ್ಯುತ್ತಮ ಗುಣಮಟ್ಟದ ಮೇವು. ಪ್ರಾಣಿಗಳಿಗೆ ಸುರಕ್ಷಿತ ಮತ್ತು ಪೌಷ್ಟಿಕ.",
        "bn": "গ্রেড এ: চমৎকার মানের খাদ্য। পশুদের জন্য নিরাপদ এবং পুষ্টিকর।",
    },
    "B": {
        "en": "Grade B: Good standard feed. Suitable for daily milking herd.",
        "hi": "ग्रेड बी: अच्छा मानक चारा। दुधारू पशुओं के लिए उपयुक्त।",
        "pa": "ਗ੍ਰੇਡ ਬੀ: ਚੰਗੀ ਮਿਆਰੀ ਖੁਰਾਕ। ਦੁਧਾਰੂ ਪਸ਼ੂਆਂ ਲਈ ਢੁਕਵੀਂ।",
        "mr": "दर्जा ब: चांगला मानक चारा. दुभत्या जनावरांसाठी योग्य.",
        "gu": "ગ્રેડ બી: સારો માનક ખોરાક. દૂધાળા પશુઓ માટે અનુકૂળ.",
        "te": "గ్రేడ్ B: మంచి ప్రామాణిక మేత. పాడి పశువులకు తగినది.",
        "kn": "ಗ್ರೇಡ್ B: ಉತ್ತಮ ಗುಣಮಟ್ಟದ ಮೇವು. ಹಾಲಿನ ಹಸುಗಳಿಗೆ ಸೂಕ್ತ.",
        "bn": "গ্রেড বি: ভালো মানের খাবার। দুধালো পশুর জন্য উপযুক্ত।",
    },
    "C": {
        "en": "Grade C: Low nutrition feed. Requires protein or mineral supplementation.",
        "hi": "ग्रेड सी: कम पोषण वाला चारा। प्रोटीन या खनिज पूरक की आवश्यकता है।",
        "pa": "ਗ੍ਰੇਡ ਸੀ: ਘੱਟ ਪੋਸ਼ਣ ਵਾਲੀ ਖੁਰਾਕ। ਪ੍ਰੋਟੀਨ ਜਾਂ ਖਣਿਜ ਪੂਰਕ ਦੀ ਲੋੜ ਹੈ।",
        "mr": "दर्जा क: कमी पोषणाचा चारा. प्रोटीन किंवा पूरक आहाराची गरज आहे.",
        "gu": "ગ્રેડ સી: ઓછું પોષણ ધરાવતો ખોરાક. પ્રોટીન અથવા મિનરલ મિક્સર ઉમેરો.",
        "te": "గ్రేడ్ C: తక్కువ పోషక విలువ కలిగిన మేత. ప్రోటీన్ అందించాలి.",
        "kn": "ಗ್ರೇಡ್ C: ಕಡಿಮೆ ಪೋಷಕಾಂಶಗಳ ಮೇವು. ಪ್ರೋಟೀನ್ ಪೂರಕ ಅಗತ್ಯವಿದೆ.",
        "bn": "গ্রেড সি: কম পুষ্টিকর খাদ্য। প্রোটিন বা খনিজ সম্পূরক প্রয়োজন।",
    },
    "REJECT": {
        "en": "REJECT: Adulterated or toxic feed! Do not feed to animals. Risk of toxicity.",
        "hi": "अस्वीकृत: मिलावटी या विषाक्त चारा! पशुओं को न खिलाएं। बीमारी का खतरा है।",
        "pa": "ਰੱਦ ਕਰੋ: ਮਿਲਾਵਟੀ ਜਾਂ ਜ਼ਹਿਰੀਲੀ ਖੁਰਾਕ! ਪਸ਼ੂਆਂ ਨੂੰ ਨਾ ਦਿਓ। ਬਿਮਾਰੀ ਦਾ ਖ਼ਤਰਾ।",
        "mr": "नाकारा: भेसळयुक्त किंवा विषारी चारा! जनावरांना देऊ नका. धोका आहे.",
        "gu": "અસ્વીકાર: ભેળસેળવાળો અથવા ઝેરી ખોરાક! પશુઓને ન આપવો.",
        "te": "తిరస్కరించండి: కల్తీ లేదా విషపూరిత మేత! పశువులకు మేపవద్దు.",
        "kn": "ತಿರಸ್ಕರಿಸಿ: ಕಲಬೆರಕೆ ಅಥವಾ ವಿಷಕಾರಿ ಮೇವು! ಪ್ರಾಣಿಗಳಿಗೆ ನೀಡಬೇಡಿ.",
        "bn": "প্রত্যাখ্যান: ভেজাল বা বিষাক্ত খাদ্য! পশুদের খাওয়াবেন না।",
    },
}


class AdvisoryEngine:
    @staticmethod
    def compute_advisory(
        proximates: Dict[str, Any],
        safety: Dict[str, Any],
        derived: Optional[Dict[str, Any]] = None,
        feed_type: str = "CONCENTRATE_MIX",
        market_price_per_kg: float = 24.0,
        herd_profile: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        cp = float(proximates.get("crude_protein", {}).get("value", 16.0)) if isinstance(proximates.get("crude_protein"), dict) else float(proximates.get("crude_protein", 16.0))
        moisture = float(proximates.get("moisture", {}).get("value", 10.0)) if isinstance(proximates.get("moisture"), dict) else float(proximates.get("moisture", 10.0))
        adf = float(proximates.get("adf", {}).get("value", 25.0)) if isinstance(proximates.get("adf"), dict) else float(proximates.get("adf", 25.0))
        ndf = float(proximates.get("ndf", {}).get("value", 40.0)) if isinstance(proximates.get("ndf"), dict) else float(proximates.get("ndf", 40.0))
        me = float(derived.get("me_mj_per_kg", {}).get("value", 9.5)) if derived and isinstance(derived.get("me_mj_per_kg"), dict) else 9.5

        urea_pct = float(safety.get("urea_pct", {}).get("value", 0.0)) if isinstance(safety.get("urea_pct"), dict) else float(safety.get("urea_pct", 0.0))
        silica_pct = float(safety.get("silica_pct", {}).get("value", 0.0)) if isinstance(safety.get("silica_pct"), dict) else float(safety.get("silica_pct", 0.0))
        aflatoxin_risk = safety.get("aflatoxin_b1_risk", "LOW")
        if isinstance(aflatoxin_risk, dict):
            aflatoxin_risk = aflatoxin_risk.get("value", "LOW")
        mould_pct = float(safety.get("mould_pct", {}).get("value", 0.0)) if isinstance(safety.get("mould_pct"), dict) else float(safety.get("mould_pct", 0.0))

        # 1. Determine Grade
        safety_issues = []
        herd_impacts = []
        if urea_pct >= 0.5:
            safety_issues.append(f"Urea adulteration detected ({urea_pct:.1f}%). Detection floor ≥ 0.5%.")
            herd_impacts.append({"region": "rumen", "severity": "danger", "message": "High urea causes toxic rumen ammonia spikes."})
        if silica_pct >= 2.0:
            safety_issues.append(f"Excessive sand/silica detected ({silica_pct:.1f}%). Limit is 2.0%.")
            herd_impacts.append({"region": "rumen", "severity": "caution", "message": "Abrasive silica reduces rumen absorption."})
        if aflatoxin_risk == "HIGH":
            safety_issues.append("High Aflatoxin B1 screening alert (>50 ppb). Send sample to NABL accredited lab.")
            herd_impacts.append({"region": "liver", "severity": "danger", "message": "Mycotoxins cause acute hepatic liver damage and milk residue."})
        if mould_pct >= 10.0:
            safety_issues.append(f"Fungal mould contamination is severe ({mould_pct:.1f}% surface).")
            herd_impacts.append({"region": "rumen", "severity": "danger", "message": "Mycotoxigenic mould damages gut flora."})

        if safety_issues or urea_pct >= 0.5 or aflatoxin_risk == "HIGH":
            grade = "REJECT"
        elif cp >= 18.0 and moisture <= 14.0 and aflatoxin_risk == "LOW":
            grade = "A"
        elif cp >= 12.0:
            grade = "B"
        else:
            grade = "C"

        # Check nutrition impacts on 3D Cow regions
        if me < 8.5:
            herd_impacts.append({"region": "udder", "severity": "caution", "message": "Low metabolic energy limits daily milk yield."})
        if ndf < 30.0 or ndf > 65.0:
            if not any(hi["region"] == "rumen" for hi in herd_impacts):
                herd_impacts.append({"region": "rumen", "severity": "caution", "message": "Suboptimal fibre balance impairs chewing and cud rumination."})

        # 2. Value for money calculation
        # Protein price = price per kg / (cp% / 100)
        protein_kg_per_kg_feed = max(0.01, cp / 100.0)
        cost_per_kg_protein = round(market_price_per_kg / protein_kg_per_kg_feed, 1)
        benchmark_cost_protein = 340.0  # Regional market average ₹/kg protein
        diff = cost_per_kg_protein - benchmark_cost_protein

        if diff > 30.0:
            vfm_verdict = f"₹ {cost_per_kg_protein}/kg protein — market average ₹ {benchmark_cost_protein}. Overpriced by ₹ {diff:.0f}."
            vfm_band = "OVERPRICED"
        elif diff < -30.0:
            vfm_verdict = f"₹ {cost_per_kg_protein}/kg protein — market average ₹ {benchmark_cost_protein}. Excellent value."
            vfm_band = "EXCELLENT_VALUE"
        else:
            vfm_verdict = f"₹ {cost_per_kg_protein}/kg protein — consistent with standard market benchmark."
            vfm_band = "FAIR"

        # 3. Action recommendations
        safety_actions = []
        if grade == "REJECT":
            safety_actions.append("Do not feed to pregnant or young animals.")
            safety_actions.append("Isolate this feed lot immediately.")
            safety_actions.append("Send split sample to nearest NABL accredited laboratory for formal confirmation.")
        elif aflatoxin_risk == "MED":
            safety_actions.append("Dilute 1:4 with fresh green fodder or clean silage.")

        ration_actions = []
        if cp < 14.0 and grade != "REJECT":
            ration_actions.append("Add 400 g mustard or cottonseed cake per animal per day to balance protein deficit.")
        elif cp >= 20.0:
            ration_actions.append("High protein ration: optimal for peak lactation dairy cows.")

        storage_actions = []
        if moisture > 14.0:
            storage_actions.append(f"Moisture is {moisture:.1f}%. Sun-dry or aerate to under 14% within 3 days to prevent fungal growth.")
        else:
            storage_actions.append("Moisture is within safe dry storage limits (< 14%). Store elevated off floor.")

        silage_actions = []
        if "SILAGE" in feed_type:
            silage_actions.append("Maintain airtight bunker seal. Deface minimum 15 cm daily during feedout.")

        # 4. Multi-language text generation (8 Indian languages)
        local_text = {}
        for loc in LOCALES:
            grade_msg = GRADE_MESSAGES.get(grade, {}).get(loc, GRADE_MESSAGES[grade]["en"])
            local_text[loc] = {
                "headline": grade_msg,
                "spoken_summary": f"{grade_msg} {vfm_verdict if loc == 'en' else ''}".strip(),
                "grade": grade,
                "vfm_verdict": vfm_verdict,
                "action_count": len(safety_actions) + len(ration_actions) + len(storage_actions),
            }

        return {
            "grade": grade,
            "value_for_money": {
                "cost_per_kg_protein_inr": cost_per_kg_protein,
                "benchmark_cost_per_kg_protein_inr": benchmark_cost_protein,
                "band": vfm_band,
                "verdict": vfm_verdict,
            },
            "safety_actions": safety_actions,
            "ration_actions": ration_actions,
            "storage_actions": storage_actions,
            "silage_actions": silage_actions,
            "herd_impacts": herd_impacts,
            "local_text": local_text,
            "is_authoritative": True,
        }
