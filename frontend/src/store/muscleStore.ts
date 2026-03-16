import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { EXERCISE_MAPPINGS, MuscleRegionId, MUSCLE_REGIONS } from '../constants/exerciseData';

// Workout log entry for fatigue calculation
export interface WorkoutLogEntry {
  id: string;
  exerciseId: string;
  sets: number;
  reps: number;
  weight?: number;
  timestamp: Date;
  isPrimary: boolean;
  muscleId: string;
}

// Muscle state with readiness data
export interface MuscleState {
  id: MuscleRegionId;
  readiness: number; // 0-100
  fatigue: number; // Accumulated fatigue points
  lastTrained: Date | null;
  lastExercises: string[]; // Last exercises that affected this muscle
  estimatedRecoveryHours: number;
}

// Recovery factors
export interface RecoveryFactors {
  sleepScore: number; // 0-100
  sleepHours: number;
  hrv: number;
  restingHR: number;
  sorenessLevel: number; // 0-10, user input
}

interface MuscleStoreState {
  muscles: { [key: string]: MuscleState };
  workoutHistory: WorkoutLogEntry[];
  recoveryFactors: RecoveryFactors;
  lastUpdated: Date | null;
  
  // Actions
  initializeMuscles: () => void;
  logExercise: (exerciseId: string, sets: number, reps: number, weight?: number) => void;
  updateRecoveryFactors: (factors: Partial<RecoveryFactors>) => void;
  calculateReadiness: () => void;
  getMuscleReadiness: (muscleId: string) => number;
  getRecommendation: () => WorkoutRecommendation;
  loadState: () => Promise<void>;
  saveState: () => Promise<void>;
}

export interface WorkoutRecommendation {
  type: 'push' | 'pull' | 'legs' | 'upper' | 'lower' | 'rest' | 'light';
  title: string;
  explanation: string;
  readyMuscles: string[];
  fatiguedMuscles: string[];
  reasoning: string[];
}

// Constants for fatigue model
const PRIMARY_FATIGUE_MULTIPLIER = 1.0;
const SECONDARY_FATIGUE_MULTIPLIER = 0.4;
const BASE_RECOVERY_RATE = 2.5; // Points per hour
const SLEEP_RECOVERY_BONUS = 0.5; // Extra recovery per hour of good sleep
const MAX_FATIGUE = 100;
const FATIGUE_TO_READINESS = (fatigue: number) => Math.max(0, Math.min(100, 100 - fatigue));

// Simulated training history for realistic initial state
// Demonstrates full color range: fatigued (0-39), moderate (40-59), good (60-79), recovered (80-100)
const INITIAL_MUSCLE_DATA: { [key: string]: { readiness: number; fatigue: number; hoursAgo: number | null; exercises: string[] } } = {
  chest: { readiness: 32, fatigue: 68, hoursAgo: 8, exercises: ['Bench Press', 'Incline Dumbbell Press'] },
  shoulders: { readiness: 48, fatigue: 52, hoursAgo: 8, exercises: ['Shoulder Press', 'Bench Press'] },
  triceps_left: { readiness: 42, fatigue: 58, hoursAgo: 8, exercises: ['Tricep Pushdown', 'Bench Press'] },
  triceps_right: { readiness: 42, fatigue: 58, hoursAgo: 8, exercises: ['Tricep Pushdown', 'Bench Press'] },
  biceps_left: { readiness: 72, fatigue: 28, hoursAgo: 48, exercises: ['Bicep Curl', 'Pull-ups'] },
  biceps_right: { readiness: 72, fatigue: 28, hoursAgo: 48, exercises: ['Bicep Curl', 'Pull-ups'] },
  back: { readiness: 68, fatigue: 32, hoursAgo: 48, exercises: ['Lat Pulldown', 'Barbell Row'] },
  traps: { readiness: 62, fatigue: 38, hoursAgo: 48, exercises: ['Barbell Row'] },
  core: { readiness: 75, fatigue: 25, hoursAgo: 24, exercises: ['Plank', 'Hanging Leg Raise'] },
  quads: { readiness: 88, fatigue: 12, hoursAgo: 96, exercises: ['Barbell Squat'] },
  hamstrings: { readiness: 92, fatigue: 8, hoursAgo: 96, exercises: ['Romanian Deadlift'] },
  glutes: { readiness: 95, fatigue: 5, hoursAgo: 96, exercises: ['Hip Thrust'] },
  calves: { readiness: 85, fatigue: 15, hoursAgo: 72, exercises: ['Calf Raise'] },
  forearms_left: { readiness: 65, fatigue: 35, hoursAgo: 48, exercises: ['Bicep Curl'] },
  forearms_right: { readiness: 65, fatigue: 35, hoursAgo: 48, exercises: ['Bicep Curl'] },
  obliques_left: { readiness: 70, fatigue: 30, hoursAgo: 24, exercises: ['Plank', 'Ab Crunch'] },
  obliques_right: { readiness: 70, fatigue: 30, hoursAgo: 24, exercises: ['Plank', 'Ab Crunch'] },
  adductors: { readiness: 82, fatigue: 18, hoursAgo: 96, exercises: ['Barbell Squat'] },
  lower_back: { readiness: 58, fatigue: 42, hoursAgo: 48, exercises: ['Barbell Row', 'Deadlift'] },
};

