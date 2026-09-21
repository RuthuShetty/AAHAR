/**
 * AAHAR Mobile — Voice-First Offline Speech Synthesizer & Audio Prompts
 * Implements low-literacy voice support across 8 Indian languages.
 */

import { FeedGrade, FeedType } from '../types/contracts';
import { SupportedLocaleCode } from './index';

export interface SpokenAdvisoryPrompt {
  gradeSentence: string;
  nutritionSentence: string;
  safetySentence?: string;
  actionSentence: string;
}

export interface TTSAdvisoryInput {
  feedType: FeedType;
  grade: FeedGrade;
  cp: number;
  moisture: number;
  ureaDetected?: boolean;
  ureaPct?: number;
  aflatoxinB1Ppb?: number;
  vfmVerdict?: string;
  overpaidPerKgProtein?: number;
}

export const SPOKEN_PROMPTS: Record<SupportedLocaleCode, {
  gradeA: string;
  gradeB: string;
  gradeC: string;
  gradeReject: string;
  ureaWarning: (pct: number) => string;
  aflatoxinWarning: string;
  priceOverpriced: (extra: number) => string;
  dryFodderAdvice: string;
}> = {
  en: {
    gradeA: "Your feed sample is Grade A, excellent quality with balanced nutrients.",
    gradeB: "Your feed sample is Grade B, acceptable quality. Maintain storage conditions.",
    gradeC: "Your feed sample is Grade C, low nutrient quality. Ration supplement required.",
    gradeReject: "Warning! This feed is rejected. It contains dangerous adulterants or toxins. Do not feed to cattle.",
    ureaWarning: (pct) => `Dangerous urea adulteration detected at ${pct.toFixed(1)} percent. Do not feed!`,
    aflatoxinWarning: "High mould and aflatoxin risk. Do not feed to pregnant or young animals. Send sample to lab.",
    priceOverpriced: (extra) => `You are overpaying ₹ ${extra} per kg of protein compared to market rate.`,
    dryFodderAdvice: "Dry your fodder to under 14% moisture within 3 days to prevent mould growth.",
  },
  hi: {
    gradeA: "आपके चारे का नमूना ग्रेड ए है, उत्तम गुणवत्ता और संतुलित पोषक तत्वों से भरपूर।",
    gradeB: "आपके चारे का नमूना ग्रेड बी है, संतोषजनक गुणवत्ता। नमी से बचाएं।",
    gradeC: "आपके चारे का नमूना ग्रेड सी है, पोषक तत्वों की कमी है। अतिरिक्त खल या दाना दें।",
    gradeReject: "सावधान! यह चारा अस्वीकार है। इसमें मिलावट या ज़हरीला तत्व मिला है। पशुओं को बिल्कुल न खिलाएं।",
    ureaWarning: (pct) => `खतरनाक यूरिया मिलावट ${pct.toFixed(1)} प्रतिशत पाई गई है। इसे पशुओं को न खिलाएं!`,
    aflatoxinWarning: "फफूंद और एफ्लाटॉक्सिन का भारी खतरा। गाभिन और छोटे पशुओं को न दें। प्रयोगशाला जांच करवाएं।",
    priceOverpriced: (extra) => `आप बाजार भाव से ₹ ${extra} प्रति किलो प्रोटीन अधिक दे रहे हैं। यह महंगा है।`,
    dryFodderAdvice: "फफूंद से बचाने के लिए चारे को 3 दिन में धूप में सुखाकर नमी 14% से कम करें।",
  },
  pa: {
    gradeA: "ਤੁਹਾਡੀ ਪਸ਼ੂ ਖ਼ੁਰਾਕ ਗ੍ਰੇਡ ਏ ਹੈ, ਬਹੁਤ ਵਧੀਆ ਕੁਆਲਿਟੀ ਅਤੇ ਸੰਤੁਲਿਤ ਪੋਸ਼ਕ ਤੱਤ।",
    gradeB: "ਤੁਹਾਡੀ ਪਸ਼ੂ ਖ਼ੁਰਾਕ ਗ੍ਰੇਡ ਬੀ ਹੈ, ਠੀਕ ਕੁਆਲਿਟੀ। ਸਿੱਲ੍ਹ ਤੋਂ ਬਚਾਓ।",
    gradeC: "ਤੁਹਾਡੀ ਪਸ਼ੂ ਖ਼ੁਰਾਕ ਗ੍ਰੇਡ ਸੀ ਹੈ, ਪੋਸ਼ਕ ਤੱਤ ਘੱਟ ਹਨ। ਵਾਧੂ ਖ਼ਲ ਮਿਲਾਉਣ ਦੀ ਲੋੜ ਹੈ।",
    gradeReject: "ਖ਼ਬਰਦਾਰ! ਇਹ ਖ਼ੁਰਾਕ ਰੱਦ ਹੈ। ਇਸ ਵਿੱਚ ਖ਼ਤਰਨਾਕ ਮਿਲਾਵਟ ਜਾਂ ਉੱਲੀ ਹੈ। ਪਸ਼ੂਆਂ ਨੂੰ ਬਿਲਕੁਲ ਨਾ ਪਾਓ।",
    ureaWarning: (pct) => `ਇਸ ਵਿੱਚ ${pct.toFixed(1)} ਫ਼ੀਸਦੀ ਯੂਰੀਆ ਮਿਲਾਵਟ ਫੜੀ ਗਈ ਹੈ। ਪਸ਼ੂਆਂ ਨੂੰ ਬਿਲਕੁਲ ਨਾ ਪਾਓ!`,
    aflatoxinWarning: "ਉੱਲੀ ਅਤੇ ਜ਼ਹਿਰ ਦਾ ਵੱਡਾ ਖ਼ਤਰਾ। ਗੱਭਣ ਅਤੇ ਛੋਟੇ ਪਸ਼ੂਆਂ ਨੂੰ ਨਾ ਦਿਓ। ਲੈਬ ਵਿੱਚ ਟੈਸਟ ਕਰਵਾਓ।",
    priceOverpriced: (extra) => `ਤੁਸੀਂ ਬਾਜ਼ਾਰ ਮੁੱਲ ਨਾਲੋਂ ₹ ${extra} ਪ੍ਰਤੀ ਕਿੱਲੋ ਪ੍ਰੋਟੀਨ ਵੱਧ ਦੇ ਰਹੇ ਹੋ। ਇਹ ਮਹਿੰਗੀ ਹੈ।`,
    dryFodderAdvice: "ਉੱਲੀ ਤੋਂ ਬਚਾਉਣ ਲਈ 3 ਦਿਨਾਂ ਅੰਦਰ ਚਾਰੇ ਨੂੰ ਸੁਕਾ ਕੇ ਨਮੀ 14% ਤੋਂ ਘੱਟ ਕਰੋ।",
  },
  mr: {
    gradeA: "तुमचा चाऱ्याचा नमुना ग्रेड ए आहे, उत्कृष्ट गुणवत्ता आणि संतुलित पोषण।",
    gradeB: "तुमचा चाऱ्याचा नमुना ग्रेड बी आहे, समाधानकारक गुणवत्ता।",
    gradeC: "तुमचा चाऱ्याचा नमुना ग्रेड सी आहे, पोषण कमी आहे। पूरक आहार द्यावा।",
    gradeReject: "सावधान! हा चारा नाकारण्यात आला आहे. यामध्ये धोकादायक भेसळ किंवा बुरशी आहे. जनावरांना खायला घालू नका.",
    ureaWarning: (pct) => `${pct.toFixed(1)} टक्के धोकादायक युरिया भेसळ आढळली आहे. जनावरांना देऊ नका!`,
    aflatoxinWarning: "बुरशीचा तीव्र धोका. गाभण व लहान जनावरांना देऊ नका. प्रयोगशाळेत पाठवा.",
    priceOverpriced: (extra) => `तुम्ही बाजारभावापेक्षा ₹ ${extra} प्रति किलो प्रोटीन जास्त मोजत आहात.`,
    dryFodderAdvice: "बुरशी रोखण्यासाठी ३ दिवसांत चारा उन्हात सुकवून ओलावा १४% पेक्षा कमी करा.",
  },
  gu: {
    gradeA: "તમારા ખોરાકનો નમૂનો ગ્રેડ એ છે, ઉત્કૃષ્ટ ગુણવત્તા અને સંતુલિત પોષણ.",
    gradeB: "તમારા ખોરાકનો નમૂનો ગ્રેਡ બી છે, સ્વીકાર્ય ગુણવત્તા.",
    gradeC: "તમારા ખોરાકનો નમૂનો ગ્રેડ સી છે, પોષક તત્વો ઓછા છે. વધારાનો ખોરાક આપો.",
    gradeReject: "સાવધાન! આ ખોરાક નકારવામાં આવ્યો છે. તેમાં જોખમી ભેળસેળ છે. પશુઓને ન આપો.",
    ureaWarning: (pct) => `${pct.toFixed(1)} ટકા જોખમી યુરિયા ભેળસેળ મળી આવી છે. પશુઓને ન આપો!`,
    aflatoxinWarning: "ફૂગનું ભારે જોખમ. ગાભણ અને નાના પશુઓને ન આપો. લેબમાં તપાસ કરાવો.",
    priceOverpriced: (extra) => `તમે બજારભાવ કરતાં ₹ ${extra} પ્રતિ કિલો પ્રોટીન વધુ ચૂકવી રહ્યા છો.`,
    dryFodderAdvice: "ફૂગથી બચાવવા ૩ દિવસમાં ખોરાક સૂકવી ભેજ ૧૪% થી ઓછો કરો.",
  },
  te: {
    gradeA: "మీ దాణా నమూనా గ్రేడ్ ఏ, అత్యుత్తమ నాణ్యత మరియు సమతుల్య పోషకాలు.",
    gradeB: "మీ దాణా నమూనా గ్రేడ్ బి, ఆమోదయోగ్యమైన నాణ్యత.",
    gradeC: "మీ దాణా నమూనా గ్రేడ్ సి, పోషకాలు తక్కువగా ఉన్నాయి. అనుబంధ దాణా ఇవ్వండి.",
    gradeReject: "హెచ్చరిక! ఈ దాణా తిరస్కరించబడింది. ప్రమాదకరమైన కల్తీ లేదా విషపదార్థాలు ఉన్నాయి. పశువులకు పెట్టవద్దు.",
    ureaWarning: (pct) => `${pct.toFixed(1)} శాతం ప్రమాదకరమైన యూరియా కల్తీ గుర్తించబడింది. పశువులకు పెట్టవద్దు!`,
    aflatoxinWarning: "శిలీంధ్రం మరియు టాక్సిన్ ప్రమాదం. చూడి మరియు చిన్న దూడలకు పెట్టవద్దు. ల్యాబ్‌కు పంపండి.",
    priceOverpriced: (extra) => `మార్కెట్ ధర కంటే ₹ ${extra} ప్రతి కేజీ ప్రోటీన్‌కు ఎక్కువ చెల్లిస్తున్నారు.`,
    dryFodderAdvice: "శిలీంధ్రం రాకుండా 3 రోజుల్లో ఎండబెట్టి తేమను 14% కంటే తగ్గించండి.",
  },
  kn: {
    gradeA: "ನಿಮ್ಮ ಮೇವಿನ ಮಾದರಿ ಗ್ರೇಡ್ ಎ, ಅತ್ಯುತ್ತಮ ಗುಣಮಟ್ಟ ಮತ್ತು ಸಮತೋಲಿತ ಪೋಷಕಾಂಶಗಳು.",
    gradeB: "ನಿಮ್ಮ ಮೇವಿನ ಮಾದರಿ ಗ್ರೇಡ್ ಬಿ, ಸ್ವೀಕಾರಾರ್ಹ ಗುಣಮಟ್ಟ.",
    gradeC: "ನಿಮ್ಮ ಮೇವಿನ ಮಾದರಿ ಗ್ರೇಡ್ ಸಿ, ಪೋಷಕಾಂಶಗಳ ಕೊರತೆಯಿದೆ. ಪೂರಕ ಆಹಾರ ನೀಡಿ.",
    gradeReject: "ಎಚ್ಚರಿಕೆ! ಈ ಮೇವನ್ನು ತಿರಸ್ಕರಿಸಲಾಗಿದೆ. ಅಪಾಯಕಾರಿ ಕಲಬೆರಕೆ ಇದೆ. ದನಗಳಿಗೆ ತಿನ್ನಿಸಬೇಡಿ.",
    ureaWarning: (pct) => `${pct.toFixed(1)} ಪ್ರತಿಶತ ಅಪಾಯಕಾರಿ ಯೂರಿಯಾ ಕಲಬೆರಕೆ ಕಂಡುಬಂದಿದೆ. ತಿನ್ನಿಸಬೇಡಿ!`,
    aflatoxinWarning: "ಶಿಲೀಂಧ್ರದ ಅಪಾಯ. ಗರ್ಭಿಣಿ ಮತ್ತು ಸಣ್ಣ ಕರುಗಳಿಗೆ ಹಾಕಬೇಡಿ. ಲ್ಯಾಬ್‌ಗೆ ಕಳುಹಿಸಿ.",
    priceOverpriced: (extra) => `ಮಾರುಕಟ್ಟೆ ದರಕ್ಕಿಂತ ಪ್ರತಿ ಕೆಜಿ ಪ್ರೋಟೀನ್‌ಗೆ ₹ ${extra} ಹೆಚ್ಚು ಪಾವತಿಸುತ್ತಿದ್ದೀರಿ.`,
    dryFodderAdvice: "ಶಿಲೀಂಧ್ರ ತಡೆಯಲು 3 ದಿನಗಳಲ್ಲಿ ಮೇವನ್ನು ಒಣಗಿಸಿ ತೇವಾಂಶವನ್ನು 14% ಕ್ಕಿಂತ ಕಡಿಮೆ ಮಾಡಿ.",
  },
  bn: {
    gradeA: "আপনার খাদ্যের নমুনা গ্রেড এ, চমৎকার মান ও সুষম পুষ্টিসমৃদ্ধ।",
    gradeB: "আপনার খাদ্যের নমুনা গ্রেড বি, গ্রহণযোগ্য মান।",
    gradeC: "আপনার খাদ্যের নমুনা গ্রেড সি, পুষ্টির ঘাটতি রয়েছে। সম্পূরক খাদ্য দিন।",
    gradeReject: "সতর্কতা! এই খাদ্য বাতিল করা হয়েছে। ক্ষতিকর ভেজাল বা ছত্রাক রয়েছে। গবাদি পশুকে খাওয়াবেন না।",
    ureaWarning: (pct) => `${pct.toFixed(1)} শতাংশ মারাত্মক ইউরিয়া ভেজাল পাওয়া গেছে। খাওয়াবেন না!`,
    aflatoxinWarning: "ছত্রাকের তীব্র ঝুঁকি। গর্ভবতী ও বাছুরকে খাওয়াবেন না। ল্যাবে পরীক্ষা করান।",
    priceOverpriced: (extra) => `বাজারদরের চেয়ে প্রতি কেজি প্রোটিনে ₹ ${extra} বেশি দিচ্ছেন।`,
    dryFodderAdvice: "ছত্রাক রোধ করতে ৩ দিনে রোদে শুকিয়ে আর্দ্রতা ১৪% এর নিচে নামিয়ে আনুন।",
  },
};

