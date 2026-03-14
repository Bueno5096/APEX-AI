import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type CoachStyle = 'neutral' | 'direct' | 'supportive';
export type Gender = 'male' | 'female';
export type TrainingStyle = 'bodybuilding' | 'powerlifting' | 'calisthenics' | 'yoga' | 'pilates' | 'sport_specific' | 'crossfit' | 'hybrid';
export type TrainingSplit = 'full_body' | 'upper_lower' | 'push_pull_legs' | 'fresh_muscle' | 'bro_split' | 'arnold_split' | 'athletic' | 'bodyweight_only';

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
  trainingDaysPerWeek?: number;
  workoutLocation?: string;
  injuries?: string | null;
  trainingStyle?: TrainingStyle;
  trainingSplit?: TrainingSplit;
  sport?: string;
  hybridStyles?: TrainingStyle[];
}

interface UserSettings {
  coachStyle: CoachStyle;
  voiceEnabled: boolean;
  speechRate: number;
  workoutReminders: boolean;
  recoveryAlerts: boolean;
  coachSuggestions: boolean;
}

interface UserState {
  profile: UserProfile | null;
  settings: UserSettings;
  gender: Gender;
  onboardingComplete: boolean;
  isLoaded: boolean;
  pendingCoachMessage: string | null;
  setProfile: (profile: UserProfile) => void;
  setGender: (gender: Gender) => void;
  updateSettings: (settings: Partial<UserSettings>) => void;
  setOnboardingComplete: (complete: boolean) => void;
  setPendingCoachMessage: (message: string | null) => void;
  loadUser: () => Promise<void>;
  resetStore: () => Promise<void>;
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
  trainingDaysPerWeek: 4,
  workoutLocation: 'Gym',
  injuries: null,
};

export const useUserStore = create<UserState>((set) => ({
  profile: defaultProfile,
  settings: defaultSettings,
  gender: 'male',
  onboardingComplete: false,
  isLoaded: false,
  pendingCoachMessage: null,
  
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

  setOnboardingComplete: async (complete: boolean) => {
    set({ onboardingComplete: complete });
    await AsyncStorage.setItem('apex_onboarding_complete', complete ? 'true' : 'false');
  },

  setPendingCoachMessage: (message: string | null) => {
    set({ pendingCoachMessage: message });
  },
  
  loadUser: async () => {
    try {
      const savedProfile = await AsyncStorage.getItem('coach_profile');
      const savedSettings = await AsyncStorage.getItem('coach_settings');
      const savedGender = await AsyncStorage.getItem('coach_gender');
      const savedOnboarding = await AsyncStorage.getItem('apex_onboarding_complete');
      
      const updates: Partial<UserState> = { isLoaded: true };

      if (savedProfile) {
        const parsed = JSON.parse(savedProfile);
        updates.profile = parsed;
        updates.gender = parsed.gender || 'male';
      }
      
      if (savedSettings) {
        updates.settings = JSON.parse(savedSettings);
      }
      
      if (savedGender) {
        updates.gender = savedGender as Gender;
      }

      if (savedOnboarding === 'true') {
        updates.onboardingComplete = true;
      }

      set(updates);
    } catch (error) {
      console.log('Error loading user:', error);
      set({ isLoaded: true });
    }
  },
  
  resetStore: async () => {
    await AsyncStorage.multiRemove([
      'coach_profile', 'coach_settings', 'coach_gender', 'apex_onboarding_complete',
    ]);
    set({
      profile: null,
      settings: defaultSettings,
      gender: 'male',
      onboardingComplete: false,
      isLoaded: true,
      pendingCoachMessage: null,
    });
  },
}));
