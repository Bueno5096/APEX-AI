import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type CoachStyle = 'neutral' | 'direct' | 'supportive';
export type Gender = 'male' | 'female';

interface UserProfile {
  id: string;
  name: string;
  height: number; // cm
  weight: number; // kg
  age: number;
  bodyFat?: number;
  trainingExperience: 'beginner' | 'intermediate' | 'advanced';
  fitnessGoals: string[];
  gender: Gender;
}

interface UserSettings {
  coachStyle: CoachStyle;
  voiceEnabled: boolean;
  speechRate: number; // 0.5 to 2.0
  workoutReminders: boolean;
  recoveryAlerts: boolean;
  coachSuggestions: boolean;
}

interface UserState {
  profile: UserProfile | null;
  settings: UserSettings;
  gender: Gender;
  setProfile: (profile: UserProfile) => void;
  setGender: (gender: Gender) => void;
  updateSettings: (settings: Partial<UserSettings>) => void;
  loadUser: () => Promise<void>;
}

const defaultSettings: UserSettings = {
  coachStyle: 'neutral',
  voiceEnabled: false,
  speechRate: 1.0,
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
  gender: 'male',
};

export const useUserStore = create<UserState>((set) => ({
  profile: defaultProfile,
  settings: defaultSettings,
  gender: 'male',
  
  setProfile: async (profile: UserProfile) => {
    set({ profile, gender: profile.gender });
    await AsyncStorage.setItem('coach_profile', JSON.stringify(profile));
    await AsyncStorage.setItem('coach_gender', profile.gender);
  },
  
  setGender: async (gender: Gender) => {
    set((state) => {
      const updatedProfile = state.profile ? { ...state.profile, gender } : null;
      if (updatedProfile) {
        AsyncStorage.setItem('coach_profile', JSON.stringify(updatedProfile));
      }
      AsyncStorage.setItem('coach_gender', gender);
      return { gender, profile: updatedProfile };
    });
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
      const savedGender = await AsyncStorage.getItem('coach_gender');
      
      if (savedProfile) {
        const parsed = JSON.parse(savedProfile);
        set({ profile: parsed, gender: parsed.gender || 'male' });
      }
      
      if (savedSettings) {
        set({ settings: JSON.parse(savedSettings) });
      }
      
      if (savedGender) {
        set({ gender: savedGender as Gender });
      }
    } catch (error) {
      console.log('Error loading user:', error);
    }
  },
}));
