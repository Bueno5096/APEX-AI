import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type CoachStyle = 'neutral' | 'direct' | 'supportive';

interface UserProfile {
  id: string;
  name: string;
  height: number; // cm
  weight: number; // kg
  age: number;
  bodyFat?: number;
  trainingExperience: 'beginner' | 'intermediate' | 'advanced';
  fitnessGoals: string[];
}

interface UserSettings {
  coachStyle: CoachStyle;
  voiceEnabled: boolean;
  workoutReminders: boolean;
  recoveryAlerts: boolean;
  coachSuggestions: boolean;
}

interface UserState {
  profile: UserProfile | null;
  settings: UserSettings;
  setProfile: (profile: UserProfile) => void;
  updateSettings: (settings: Partial<UserSettings>) => void;
  loadUser: () => Promise<void>;
}

const defaultSettings: UserSettings = {
  coachStyle: 'neutral',
  voiceEnabled: true,
  workoutReminders: true,
  recoveryAlerts: true,
  coachSuggestions: true,
};

const defaultProfile: UserProfile = {
  id: 'user_1',
  name: 'Athlete',
  height: 178,
  weight: 75,
  age: 28,
  bodyFat: 15,
  trainingExperience: 'intermediate',
  fitnessGoals: ['Build Muscle', 'Improve Strength'],
};

export const useUserStore = create<UserState>((set) => ({
  profile: defaultProfile,
  settings: defaultSettings,
  
  setProfile: async (profile: UserProfile) => {
    set({ profile });
    await AsyncStorage.setItem('coach_profile', JSON.stringify(profile));
  },
  
  updateSettings: async (newSettings: Partial<UserSettings>) => {
    set((state) => {
      const settings = { ...state.settings, ...newSettings };
      AsyncStorage.setItem('coach_settings', JSON.stringify(settings));
      return { settings };
    });
  },
  
  loadUser: async () => {
    try {
      const savedProfile = await AsyncStorage.getItem('coach_profile');
      const savedSettings = await AsyncStorage.getItem('coach_settings');
      
      if (savedProfile) {
        set({ profile: JSON.parse(savedProfile) });
      }
      
      if (savedSettings) {
        set({ settings: JSON.parse(savedSettings) });
      }
    } catch (error) {
      console.log('Error loading user:', error);
    }
  },
}));
