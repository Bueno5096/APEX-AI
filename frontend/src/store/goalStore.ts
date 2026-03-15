import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface SecondaryGoal {
  type: 'reduce_bodyfat' | 'build_muscle' | 'increase_frequency' | 'maintain_health';
  targetValue: number;
  startingValue: number;
  currentValue: number;
  timeframeWeeks: number;
  startDate: string; // ISO
  isActive: boolean;
}

export interface WeekDay {
  day: string;
  type: 'training' | 'recovery';
  muscleGroups?: string[];
  repRange?: string;
  duration?: number;
  notes?: string;
}

export interface GeneratedPlan {
  weeklySplit: WeekDay[];
  cardioRecommendations: {
    type: string;
    durationMinutes: number;
    timesPerWeek: number;
    timing: string;
  };
  focusAreas: {
    priorityMuscles: string[];
    recoveryMuscles: string[];
  };
  estimatedCompletionDate: string;
  summary: string;
}

interface GoalState {
  secondaryGoal: SecondaryGoal | null;
  hasActiveGoalLayeringPlan: boolean;
  generatedPlan: GeneratedPlan | null;
  coachSuggestionDismissed: boolean;
  setSecondaryGoal: (goal: SecondaryGoal) => Promise<void>;
  setGeneratedPlan: (plan: GeneratedPlan) => Promise<void>;
  clearSecondaryGoal: () => void;
  dismissCoachSuggestion: () => void;
  resetCoachSuggestion: () => void;
  loadGoals: () => Promise<void>;
  resetStore: () => Promise<void>;
}

const GOAL_STORAGE_KEY = 'apex_goal_layering';

export const useGoalStore = create<GoalState>((set, get) => ({
  secondaryGoal: null,
  hasActiveGoalLayeringPlan: false,
  generatedPlan: null,
  coachSuggestionDismissed: false,

  setSecondaryGoal: async (goal: SecondaryGoal) => {
    set({ secondaryGoal: goal, hasActiveGoalLayeringPlan: true });
    const state = get();
    await AsyncStorage.setItem(GOAL_STORAGE_KEY, JSON.stringify({
      secondaryGoal: goal,
      hasActiveGoalLayeringPlan: true,
      generatedPlan: state.generatedPlan,
      coachSuggestionDismissed: state.coachSuggestionDismissed,
    }));
  },

  setGeneratedPlan: async (plan: GeneratedPlan) => {
    set({ generatedPlan: plan });
    const state = get();
    await AsyncStorage.setItem(GOAL_STORAGE_KEY, JSON.stringify({
      secondaryGoal: state.secondaryGoal,
      hasActiveGoalLayeringPlan: state.hasActiveGoalLayeringPlan,
      generatedPlan: plan,
      coachSuggestionDismissed: state.coachSuggestionDismissed,
    }));
  },

  clearSecondaryGoal: async () => {
    set({ secondaryGoal: null, hasActiveGoalLayeringPlan: false, generatedPlan: null });
    await AsyncStorage.removeItem(GOAL_STORAGE_KEY);
  },

  dismissCoachSuggestion: async () => {
    set({ coachSuggestionDismissed: true });
    const state = get();
    await AsyncStorage.setItem(GOAL_STORAGE_KEY, JSON.stringify({
      secondaryGoal: state.secondaryGoal,
      hasActiveGoalLayeringPlan: state.hasActiveGoalLayeringPlan,
      generatedPlan: state.generatedPlan,
      coachSuggestionDismissed: true,
    }));
  },

  resetCoachSuggestion: () => {
    set({ coachSuggestionDismissed: false });
  },

  loadGoals: async () => {
    try {
      const saved = await AsyncStorage.getItem(GOAL_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        set({
          secondaryGoal: parsed.secondaryGoal || null,
          hasActiveGoalLayeringPlan: parsed.hasActiveGoalLayeringPlan || false,
          generatedPlan: parsed.generatedPlan || null,
          coachSuggestionDismissed: parsed.coachSuggestionDismissed || false,
        });
      }
    } catch (e) {
      console.error('Error loading goals:', e);
    }
  },
  
  resetStore: async () => {
    await AsyncStorage.removeItem(GOAL_STORAGE_KEY);
    set({
      secondaryGoal: null,
      hasActiveGoalLayeringPlan: false,
      generatedPlan: null,
      coachSuggestionDismissed: false,
    });
  },
}));
