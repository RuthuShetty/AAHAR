/**
 * AAHAR Mobile — 8-Language i18n System
 * Languages: en, hi, pa, mr, gu, te, kn, bn
 * 100% offline bundled.
 */

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import en from './locales/en.json';
import hi from './locales/hi.json';
import pa from './locales/pa.json';
import mr from './locales/mr.json';
import gu from './locales/gu.json';
import te from './locales/te.json';
import kn from './locales/kn.json';
import bn from './locales/bn.json';

export const SUPPORTED_LOCALES = [
  { code: 'en', name: 'English', nativeName: 'English', flag: 'EN' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', flag: 'HI' },
  { code: 'pa', name: 'Punjabi', nativeName: 'ਪੰਜਾਬੀ', flag: 'PA' },
  { code: 'mr', name: 'Marathi', nativeName: 'मराठी', flag: 'MR' },
  { code: 'gu', name: 'Gujarati', nativeName: 'ગુજરાતી', flag: 'GU' },
  { code: 'te', name: 'Telugu', nativeName: 'తెలుగు', flag: 'TE' },
  { code: 'kn', name: 'Kannada', nativeName: 'ಕನ್ನಡ', flag: 'KN' },
  { code: 'bn', name: 'Bengali', nativeName: 'বাংলা', flag: 'BN' },
] as const;

export type SupportedLocaleCode = (typeof SUPPORTED_LOCALES)[number]['code'];

export const resources = {
  en: { translation: en },
  hi: { translation: hi },
  pa: { translation: pa },
  mr: { translation: mr },
  gu: { translation: gu },
  te: { translation: te },
  kn: { translation: kn },
  bn: { translation: bn },
};

// Initialize i18next
if (!i18n.isInitialized) {
  i18n
    .use(initReactI18next)
    .init({
      resources,
      lng: 'hi', // Hindi is first-class default in rural Indian dairy belts
      fallbackLng: 'en',
      interpolation: {
        escapeValue: false, // React already safe from XSS
      },
      react: {
        useSuspense: false,
      },
    });
}

export async function changeAppLanguage(lang: SupportedLocaleCode): Promise<void> {
  await i18n.changeLanguage(lang);
}

export default i18n;
