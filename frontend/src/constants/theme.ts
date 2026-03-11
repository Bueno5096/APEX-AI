// Coach App - Futuristic Metallic Theme System

export const DARK_THEME = {
  name: 'dark',
  colors: {
    // Backgrounds
    background: '#0A0A0C',
    backgroundSecondary: '#111114',
    card: '#161619',
    cardBorder: '#222228',
    cardHighlight: '#1E1E22',
    
    // Text
    textPrimary: '#E8E8EC',
    textSecondary: '#8A8A94',
    textMuted: '#5A5A64',
    
    // Metallic accents
    metallic: '#3A3A42',
    metallicLight: '#4A4A54',
    metallicDark: '#2A2A32',
    
    // Status colors (muted metallic)
    success: '#4A7A6A',
    warning: '#8A6A4A',
    danger: '#7A4A4A',
    info: '#4A6A8A',
    
    // Muscle readiness colors (metallic)
    muscleRecovered: '#5A8A7A', // Will be replaced by accent
    muscleFatigueMild: '#9A7A5A', // Metallic amber/bronze
    muscleFatigueModerate: '#8A5A4A', // Copper
    muscleOverworked: '#6A3A3A', // Dark crimson metallic
    muscleNeutral: '#3A3A42', // Gunmetal
    
    // Navigation
    tabBar: '#0D0D10',
    tabBarBorder: '#1A1A1E',
  },
  shadows: {
    card: '0 4px 12px rgba(0, 0, 0, 0.4)',
    glow: '0 0 20px',
  },
};

export const LIGHT_THEME = {
  name: 'light',
  colors: {
    // Backgrounds
    background: '#E8E8EC',
    backgroundSecondary: '#F2F2F6',
    card: '#FAFAFA',
    cardBorder: '#D8D8DC',
    cardHighlight: '#FFFFFF',
    
    // Text
    textPrimary: '#1A1A1E',
    textSecondary: '#5A5A64',
    textMuted: '#8A8A94',
    
    // Metallic accents
    metallic: '#C8C8D0',
    metallicLight: '#D8D8E0',
    metallicDark: '#B8B8C0',
    
    // Status colors
    success: '#4A8A6A',
    warning: '#9A7A4A',
    danger: '#8A4A4A',
    info: '#4A6A9A',
    
    // Muscle readiness colors
    muscleRecovered: '#4A8A6A',
    muscleFatigueMild: '#AA8A5A',
    muscleFatigueModerate: '#9A6A4A',
    muscleOverworked: '#7A4A4A',
    muscleNeutral: '#B8B8C0',
    
    // Navigation
    tabBar: '#FAFAFA',
    tabBarBorder: '#E0E0E4',
  },
  shadows: {
    card: '0 4px 12px rgba(0, 0, 0, 0.08)',
    glow: '0 0 20px',
  },
};

// Default accent color - Steel blue (futuristic)
export const DEFAULT_ACCENT_COLOR = '#6B8BA4';

// Accent color presets
export const ACCENT_PRESETS = [
  { name: 'Steel Blue', color: '#6B8BA4' },
  { name: 'Titanium', color: '#8A9AAA' },
  { name: 'Cyber Cyan', color: '#4AA8B8' },
  { name: 'Neon Blue', color: '#3A8ADA' },
  { name: 'Electric Purple', color: '#8A6ABA' },
  { name: 'Plasma Green', color: '#5AAA7A' },
  { name: 'Solar Orange', color: '#DA8A4A' },
  { name: 'Ruby Red', color: '#BA5A6A' },
];

export type ThemeType = typeof DARK_THEME;
export type ThemeName = 'dark' | 'light';