export class SpeechSynthesizer {
  private isSpeaking = false;

  speak(text: string, _locale: SupportedLocaleCode = 'hi'): void {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.onend = () => {
        this.isSpeaking = false;
      };
      this.isSpeaking = true;
      window.speechSynthesis.speak(utterance);
    }
  }

  stop(): void {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      this.isSpeaking = false;
    }
  }

  getIsSpeaking(): boolean {
    return this.isSpeaking;
  }
}

export const speechSynthesizer = new SpeechSynthesizer();

export function generateSpokenAdvisory(input: TTSAdvisoryInput, locale: SupportedLocaleCode = 'hi'): string {
  const prompts = SPOKEN_PROMPTS[locale] || SPOKEN_PROMPTS.hi;
  const parts: string[] = [];

  switch (input.grade) {
    case 'A': parts.push(prompts.gradeA); break;
    case 'B': parts.push(prompts.gradeB); break;
    case 'C': parts.push(prompts.gradeC); break;
    case 'REJECT': parts.push(prompts.gradeReject); break;
  }

  if (input.ureaDetected) {
    parts.push(prompts.ureaWarning(input.ureaPct ?? 2.0));
  }
  if ((input.aflatoxinB1Ppb ?? 0) > 20) {
    parts.push(prompts.aflatoxinWarning);
  }

  if (input.overpaidPerKgProtein && input.overpaidPerKgProtein > 0) {
    parts.push(prompts.priceOverpriced(input.overpaidPerKgProtein));
  }

  return parts.join(' ');
}
