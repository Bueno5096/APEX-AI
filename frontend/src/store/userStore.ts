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
  trainingFrequency?: number;
  trainingDays?: string[];
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
  authToken: string | null;
  setProfile: (profile: UserProfile) => Promise<void>;
  setGender: (gender: Gender) => Promise<void>;
  updateSettings: (settings: Partial<UserSettings>) => Promise<void>;
  setOnboardingComplete: (complete: boolean) => void;
  setPendingCoachMessage: (message: string | null) => void;
  setAuthToken: (token: string) => Promise<void>;
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
  authToken: null,
  
  setProfile: async (profile: UserProfile) => {
    set({ profile, gender: profile.gender });
    try {
      await AsyncStorage.setItem('coach_profile', JSON.stringify(profile));
      await AsyncStorage.setItem('coach_gender', profile.gender);
    } catch (error) {
      console.error('Error saving profile:', error);
    }
  },
  
  setGender: async (gender: Gender) => {
    const currentProfile = useUserStore.getState().profile;
    const updatedProfile = currentProfile ? { ...currentProfile, gender } : null;
    set({ gender, profile: updatedProfile });
    try {
      if (updatedProfile) {
        await AsyncStorage.setItem('coach_profile', JSON.stringify(updatedProfile));
      }
      await AsyncStorage.setItem('coach_gender', gender);
    } catch (error) {
      console.error('Error saving gender:', error);
    }
  },

  updateSettings: async (newSettings: Partial<UserSettings>) => {
    const settings = { ...useUserStore.getState().settings, ...newSettings };
    set({ settings });
    try {
      await AsyncStorage.setItem('coach_settings', JSON.stringify(settings));
    } catch (error) {
      console.error('Error saving settings:', error);
    }
  },

  setOnboardingComplete: async (complete: boolean) => {
    set({ onboardingComplete: complete });
    await AsyncStorage.setItem('apex_onboarding_complete', complete ? 'true' : 'false');
  },

  setPendingCoachMessage: (message: string | null) => {
    set({ pendingCoachMessage: message });
  },

  setAuthToken: async (token: string) => {
    set({ authToken: token });
    try {
      await AsyncStorage.setItem('apex_auth_token', token);
    } catch (error) {
      console.error('Error saving auth token:', error);
    }
  },
  
  loadUser: async () => {
    try {
      const savedProfile = await AsyncStorage.getItem('coach_profile');
      const savedSettings = await AsyncStorage.getItem('coach_settings');
      const savedGender = await AsyncStorage.getItem('coach_gender');
      const savedOnboarding = await AsyncStorage.getItem('apex_onboarding_complete');
      const savedToken = await AsyncStorage.getItem('apex_auth_token');
      
      const updates: Partial<UserState> = { isLoaded: true };

      if (savedProfile) {
        const parsed = JSON.parse(savedProfile);
        updates.profile = parsed;
        updates.gender = parsed.gender || 'male';
      }
      
      if (savedSettings) {
        updates.settings = JSON.parse(savedSettings);
      }
      
      if (savedGender && (savedGender === 'male' || savedGender === 'female')) {
        updates.gender = savedGender as Gender;
      }

      if (savedOnboarding === 'true') {
        updates.onboardingComplete = true;
      }

      if (savedToken) {
        updates.authToken = savedToken;
      }

      set(updates);
    } catch (error) {
      console.error('Error loading user:', error);
      set({ isLoaded: true });
    }
  },
  
  resetStore: async () => {
    await AsyncStorage.multiRemove([
      'coach_profile', 'coach_settings', 'coach_gender', 'apex_onboarding_complete', 'apex_auth_token',
    ]);
    set({
      profile: null,
      settings: defaultSettings,
      gender: 'male',
      onboardingComplete: false,
      isLoaded: true,
      pendingCoachMessage: null,
      authToken: null,
    });
  },
}));
