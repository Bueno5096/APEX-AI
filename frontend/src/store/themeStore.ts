import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DARK_THEME, LIGHT_THEME, DEFAULT_ACCENT_COLOR, ThemeType, ThemeName } from '../constants/theme';

interface ThemeState {
  themeName: ThemeName;
  theme: ThemeType;
  accentColor: string;
  unitSystem: 'metric' | 'imperial';
  setTheme: (name: ThemeName) => void;
  setAccentColor: (color: string) => void;
  setUnitSystem: (system: 'metric' | 'imperial') => void;
  loadTheme: () => Promise<void>;
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  themeName: 'dark',
  theme: DARK_THEME,
  accentColor: DEFAULT_ACCENT_COLOR,
  unitSystem: 'metric',
  
  setTheme: async (name: ThemeName) => {
    const theme = name === 'dark' ? DARK_THEME : LIGHT_THEME;
    set({ themeName: name, theme });
    await AsyncStorage.setItem('apex_theme', name);
  },
  
  setAccentColor: async (color: string) => {
    set({ accentColor: color });
    await AsyncStorage.setItem('apex_accent', color);
  },
  
  setUnitSystem: async (system: 'metric' | 'imperial') => {
    set({ unitSystem: system });
    await AsyncStorage.setItem('apex_units', system);
  },
  
  loadTheme: async () => {
    try {
      const savedTheme = await AsyncStorage.getItem('apex_theme');
      const savedAccent = await AsyncStorage.getItem('apex_accent');
      const savedUnits = await AsyncStorage.getItem('apex_units');
      
      if (savedTheme) {
        const theme = savedTheme === 'dark' ? DARK_THEME : LIGHT_THEME;
        set({ themeName: savedTheme as ThemeName, theme });
      }
      
      if (savedAccent) {
        set({ accentColor: savedAccent });
      }
      
      if (savedUnits) {
        set({ unitSystem: savedUnits as 'metric' | 'imperial' });
      }
    } catch (error) {
      console.log('Error loading theme:', error);
    }
  },
}));

// Unit conversion helpers
export const convertWeight = (kg: number, toImperial: boolean): number => {
  return toImperial ? kg * 2.20462 : kg;
};

export const convertHeight = (cm: number, toImperial: boolean): { feet: number; inches: number } | number => {
  if (toImperial) {
    const totalInches = cm / 2.54;
    const feet = Math.floor(totalInches / 12);
    const inches = Math.round(totalInches % 12);
    return { feet, inches };
  }
  return cm;
};

export const formatWeight = (kg: number, isImperial: boolean): string => {
  if (isImperial) {
    return `${Math.round(kg * 2.20462)} lbs`;
  }
  return `${kg} kg`;
};

export const formatHeight = (cm: number, isImperial: boolean): string => {
  if (isImperial) {
    const totalInches = cm / 2.54;
    const feet = Math.floor(totalInches / 12);
    const inches = Math.round(totalInches % 12);
    return `${feet}'${inches}"`;
  }
  return `${cm} cm`;
};
