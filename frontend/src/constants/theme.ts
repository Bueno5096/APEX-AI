// Apex AI - Premium Futuristic Metallic Theme
// Cybertruck-inspired: Sharp angles, brushed steel, subtle glow

export const DARK_THEME = {
  name: 'dark',
  colors: {
    // Backgrounds - Deep graphite/gunmetal
    background: '#08090A',
    backgroundSecondary: '#0E1012',
    card: '#141618',
    cardBorder: '#1E2124',
    cardHighlight: '#1A1D20',
    
    // Text - Clean metallic whites
    textPrimary: '#E8EAED',
    textSecondary: '#9AA0A6',
    textMuted: '#5F6368',
    
    // Metallic accents - Brushed steel palette
    metallic: '#2D3238',
    metallicLight: '#3C4248',
    metallicDark: '#1A1E22',
    metallicShine: '#4A5258',
    
    // Readiness colors - Metallic style
    readinessFatigued: '#8B3A3A',      // Deep metallic crimson (0-39)
    readinessModerate: '#9A6B3A',      // Metallic amber/copper (40-59)
    readinessGood: '#4A6B8A',          // Muted steel blue (60-79)
    readinessRecovered: '#5A8A6A',     // Will use accent color (80-100)
    
    // Body map base
    bodyBase: '#2A2D32',               // Gunmetal gray for body
    bodyOutline: '#3A3E44',
    
    // Status colors
    success: '#4A8A6A',
    warning: '#9A6B3A',
    danger: '#8B3A3A',
    info: '#4A6B8A',
    
    // Navigation
    tabBar: '#0A0B0D',
    tabBarBorder: '#1A1D20',
  },
  
  // Sharp angular borders - Cybertruck style
  borderRadius: {
    none: 0,
    xs: 2,
    sm: 4,
    md: 6,
    lg: 8,
    card: 4,      // Sharp cards
    button: 4,    // Angular buttons
    input: 4,
  },
  
  // Shadows with glow effect
  shadows: {
    card: '0 2px 8px rgba(0, 0, 0, 0.6)',
    glow: '0 0 20px',
    inset: 'inset 0 1px 0 rgba(255,255,255,0.05)',
  },
  
  // Typography - Clean, technical
  typography: {
    fontFamily: 'System',
    monoFamily: 'monospace',
  },
};

export const LIGHT_THEME = {
  name: 'light',
  colors: {
    // Backgrounds - White metallic/silver
    background: '#E8EAED',
    backgroundSecondary: '#F1F3F4',
    card: '#FFFFFF',
    cardBorder: '#D2D4D8',
    cardHighlight: '#F8F9FA',
    
    // Text
    textPrimary: '#1A1D20',
    textSecondary: '#5F6368',
    textMuted: '#9AA0A6',
    
    // Metallic accents
    metallic: '#C4C8CC',
    metallicLight: '#D8DCDF',
    metallicDark: '#A8AEB4',
    metallicShine: '#E8EAED',
    
    // Readiness colors
    readinessFatigued: '#A84444',
    readinessModerate: '#AA7744',
    readinessGood: '#4477AA',
    readinessRecovered: '#44AA66',
    
    // Body map base
    bodyBase: '#B8BCC2',
    bodyOutline: '#A0A4AA',
    
    // Status colors
    success: '#44AA66',
    warning: '#AA7744',
    danger: '#A84444',
    info: '#4477AA',
    
    // Navigation
    tabBar: '#FFFFFF',
    tabBarBorder: '#E0E2E6',
  },
  
  borderRadius: {
    none: 0,
    xs: 2,
    sm: 4,
    md: 6,
    lg: 8,
    card: 4,
    button: 4,
    input: 4,
  },
  
  shadows: {
    card: '0 2px 8px rgba(0, 0, 0, 0.08)',
    glow: '0 0 20px',
    inset: 'inset 0 1px 0 rgba(255,255,255,0.8)',
  },
  
  typography: {
    fontFamily: 'System',
    monoFamily: 'monospace',
  },
};

// Default accent color - Electric steel blue
export const DEFAULT_ACCENT_COLOR = '#4AAFCC';

// Accent color presets for quick selection
export const ACCENT_PRESETS = [
  { name: 'Electric Cyan', color: '#4AAFCC' },
  { name: 'Neon Blue', color: '#3A8ADA' },
  { name: 'Plasma Green', color: '#4AAA7A' },
  { name: 'Solar Orange', color: '#DA8A4A' },
  { name: 'Crimson Red', color: '#DA4A5A' },
  { name: 'Violet', color: '#8A5ACA' },
  { name: 'Titanium', color: '#7A8A9A' },
  { name: 'Gold', color: '#CAAA4A' },
];

export type ThemeType = typeof DARK_THEME;
export type ThemeName = 'dark' | 'light';

// Get readiness color based on score
export const getReadinessColor = (score: number, accentColor: string, theme: ThemeType): string => {
  if (score >= 80) return accentColor; // Recovered - user accent
  if (score >= 60) return theme.colors.readinessGood; // Good - steel blue
  if (score >= 40) return theme.colors.readinessModerate; // Moderate - amber/copper
  return theme.colors.readinessFatigued; // Fatigued - crimson
};

// Get readiness label
export const getReadinessLabel = (score: number): string => {
  if (score >= 80) return 'Recovered';
  if (score >= 60) return 'Good';
  if (score >= 40) return 'Moderate Fatigue';
  return 'Fatigued';
};