// Initialize default muscle states with realistic varied readiness
const createDefaultMuscleState = (id: string): MuscleState => {
  const data = INITIAL_MUSCLE_DATA[id];
  if (data) {
    return {
      id: id as MuscleRegionId,
      readiness: data.readiness,
      fatigue: data.fatigue,
      lastTrained: data.hoursAgo ? new Date(Date.now() - data.hoursAgo * 60 * 60 * 1000) : null,
      lastExercises: data.exercises,
      estimatedRecoveryHours: Math.ceil(data.fatigue / BASE_RECOVERY_RATE),
    };
  }
  return {
    id: id as MuscleRegionId,
    readiness: 85 + Math.random() * 15,
    fatigue: 0,
    lastTrained: null,
    lastExercises: [],
    estimatedRecoveryHours: 0,
  };
};

export const useMuscleStore = create<MuscleStoreState>((set, get) => ({
  muscles: {},
  workoutHistory: [],
  recoveryFactors: {
    sleepScore: 75,
    sleepHours: 7,
    hrv: 55,
    restingHR: 62,
    sorenessLevel: 2,
  },
  lastUpdated: null,
  
  initializeMuscles: () => {
    const muscles: { [key: string]: MuscleState } = {};
    Object.keys(MUSCLE_REGIONS).forEach((id) => {
      muscles[id] = createDefaultMuscleState(id);
    });
    set({ muscles, lastUpdated: new Date() });
  },
  
  logExercise: (exerciseId: string, sets: number, reps: number, weight?: number) => {
    const exercise = EXERCISE_MAPPINGS[exerciseId];
    if (!exercise) return;
    
    const { muscles, workoutHistory } = get();
    const timestamp = new Date();
    const newHistory: WorkoutLogEntry[] = [];
    const updatedMuscles = { ...muscles };
    
    // Calculate intensity factor based on reps/weight
    const intensityFactor = weight ? (weight / 50) * 0.5 + 0.5 : 1;
    const setFactor = sets * 0.8;
    
    // Apply fatigue to primary muscles
    exercise.primary.forEach((muscleId) => {
      const fatigueAmount = exercise.fatigueLoad * setFactor * intensityFactor * PRIMARY_FATIGUE_MULTIPLIER;
      if (updatedMuscles[muscleId]) {
        updatedMuscles[muscleId] = {
          ...updatedMuscles[muscleId],
          fatigue: Math.min(MAX_FATIGUE, updatedMuscles[muscleId].fatigue + fatigueAmount),
          lastTrained: timestamp,
          lastExercises: [exercise.name, ...updatedMuscles[muscleId].lastExercises.slice(0, 4)],
        };
      }
      newHistory.push({
        id: `${timestamp.getTime()}_${muscleId}`,
        exerciseId,
        sets,
        reps,
        weight,
        timestamp,
        isPrimary: true,
        muscleId,
      });
    });
    
    // Apply fatigue to secondary muscles
    exercise.secondary.forEach((muscleId) => {
      const fatigueAmount = exercise.fatigueLoad * setFactor * intensityFactor * SECONDARY_FATIGUE_MULTIPLIER;
      if (updatedMuscles[muscleId]) {
        updatedMuscles[muscleId] = {
          ...updatedMuscles[muscleId],
          fatigue: Math.min(MAX_FATIGUE, updatedMuscles[muscleId].fatigue + fatigueAmount),
          lastTrained: timestamp,
          lastExercises: [exercise.name, ...updatedMuscles[muscleId].lastExercises.slice(0, 4)],
        };
      }
      newHistory.push({
        id: `${timestamp.getTime()}_${muscleId}_sec`,
        exerciseId,
        sets,
        reps,
        weight,
        timestamp,
        isPrimary: false,
        muscleId,
      });
    });
    
    // Update readiness for all affected muscles
    Object.keys(updatedMuscles).forEach((id) => {
      updatedMuscles[id].readiness = FATIGUE_TO_READINESS(updatedMuscles[id].fatigue);
      updatedMuscles[id].estimatedRecoveryHours = Math.ceil(updatedMuscles[id].fatigue / BASE_RECOVERY_RATE);
    });
    
    set({
      muscles: updatedMuscles,
      workoutHistory: [...newHistory, ...workoutHistory].slice(0, 200),
      lastUpdated: new Date(),
    });
    
    get().saveState().catch((err) => console.error('muscleStore: failed to save state', err));
  },

  updateRecoveryFactors: (factors: Partial<RecoveryFactors>) => {
    set((state) => ({
      recoveryFactors: { ...state.recoveryFactors, ...factors },
    }));
    get().calculateReadiness();
  },
  
  calculateReadiness: () => {
    const { muscles, recoveryFactors, lastUpdated } = get();
    if (!lastUpdated) return;
    
    const now = new Date();
    const hoursSinceUpdate = (now.getTime() - lastUpdated.getTime()) / (1000 * 60 * 60);
    
    // Calculate recovery rate based on factors
    const sleepBonus = recoveryFactors.sleepScore > 70 ? SLEEP_RECOVERY_BONUS * (recoveryFactors.sleepHours - 6) : 0;
    const hrvBonus = recoveryFactors.hrv > 50 ? 0.3 : recoveryFactors.hrv < 30 ? -0.3 : 0;
    const sorenessReduction = recoveryFactors.sorenessLevel * 0.1;
    const recoveryRate = Math.max(0.5, BASE_RECOVERY_RATE + sleepBonus + hrvBonus - sorenessReduction);
    
    const updatedMuscles = { ...muscles };
    
    Object.keys(updatedMuscles).forEach((id) => {
      const muscle = updatedMuscles[id];
      // Reduce fatigue over time
      const fatigueReduction = hoursSinceUpdate * recoveryRate;
      const newFatigue = Math.max(0, muscle.fatigue - fatigueReduction);
      
      updatedMuscles[id] = {
        ...muscle,
        fatigue: newFatigue,
        readiness: FATIGUE_TO_READINESS(newFatigue),
        estimatedRecoveryHours: Math.ceil(newFatigue / recoveryRate),
      };
    });
    
    set({ muscles: updatedMuscles, lastUpdated: now });
  },
  
  getMuscleReadiness: (muscleId: string): number => {
    const { muscles } = get();
    return muscles[muscleId]?.readiness ?? 100;
  },
  
  getRecommendation: (): WorkoutRecommendation => {
    const { muscles, recoveryFactors } = get();
    
    // Group muscles by body region
    const pushMuscles = ['chest', 'shoulders', 'triceps_left', 'triceps_right'];
    const pullMuscles = ['back', 'biceps_left', 'biceps_right', 'traps'];
    const legMuscles = ['quads', 'hamstrings', 'glutes', 'calves'];
    const coreMuscles = ['core'];
    
    const getGroupReadiness = (muscleIds: string[]) => {
      const readinesses = muscleIds.map((id) => muscles[id]?.readiness ?? 100);
      return readinesses.reduce((a, b) => a + b, 0) / readinesses.length;
    };
    
    const pushReadiness = getGroupReadiness(pushMuscles);
    const pullReadiness = getGroupReadiness(pullMuscles);
    const legReadiness = getGroupReadiness(legMuscles);
    
    const readyMuscles: string[] = [];
    const fatiguedMuscles: string[] = [];
    const reasoning: string[] = [];
    
    Object.entries(muscles).forEach(([id, muscle]) => {
      if (muscle.readiness >= 70) {
        readyMuscles.push(MUSCLE_REGIONS[id as MuscleRegionId]?.name || id);
      } else if (muscle.readiness < 50) {
        fatiguedMuscles.push(MUSCLE_REGIONS[id as MuscleRegionId]?.name || id);
      }
    });
    
    // Check overall recovery
    const overallRecovery = recoveryFactors.sleepScore * 0.4 + 
                           (100 - recoveryFactors.sorenessLevel * 10) * 0.3 +
                           Math.min(100, recoveryFactors.hrv * 1.5) * 0.3;
    
    if (overallRecovery < 40) {
      reasoning.push(`Recovery factors are low (sleep: ${recoveryFactors.sleepScore}%, soreness: ${recoveryFactors.sorenessLevel}/10).`);
      return {
        type: 'rest',
        title: 'Rest Day',
        explanation: 'Your body needs recovery today based on sleep quality and soreness levels.',
        readyMuscles,
        fatiguedMuscles,
        reasoning: [...reasoning, 'Consider light stretching or mobility work.'],
      };
    }
    
    // Determine best workout type
    if (legReadiness >= 70 && legReadiness > pushReadiness && legReadiness > pullReadiness) {
      reasoning.push(`Lower body is well-recovered (${Math.round(legReadiness)}% avg readiness).`);
      if (pushReadiness < 50) reasoning.push(`Push muscles are still fatigued from recent training.`);
      if (pullReadiness < 50) reasoning.push(`Pull muscles are still fatigued from recent training.`);
      return {
        type: 'legs',
        title: 'Leg Day',
        explanation: 'Your lower body is recovered and ready for training. Upper body muscles need more recovery time.',
        readyMuscles,
        fatiguedMuscles,
        reasoning,
      };
    }
    
    if (pushReadiness >= 70 && pushReadiness > pullReadiness) {
      reasoning.push(`Push muscles are well-recovered (${Math.round(pushReadiness)}% avg readiness).`);
      if (pullReadiness < 50) reasoning.push(`Back and biceps still show fatigue from recent training.`);
      return {
        type: 'push',
        title: 'Push Day',
        explanation: 'Chest, shoulders, and triceps are recovered. Focus on pushing movements today.',
        readyMuscles,
        fatiguedMuscles,
        reasoning,
      };
    }
    
    if (pullReadiness >= 70) {
      reasoning.push(`Pull muscles are well-recovered (${Math.round(pullReadiness)}% avg readiness).`);
      if (pushReadiness < 50) reasoning.push(`Chest and shoulders still show fatigue.`);
      return {
        type: 'pull',
        title: 'Pull Day',
        explanation: 'Back and biceps are recovered. Focus on pulling movements today.',
        readyMuscles,
        fatiguedMuscles,
        reasoning,
      };
    }
    
    // If nothing is fully recovered, suggest light workout
    reasoning.push('Most muscle groups show moderate fatigue.');
    reasoning.push(`Sleep score: ${recoveryFactors.sleepScore}%, HRV: ${recoveryFactors.hrv}ms.`);
    return {
      type: 'light',
      title: 'Light Active Recovery',
      explanation: 'Multiple muscle groups need more recovery. Consider a light session focusing on mobility and technique.',
      readyMuscles,
      fatiguedMuscles,
      reasoning,
    };
  },
  
  loadState: async () => {
    try {
      const data = await AsyncStorage.getItem('apex_muscle_state');
      if (data) {
        const parsed = JSON.parse(data);
        // Convert date strings back to Date objects
        Object.keys(parsed.muscles || {}).forEach((key) => {
          if (parsed.muscles[key].lastTrained) {
            parsed.muscles[key].lastTrained = new Date(parsed.muscles[key].lastTrained);
          }
        });
        if (parsed.lastUpdated) {
          parsed.lastUpdated = new Date(parsed.lastUpdated);
        }
        set(parsed);
        // Note: Don't call calculateReadiness here to avoid infinite loops
        // It will be calculated on demand when needed
      } else {
        get().initializeMuscles();
      }
    } catch (error) {
      console.log('Error loading muscle state:', error);
      get().initializeMuscles();
    }
  },
  
  saveState: async () => {
    try {
      const state = get();
      await AsyncStorage.setItem('apex_muscle_state', JSON.stringify({
        muscles: state.muscles,
        workoutHistory: state.workoutHistory.slice(0, 100),
        recoveryFactors: state.recoveryFactors,
        lastUpdated: state.lastUpdated,
      }));
    } catch (error) {
      console.log('Error saving muscle state:', error);
    }
  },
}));
