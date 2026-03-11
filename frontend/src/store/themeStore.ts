import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DARK_THEME, LIGHT_THEME, DEFAULT_ACCENT_COLOR, ThemeType, ThemeName } from '../constants/theme';

interface ThemeState {
  themeName: ThemeName;
  theme: ThemeType;
  accentColor: string;
  setTheme: (name: ThemeName) => void;
  setAccentColor: (color: string) => void;
  loadTheme: () => Promise<void>;
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  themeName: 'dark',
  theme: DARK_THEME,
  accentColor: DEFAULT_ACCENT_COLOR,
  
  setTheme: async (name: ThemeName) => {
    const theme = name === 'dark' ? DARK_THEME : LIGHT_THEME;
    set({ themeName: name, theme });
    await AsyncStorage.setItem('coach_theme', name);
  },
  
  setAccentColor: async (color: string) => {
    set({ accentColor: color });
    await AsyncStorage.setItem('coach_accent', color);
  },
  
  loadTheme: async () => {
    try {
      const savedTheme = await AsyncStorage.getItem('coach_theme');
      const savedAccent = await AsyncStorage.getItem('coach_accent');
      
      if (savedTheme) {
        const theme = savedTheme === 'dark' ? DARK_THEME : LIGHT_THEME;
        set({ themeName: savedTheme as ThemeName, theme });
      }
      
      if (savedAccent) {
        set({ accentColor: savedAccent });
      }
    } catch (error) {
      console.log('Error loading theme:', error);
    }
  },
}));
