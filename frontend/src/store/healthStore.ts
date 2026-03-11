import { create } from 'zustand';

// Simulated health data - ready for real Health Connect/HealthKit integration
export interface HealthMetrics {
  sleepDuration: number; // hours
  sleepScore: number; // 0-100
  hrv: number; // ms
  restingHeartRate: number; // bpm
  steps: number;
  activeMinutes: number;
  caloriesBurned: number;
  lastUpdated: Date;
}

export interface MuscleReadiness {
  id: string;
  name: string;
  readiness: number; // 0-100 (100 = fully recovered)
  lastTrained: Date | null;
  estimatedRecovery: number; // hours remaining
  affectedExercises: string[];
}

export interface RecoveryData {
  score: number; // 0-100
  status: 'ready' | 'moderate' | 'recover';
  statusLabel: string;
  metrics: HealthMetrics;
  muscles: MuscleReadiness[];
}

// Generate realistic simulated data
const generateSimulatedData = (): RecoveryData => {
  const sleepDuration = 6.5 + Math.random() * 2;
  const sleepScore = Math.floor(65 + Math.random() * 30);
  const hrv = Math.floor(45 + Math.random() * 35);
  const restingHeartRate = Math.floor(55 + Math.random() * 15);
  const steps = Math.floor(4000 + Math.random() * 8000);
  
  // Calculate recovery score based on metrics
  const recoveryScore = Math.floor(
    (sleepScore * 0.35) +
    (Math.min(hrv / 80, 1) * 100 * 0.25) +
    (Math.max(0, (70 - restingHeartRate) / 20) * 100 * 0.2) +
    (Math.min(sleepDuration / 8, 1) * 100 * 0.2)
  );
  
  const status: 'ready' | 'moderate' | 'recover' = 
    recoveryScore >= 75 ? 'ready' : 
    recoveryScore >= 50 ? 'moderate' : 'recover';
  
  const statusLabel = 
    status === 'ready' ? 'Ready to Train' :
    status === 'moderate' ? 'Moderate Recovery' : 'Recovery Day';
  
  return {
    score: recoveryScore,
    status,
    statusLabel,
    metrics: {
      sleepDuration: Math.round(sleepDuration * 10) / 10,
      sleepScore,
      hrv,
      restingHeartRate,
      steps,
      activeMinutes: Math.floor(20 + Math.random() * 60),
      caloriesBurned: Math.floor(1800 + Math.random() * 800),
      lastUpdated: new Date(),
    },
    muscles: generateMuscleReadiness(),
  };
};

const generateMuscleReadiness = (): MuscleReadiness[] => {
  const muscleGroups = [
    { id: 'chest', name: 'Chest', exercises: ['Bench Press', 'Chest Fly', 'Push-ups'] },
    { id: 'back', name: 'Back', exercises: ['Pull-ups', 'Rows', 'Lat Pulldown'] },
    { id: 'shoulders', name: 'Shoulders', exercises: ['Overhead Press', 'Lateral Raise', 'Face Pull'] },
    { id: 'biceps', name: 'Biceps', exercises: ['Bicep Curl', 'Hammer Curl', 'Chin-ups'] },
    { id: 'triceps', name: 'Triceps', exercises: ['Tricep Extension', 'Dips', 'Close-grip Press'] },
    { id: 'forearms', name: 'Forearms', exercises: ['Wrist Curl', 'Farmer Walk', 'Dead Hang'] },
    { id: 'core', name: 'Core', exercises: ['Plank', 'Crunches', 'Leg Raise'] },
    { id: 'quads', name: 'Quadriceps', exercises: ['Squat', 'Leg Press', 'Lunges'] },
    { id: 'hamstrings', name: 'Hamstrings', exercises: ['Deadlift', 'Leg Curl', 'Romanian DL'] },
    { id: 'glutes', name: 'Glutes', exercises: ['Hip Thrust', 'Squat', 'Lunges'] },
    { id: 'calves', name: 'Calves', exercises: ['Calf Raise', 'Jump Rope', 'Box Jump'] },
    { id: 'traps', name: 'Traps', exercises: ['Shrugs', 'Upright Row', 'Farmer Walk'] },
  ];
  
  return muscleGroups.map((muscle) => {
    const readiness = Math.floor(40 + Math.random() * 60);
    const lastTrainedDays = Math.floor(Math.random() * 5);
    const estimatedRecovery = readiness >= 80 ? 0 : Math.floor((100 - readiness) * 0.5);
    
    return {
      id: muscle.id,
      name: muscle.name,
      readiness,
      lastTrained: lastTrainedDays === 0 ? null : new Date(Date.now() - lastTrainedDays * 24 * 60 * 60 * 1000),
      estimatedRecovery,
      affectedExercises: muscle.exercises,
    };
  });
};

interface HealthState {
  recoveryData: RecoveryData | null;
  isLoading: boolean;
  isConnected: boolean;
  connectionSource: 'simulated' | 'health_connect' | 'apple_health' | 'samsung_health';
  fetchHealthData: () => Promise<void>;
  refreshData: () => Promise<void>;
}

export const useHealthStore = create<HealthState>((set) => ({
  recoveryData: null,
  isLoading: false,
  isConnected: true,
  connectionSource: 'simulated',
  
  fetchHealthData: async () => {
    set({ isLoading: true });
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 800));
    
    // In production, this would connect to Health Connect / HealthKit
    const data = generateSimulatedData();
    set({ recoveryData: data, isLoading: false });
  },
  
  refreshData: async () => {
    set({ isLoading: true });
    await new Promise(resolve => setTimeout(resolve, 500));
    const data = generateSimulatedData();
    set({ recoveryData: data, isLoading: false });
  },
}));
