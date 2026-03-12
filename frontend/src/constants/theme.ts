// APEX AI - Premium Dark UI Theme
// Apple softness × Tesla futurism — OLED-optimized

export const DARK_THEME = {
  name: 'dark',
  colors: {
    // Backgrounds — Pure OLED black
    background: '#000000',
    backgroundSecondary: '#0a0a0a',
    card: '#111111',
    cardSecondary: '#1a1a1a',
    cardBorder: '#2a2a2a',
    cardHighlight: '#141414',

    // Text
    textPrimary: '#ffffff',
    textSecondary: '#8a8a8a',
    textMuted: '#777777',

    // Metallic accents
    metallic: '#3a3a3a',
    metallicLight: '#4a4a4a',
    metallicDark: '#242424',
    metallicShine: '#c0c0c0',

    // Readiness colors — status indicators
    readinessFatigued: '#8B0000',
    readinessModerate: '#7A4422',
    readinessGood: '#6A6A5A',
    readinessRecovered: '#c0c0c0',

    // Body map base
    bodyBase: '#2a2a2a',
    bodyOutline: '#3a3a3a',

    // Status colors — only for indicators
    success: '#3A7A5A',
    warning: '#8A6A3A',
    danger: '#8B3A3A',
    info: '#4A6A8A',

    // Navigation
    tabBar: '#000000',
    tabBarBorder: 'transparent',

    // Surfaces
    input: '#242424',
    divider: '#2e2e2e',
  },

  // Apple-style rounded corners
  borderRadius: {
    none: 0,
    xs: 6,
    sm: 10,
    md: 14,
    lg: 20,
    xl: 24,
    card: 20,
    cardSmall: 14,
    button: 14,
    input: 12,
    pill: 50,
  },

  // Floating card shadows
  shadows: {
    card: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.6,
      shadowRadius: 20,
      elevation: 12,
    },
    cardSmall: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.4,
      shadowRadius: 12,
      elevation: 8,
    },
    glow: {
      shadowColor: '#c0c0c0',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.08,
      shadowRadius: 20,
      elevation: 4,
    },
  },

  // Typography — SF Pro inspired
  typography: {
    fontFamily: 'System',
    monoFamily: 'monospace',
    header: { fontSize: 28, fontWeight: '700' as const, letterSpacing: -0.5 },
    sectionTitle: { fontSize: 13, fontWeight: '600' as const, letterSpacing: 1.5 },
    body: { fontSize: 15, fontWeight: '400' as const, lineHeight: 22 },
    bigValue: { fontSize: 36, fontWeight: '700' as const, letterSpacing: -1 },
  },
};

export const LIGHT_THEME = {
  ...DARK_THEME,
  name: 'light',
  colors: {
    ...DARK_THEME.colors,
    background: '#f5f5f7',
    backgroundSecondary: '#ededf0',
    card: '#eaeaee',
    cardSecondary: '#e4e4e8',
    cardBorder: '#d5d5da',
    cardHighlight: '#e8e8ec',
    textPrimary: '#1a1a1e',
    textSecondary: '#6b6b75',
    textMuted: '#9a9aa5',
    metallic: '#c8c8d0',
    metallicLight: '#d5d5dd',
    metallicDark: '#dcdce2',
    metallicShine: '#4a4a55',
    readinessFatigued: '#C53030',
    bodyBase: '#d0d0d8',
    bodyOutline: '#b8b8c0',
    input: '#e0e0e5',
    divider: '#d5d5da',
    tabBar: '#f5f5f7',
    tabBarBorder: '#d5d5da',
    success: '#2E8B57',
    warning: '#B8860B',
    danger: '#C53030',
    info: '#4682B4',
  },
};

// Default accent color — Silver/Gunmetal
export const DEFAULT_ACCENT_COLOR = '#c0c0c0';

// Accent color presets
export const ACCENT_PRESETS = [
  { name: 'Silver', color: '#c0c0c0' },
  { name: 'Platinum', color: '#9aa0a6' },
  { name: 'Ice Blue', color: '#7aaaca' },
  { name: 'Electric Cyan', color: '#4AAFCC' },
  { name: 'Neon Blue', color: '#3A8ADA' },
  { name: 'Emerald', color: '#4AAA7A' },
  { name: 'Gold', color: '#CAAA4A' },
  { name: 'Rose', color: '#CA7A7A' },
];

export type ThemeType = typeof DARK_THEME;
export type ThemeName = 'dark' | 'light';

// Interpolate between two hex colors
const interpolateColor = (color1: string, color2: string, factor: number): string => {
  const hex = (c: string) => parseInt(c, 16);
  const r1 = hex(color1.slice(1, 3)), g1 = hex(color1.slice(3, 5)), b1 = hex(color1.slice(5, 7));
  const r2 = hex(color2.slice(1, 3)), g2 = hex(color2.slice(3, 5)), b2 = hex(color2.slice(5, 7));
  const r = Math.round(r1 + (r2 - r1) * factor);
  const g = Math.round(g1 + (g2 - g1) * factor);
  const b = Math.round(b1 + (b2 - b1) * factor);
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
};

// Readiness color: accent at 100%, deep crimson at 0%, smooth gradient between
export const getReadinessColor = (score: number, accentColor: string, _theme: ThemeType): string => {
  const clamped = Math.min(Math.max(score, 0), 100);
  const CRIMSON = '#8B0000';
  return interpolateColor(CRIMSON, accentColor, clamped / 100);
};

// Get readiness label
export const getReadinessLabel = (score: number): string => {
  if (score >= 80) return 'Recovered';
  if (score >= 60) return 'Good';
  if (score >= 40) return 'Moderate';
  return 'Fatigued';
};
