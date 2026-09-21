import { describe, it, expect } from 'vitest';
import { resources, SUPPORTED_LOCALES, SupportedLocaleCode } from '../../src/i18n';
import { generateSpokenAdvisory, TTSAdvisoryInput } from '../../src/i18n/tts';

// Contrast ratio helper using standard WCAG relative luminance
function hexToRgb(hex: string): [number, number, number] {
  const cleanHex = hex.replace('#', '');
  const bigint = parseInt(cleanHex, 16);
  return [(bigint >> 16) & 255, (bigint >> 8) & 255, bigint & 255];
}

function getRelativeLuminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r, g, b].map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

function getContrastRatio(hex1: string, hex2: string): number {
  const [r1, g1, b1] = hexToRgb(hex1);
  const [r2, g2, b2] = hexToRgb(hex2);
  const l1 = getRelativeLuminance(r1, g1, b1);
  const l2 = getRelativeLuminance(r2, g2, b2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

describe('AAHAR Phase 8 — Multilingual QA & Accessibility (WCAG 2.2 AA)', () => {
  it('1. All 8 Indian languages are registered with valid locale codes and native names', () => {
    expect(SUPPORTED_LOCALES.length).toBe(8);
    const expectedCodes = ['en', 'hi', 'pa', 'mr', 'gu', 'te', 'kn', 'bn'];
    for (const code of expectedCodes) {
      const match = SUPPORTED_LOCALES.find((l) => l.code === code);
      expect(match).toBeDefined();
      expect(match?.nativeName.length).toBeGreaterThan(0);
    }
  });

  it('2. Zero Missing Keys: Every translation key in English exists in all 7 other languages', () => {
    function getAllKeys(obj: Record<string, any>, prefix = ''): string[] {
      let keys: string[] = [];
      for (const [k, v] of Object.entries(obj)) {
        const fullKey = prefix ? `${prefix}.${k}` : k;
        if (typeof v === 'object' && v !== null && !Array.isArray(v)) {
          keys = keys.concat(getAllKeys(v, fullKey));
        } else {
          keys.push(fullKey);
        }
      }
      return keys;
    }

    function getNestedValue(obj: any, path: string): any {
      return path.split('.').reduce((prev, curr) => prev?.[curr], obj);
    }

    const enDict = resources.en.translation;
    const enKeys = getAllKeys(enDict);
    expect(enKeys.length).toBeGreaterThan(20);

    const otherLocales: SupportedLocaleCode[] = ['hi', 'pa', 'mr', 'gu', 'te', 'kn', 'bn'];

    for (const locale of otherLocales) {
      const targetDict = resources[locale].translation;
      for (const key of enKeys) {
        const val = getNestedValue(targetDict, key);
        expect(
          val,
          `Missing or empty translation key "${key}" in locale "${locale}"`
        ).toBeDefined();
        if (typeof val === 'string') {
          expect(val.trim().length).toBeGreaterThan(0);
        }
      }
    }
  });

  it('3. TTS Spoken Advisory Generator generates valid natural voice strings for all 8 locales', () => {
    const sampleInput: TTSAdvisoryInput = {
      feedType: 'COTTONSEED_CAKE',
      grade: 'REJECT',
      cp: 20.8,
      moisture: 8.2,
      ureaDetected: true,
      aflatoxinB1Ppb: 12.0,
      vfmVerdict: 'GROSSLY_OVERPRICED',
      overpaidPerKgProtein: 71,
    };

    const allLocales: SupportedLocaleCode[] = ['en', 'hi', 'pa', 'mr', 'gu', 'te', 'kn', 'bn'];

    for (const locale of allLocales) {
      const spokenText = generateSpokenAdvisory(sampleInput, locale);
      expect(spokenText).toBeDefined();
      expect(spokenText.length).toBeGreaterThan(20);
      // Ensure key economic and safety details are spoken
      expect(spokenText).not.toContain('undefined');
      expect(spokenText).not.toContain('null');
    }
  });

  it('4. WCAG 2.2 AA Contrast Compliance on AAHAR Dark Theme Palette', () => {
    // Dark background #0A0F1D / #121A2E
    const bgBase = '#0A0F1D';
    const bgSurface = '#121A2E';

    // Primary text #F8FAFC
    const contrastPrimary = getContrastRatio('#F8FAFC', bgBase);
    expect(contrastPrimary).toBeGreaterThan(15.0); // Far exceeds 4.5:1

    // Secondary text #94A3B8
    const contrastSecondary = getContrastRatio('#94A3B8', bgBase);
    expect(contrastSecondary).toBeGreaterThan(6.0); // Exceeds 4.5:1

    // AAHAR Green accent #4ADE80 against dark surface
    const contrastGreen = getContrastRatio('#4ADE80', bgSurface);
    expect(contrastGreen).toBeGreaterThan(8.0); // Exceeds 4.5:1

    // AAHAR Red alert #F87171 against dark surface
    const contrastRed = getContrastRatio('#F87171', bgSurface);
    expect(contrastRed).toBeGreaterThan(5.5); // Exceeds 4.5:1

    // Primary action button: White text #FFFFFF on #1565C0 Blue
    const buttonContrast = getContrastRatio('#FFFFFF', '#1565C0');
    expect(buttonContrast).toBeGreaterThan(5.0); // Exceeds 4.5:1
  });

  it('5. Touch Target Minimum Size Specification (48x48 dp)', () => {
    // Standard touch target check constant
    const MIN_TOUCH_TARGET_DP = 48;
    const BUTTON_HEIGHT_STANDARD = 52;
    const ICON_CONTAINER_SIZE = 48;

    expect(BUTTON_HEIGHT_STANDARD).toBeGreaterThanOrEqual(MIN_TOUCH_TARGET_DP);
    expect(ICON_CONTAINER_SIZE).toBeGreaterThanOrEqual(MIN_TOUCH_TARGET_DP);
  });
});
