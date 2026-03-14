// COACH — Premium Dual-Theme System
// Dark: Futuristic sci-fi • Light: Soft earth tones

export const DARK_THEME = {
  name: 'dark',
  colors: {
    // Backgrounds — Deep futuristic black with blue tint
    background: '#08080f',
    backgroundSecondary: '#0c0c14',
    card: '#12131a',
    cardSecondary: '#181a24',
    cardBorder: '#1e2030',
    cardHighlight: '#161828',

    // Text — Cool whites and steel blues
    textPrimary: '#e8eaf0',
    textSecondary: '#7880a0',
    textMuted: '#5a6080',

    // Metallic accents — Blue-tinted futuristic
    metallic: '#2a2d40',
    metallicLight: '#3a3d55',
    metallicDark: '#1a1d2e',
    metallicShine: '#a0a8c8',

    // Readiness colors — status indicators
    readinessFatigued: '#8B0000',
    readinessModerate: '#7A4422',
    readinessGood: '#6A6A5A',
    readinessRecovered: '#c0c0c0',

    // Body map base
    bodyBase: '#1e2030',
    bodyOutline: '#2a2d40',

    // Status colors
    success: '#3A8A5A',
    warning: '#8A7A3A',
    danger: '#8B3A3A',
    info: '#4A6A9A',

    // Navigation
    tabBar: '#08080f',
    tabBarBorder: 'transparent',

    // Surfaces
    input: '#1a1d2e',
    divider: '#1e2030',
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
      shadowColor: '#4060a0',
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
    // Backgrounds — Soft off-white, easier on the eyes
    background: '#f5f5f5',
    backgroundSecondary: '#ede9e2',
    card: '#ebe6df',
    cardSecondary: '#e3ddd5',
    cardBorder: '#c8c8c8',
    cardHighlight: '#e8e3dc',

    // Text — Darker for better contrast
    textPrimary: '#1a1a1a',
    textSecondary: '#444444',
    textMuted: '#666666',

    // Metallic — Warm tones
    metallic: '#c8c0b4',
    metallicLight: '#d5cec4',
    metallicDark: '#ddd7cc',
    metallicShine: '#5a5040',

    // Body map
    readinessFatigued: '#B04040',
    bodyBase: '#d0c8be',
    bodyOutline: '#b8b0a4',

    // Surfaces
    input: '#e0d9d0',
    divider: '#c8c8c8',

    // Navigation
    tabBar: '#f5f5f5',
    tabBarBorder: '#c8c8c8',

    // Status — Earth tones
    success: '#4a7a52',
    warning: '#b08a30',
    danger: '#b04040',
    info: '#4a6e8a',
  },
  shadows: {
    ...DARK_THEME.shadows,
    card: {
      shadowColor: '#8a7e6e',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 12,
      elevation: 6,
    },
    cardSmall: {
      shadowColor: '#8a7e6e',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 8,
      elevation: 4,
    },
    glow: {
      shadowColor: '#b8b0a4',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.06,
      shadowRadius: 12,
      elevation: 2,
    },
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
