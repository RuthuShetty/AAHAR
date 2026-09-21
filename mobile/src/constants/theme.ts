/**
 * AAHAR Mobile — Design System & Theme Tokens
 * Adheres to Section 6.3 Visual Language and WCAG 2.2 AA accessibility.
 */

export const THEME = {
  colors: {
    background: '#F8FAFC',
    surface: '#FFFFFF',
    card: '#FFFFFF',
    cardElevated: '#FFFFFF',
    border: '#E2E8F0',
    borderLight: '#CBD5E1',

    textPrimary: '#0F172A',
    textSecondary: '#334155',
    textMuted: '#64748B',

    // Semantic colours for light mode
    good: '#16A34A',      // Green - good
    caution: '#D97706',   // Amber - caution
    danger: '#DC2626',    // Red - danger / reject
    data: '#2563EB',      // Blue - data
    accent: '#0284C7',    // Sky / Cyan - interactive
    primary: '#0284C7',   // Primary brand
    info: '#2563EB',      // Info blue
    muted: '#64748B',     // Muted slate

    // High-contrast outdoor overrides (sunlight readable)
    outdoor: {
      background: '#FFFFFF',
      surface: '#F8FAFC',
      textPrimary: '#000000',
      border: '#000000',
    },
  },
  typography: {
    h1: { fontSize: 20, fontWeight: '700' as const, lineHeight: 26 },
    h2: { fontSize: 16, fontWeight: '700' as const, lineHeight: 22 },
    h3: { fontSize: 14, fontWeight: '600' as const, lineHeight: 18 },
    body: { fontSize: 13, fontWeight: '400' as const, lineHeight: 18 },
    caption: { fontSize: 11, fontWeight: '400' as const, lineHeight: 14 },
    badge: { fontSize: 11, fontWeight: '600' as const, letterSpacing: 0.3 },
  },
  spacing: {
    xs: 3,
    sm: 6,
    md: 12,
    lg: 18,
    xl: 24,
  },
  touchTargetMin: 44,
  borderRadius: {
    sm: 6,
    md: 8,
    lg: 12,
    full: 9999,
  },
};
