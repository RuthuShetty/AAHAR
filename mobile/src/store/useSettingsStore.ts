/**
 * AAHAR Mobile — Settings Store (Zustand)
 * Manages language, high-contrast outdoor mode, lite 3D mode, accessibility.
 */

import { create } from 'zustand';
import { SupportedLocaleCode, changeAppLanguage } from '../i18n';

interface SettingsState {
  language: SupportedLocaleCode;
  highContrast: boolean;
  liteMode3D: boolean;
  voiceAutoPlay: boolean;

  setLanguage: (lang: SupportedLocaleCode) => Promise<void>;
  setHighContrast: (enabled: boolean) => void;
  setLiteMode3D: (enabled: boolean) => void;
  setVoiceAutoPlay: (enabled: boolean) => void;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  language: 'hi',
  highContrast: false,
  liteMode3D: false,
  voiceAutoPlay: true,

  setLanguage: async (language) => {
    await changeAppLanguage(language);
    set({ language });
  },
  setHighContrast: (highContrast) => set({ highContrast }),
  setLiteMode3D: (liteMode3D) => set({ liteMode3D }),
  setVoiceAutoPlay: (voiceAutoPlay) => set({ voiceAutoPlay }),
}));
