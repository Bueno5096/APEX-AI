import { create } from 'zustand';

export interface Exercise {
  id: string;
  name: string;
  targetMuscles: string[];
  sets: number;
  reps: string;
  weight?: number;
  previousPerformance?: {
    weight: number;
    reps: number;
    date: Date;
  };
  isCompleted: boolean;
  completedSets: number;
}

export interface Workout {
  id: string;
  title: string;
  type: 'push' | 'pull' | 'legs' | 'upper' | 'lower' | 'full' | 'cardio' | 'recovery';
  duration: number; // minutes
  intensity: 'light' | 'moderate' | 'intense';
  exercises: Exercise[];
  targetMuscles: string[];
  date?: Date; // When the workout was completed
}

// ─── Workout Log with feedback ───
export type OverallFeedback = 'too_easy' | 'just_right' | 'hard_but_good' | 'too_hard' | 'exhausted';
export type ExerciseFeedback = 'too_easy' | 'good' | 'too_hard' | 'had_pain';

export interface WorkoutLog {
  id: string;
  workoutTitle: string;
  workoutType: string;
  date: Date;
  durationSeconds: number;
  exercises: {
    name: string;
    sets: number;
    completedSets: number;
    reps: string;
    weight?: number;
    targetMuscles: string[];
    feedback?: ExerciseFeedback;
  }[];
  totalSetsCompleted: number;
  totalExercisesCompleted: number;
  overallFeedback?: OverallFeedback;
  notes?: string;
  targetMuscles: string[];
}

export interface ActiveWorkoutState {
  workout: Workout | null;
  currentExerciseIndex: number;
  startTime: Date | null;
  restTimer: number;
  isResting: boolean;
}

const generateTodayWorkout = (): Workout => {
  return {
    id: 'workout_1',
    title: 'Push Day',
    type: 'push',
    duration: 45,
    intensity: 'moderate',
    targetMuscles: ['chest', 'shoulders', 'triceps'],
    exercises: [
      {
        id: 'ex_1',
        name: 'Bench Press',
        targetMuscles: ['chest', 'triceps', 'shoulders'],
        sets: 4,
        reps: '8-10',
        weight: 80,
        previousPerformance: { weight: 77.5, reps: 9, date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
        isCompleted: false,
        completedSets: 0,
      },
      {
        id: 'ex_2',
        name: 'Incline Dumbbell Press',
        targetMuscles: ['chest', 'shoulders'],
        sets: 3,
        reps: '10-12',
        weight: 30,
        previousPerformance: { weight: 28, reps: 11, date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
        isCompleted: false,
        completedSets: 0,
      },
      {
        id: 'ex_3',
        name: 'Overhead Press',
        targetMuscles: ['shoulders', 'triceps'],
        sets: 4,
        reps: '8-10',
        weight: 50,
        previousPerformance: { weight: 47.5, reps: 9, date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
        isCompleted: false,
        completedSets: 0,
      },
      {
        id: 'ex_4',
        name: 'Lateral Raises',
        targetMuscles: ['shoulders'],
        sets: 3,
        reps: '12-15',
        weight: 12,
        previousPerformance: { weight: 10, reps: 14, date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
        isCompleted: false,
        completedSets: 0,
      },
      {
        id: 'ex_5',
        name: 'Tricep Pushdown',
        targetMuscles: ['triceps'],
        sets: 3,
        reps: '12-15',
        weight: 25,
        previousPerformance: { weight: 22.5, reps: 13, date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
        isCompleted: false,
        completedSets: 0,
      },
      {
        id: 'ex_6',
        name: 'Chest Fly Machine',
        targetMuscles: ['chest'],
        sets: 3,
        reps: '12-15',
        weight: 45,
        previousPerformance: { weight: 40, reps: 14, date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
        isCompleted: false,
        completedSets: 0,
      },
    ],
  };
};

// Workout templates by type
const WORKOUT_TEMPLATES: { [key: string]: Workout } = {
  push: generateTodayWorkout(),
  pull: {
    id: 'workout_pull',
    title: 'Pull Day',
    type: 'pull',
    duration: 45,
    intensity: 'moderate',
    targetMuscles: ['back', 'biceps', 'traps'],
    exercises: [
      { id: 'pull_1', name: 'Barbell Row', targetMuscles: ['back', 'biceps'], sets: 4, reps: '8-10', weight: 70, isCompleted: false, completedSets: 0 },
      { id: 'pull_2', name: 'Lat Pulldown', targetMuscles: ['back', 'biceps'], sets: 3, reps: '10-12', weight: 60, isCompleted: false, completedSets: 0 },
      { id: 'pull_3', name: 'Seated Row', targetMuscles: ['back', 'biceps'], sets: 3, reps: '10-12', weight: 55, isCompleted: false, completedSets: 0 },
      { id: 'pull_4', name: 'Bicep Curl', targetMuscles: ['biceps'], sets: 3, reps: '10-12', weight: 14, isCompleted: false, completedSets: 0 },
      { id: 'pull_5', name: 'Hammer Curl', targetMuscles: ['biceps', 'forearms'], sets: 3, reps: '12-15', weight: 12, isCompleted: false, completedSets: 0 },
      { id: 'pull_6', name: 'Rear Delt Fly', targetMuscles: ['shoulders'], sets: 3, reps: '15-20', weight: 8, isCompleted: false, completedSets: 0 },
    ],
  },
  legs: {
    id: 'workout_legs',
    title: 'Leg Day',
    type: 'legs',
    duration: 50,
    intensity: 'moderate',
    targetMuscles: ['quads', 'hamstrings', 'glutes', 'calves'],
    exercises: [
      { id: 'leg_1', name: 'Barbell Squat', targetMuscles: ['quads', 'glutes'], sets: 4, reps: '6-8', weight: 100, isCompleted: false, completedSets: 0 },
      { id: 'leg_2', name: 'Romanian Deadlift', targetMuscles: ['hamstrings', 'glutes'], sets: 3, reps: '8-10', weight: 80, isCompleted: false, completedSets: 0 },
      { id: 'leg_3', name: 'Leg Press', targetMuscles: ['quads', 'glutes'], sets: 3, reps: '10-12', weight: 140, isCompleted: false, completedSets: 0 },
      { id: 'leg_4', name: 'Leg Curl', targetMuscles: ['hamstrings'], sets: 3, reps: '12-15', weight: 40, isCompleted: false, completedSets: 0 },
      { id: 'leg_5', name: 'Hip Thrust', targetMuscles: ['glutes'], sets: 3, reps: '10-12', weight: 80, isCompleted: false, completedSets: 0 },
      { id: 'leg_6', name: 'Calf Raise', targetMuscles: ['calves'], sets: 4, reps: '15-20', weight: 60, isCompleted: false, completedSets: 0 },
    ],
  },
  upper: {
    id: 'workout_upper',
    title: 'Upper Body',
    type: 'upper',
    duration: 50,
    intensity: 'moderate',
    targetMuscles: ['chest', 'back', 'shoulders', 'biceps', 'triceps'],
    exercises: [
      { id: 'up_1', name: 'Bench Press', targetMuscles: ['chest', 'triceps'], sets: 4, reps: '8-10', weight: 80, isCompleted: false, completedSets: 0 },
      { id: 'up_2', name: 'Barbell Row', targetMuscles: ['back', 'biceps'], sets: 4, reps: '8-10', weight: 70, isCompleted: false, completedSets: 0 },
      { id: 'up_3', name: 'Overhead Press', targetMuscles: ['shoulders', 'triceps'], sets: 3, reps: '8-10', weight: 50, isCompleted: false, completedSets: 0 },
      { id: 'up_4', name: 'Lat Pulldown', targetMuscles: ['back', 'biceps'], sets: 3, reps: '10-12', weight: 60, isCompleted: false, completedSets: 0 },
      { id: 'up_5', name: 'Bicep Curl', targetMuscles: ['biceps'], sets: 3, reps: '10-12', weight: 14, isCompleted: false, completedSets: 0 },
      { id: 'up_6', name: 'Tricep Pushdown', targetMuscles: ['triceps'], sets: 3, reps: '12-15', weight: 25, isCompleted: false, completedSets: 0 },
    ],
  },
  lower: {
    id: 'workout_lower',
    title: 'Lower Body',
    type: 'lower',
    duration: 45,
    intensity: 'moderate',
    targetMuscles: ['quads', 'hamstrings', 'glutes', 'calves'],
    exercises: [
      { id: 'lo_1', name: 'Barbell Squat', targetMuscles: ['quads', 'glutes'], sets: 4, reps: '6-8', weight: 100, isCompleted: false, completedSets: 0 },
      { id: 'lo_2', name: 'Leg Press', targetMuscles: ['quads'], sets: 3, reps: '10-12', weight: 140, isCompleted: false, completedSets: 0 },
      { id: 'lo_3', name: 'Leg Curl', targetMuscles: ['hamstrings'], sets: 3, reps: '12-15', weight: 40, isCompleted: false, completedSets: 0 },
      { id: 'lo_4', name: 'Glute Bridge', targetMuscles: ['glutes'], sets: 3, reps: '12-15', weight: 60, isCompleted: false, completedSets: 0 },
      { id: 'lo_5', name: 'Calf Raise', targetMuscles: ['calves'], sets: 4, reps: '15-20', weight: 60, isCompleted: false, completedSets: 0 },
    ],
  },
  light: {
    id: 'workout_light',
    title: 'Light Active Recovery',
    type: 'recovery',
    duration: 30,
    intensity: 'light',
    targetMuscles: ['core', 'shoulders'],
    exercises: [
      { id: 'lt_1', name: 'Plank', targetMuscles: ['core'], sets: 3, reps: '30-45s', isCompleted: false, completedSets: 0 },
      { id: 'lt_2', name: 'Lateral Raise', targetMuscles: ['shoulders'], sets: 3, reps: '15-20', weight: 6, isCompleted: false, completedSets: 0 },
      { id: 'lt_3', name: 'Glute Bridge', targetMuscles: ['glutes'], sets: 3, reps: '15-20', isCompleted: false, completedSets: 0 },
      { id: 'lt_4', name: 'Ab Crunch', targetMuscles: ['core'], sets: 3, reps: '15-20', isCompleted: false, completedSets: 0 },
    ],
  },
  rest: {
    id: 'workout_rest',
    title: 'Rest Day',
    type: 'recovery',
    duration: 20,
    intensity: 'light',
    targetMuscles: ['core'],
    exercises: [
      { id: 'rest_1', name: 'Plank', targetMuscles: ['core'], sets: 3, reps: '30s', isCompleted: false, completedSets: 0 },
      { id: 'rest_2', name: 'Glute Bridge', targetMuscles: ['glutes'], sets: 3, reps: '15', isCompleted: false, completedSets: 0 },
    ],
  },
  full: {
    id: 'workout_full',
    title: 'Full Body',
    type: 'full',
    duration: 55,
    intensity: 'moderate',
    targetMuscles: ['chest', 'back', 'shoulders', 'quads', 'hamstrings', 'glutes', 'core'],
    exercises: [
      { id: 'full_1', name: 'Barbell Squat', targetMuscles: ['quads', 'glutes'], sets: 4, reps: '6-8', weight: 100, isCompleted: false, completedSets: 0 },
      { id: 'full_2', name: 'Bench Press', targetMuscles: ['chest', 'triceps'], sets: 4, reps: '8-10', weight: 80, isCompleted: false, completedSets: 0 },
      { id: 'full_3', name: 'Barbell Row', targetMuscles: ['back', 'biceps'], sets: 3, reps: '8-10', weight: 70, isCompleted: false, completedSets: 0 },
      { id: 'full_4', name: 'Overhead Press', targetMuscles: ['shoulders', 'triceps'], sets: 3, reps: '8-10', weight: 50, isCompleted: false, completedSets: 0 },
      { id: 'full_5', name: 'Romanian Deadlift', targetMuscles: ['hamstrings', 'glutes'], sets: 3, reps: '8-10', weight: 80, isCompleted: false, completedSets: 0 },
      { id: 'full_6', name: 'Plank', targetMuscles: ['core'], sets: 3, reps: '45-60s', isCompleted: false, completedSets: 0 },
    ],
  },
};

// Normalize AI workout type strings to template keys
const normalizeWorkoutType = (type: string): string => {
  const t = type.toLowerCase().trim();
  const aliases: { [key: string]: string } = {
    'push': 'push',
    'push day': 'push',
    'chest': 'push',
    'pull': 'pull',
    'pull day': 'pull',
    'back': 'pull',
    'legs': 'legs',
    'leg': 'legs',
    'leg day': 'legs',
    'upper': 'upper',
    'upper body': 'upper',
    'lower': 'lower',
    'lower body': 'lower',
    'full': 'full',
    'full body': 'full',
    'full_body': 'full',
    'fullbody': 'full',
    'light': 'light',
    'recovery': 'light',
    'active recovery': 'light',
    'rest': 'rest',
    'rest day': 'rest',
    'cardio': 'light',
  };
  return aliases[t] || t;
};

interface WorkoutState {
  todayWorkout: Workout | null;
  activeWorkout: ActiveWorkoutState;
  workoutHistory: Workout[];
  workoutLogs: WorkoutLog[];
  
  loadTodayWorkout: () => void;
  setTodayWorkoutByType: (type: string, title: string) => void;
  startWorkout: () => void;
  endWorkout: () => void;
  completeSet: (exerciseId: string) => void;
  nextExercise: () => void;
  previousExercise: () => void;
  setRestTimer: (seconds: number) => void;
  decrementRestTimer: () => void;
  swapExercise: (exerciseId: string, newExercise: Exercise) => void;
  modifyExercise: (exerciseName: string, changes: { sets?: number; reps?: string; weight?: number }) => void;
  applyCoachActions: (actions: any[]) => void;
  reorderExercise: (fromIndex: number, toIndex: number) => void;
  saveWorkoutLog: (log: WorkoutLog) => void;
}

// Generate seeded workout history spanning ~30 days for Progress tracking
const generateSeededWorkoutHistory = (): Workout[] => {
  const now = Date.now();
  const DAY = 24 * 60 * 60 * 1000;
  
  return [
    // Week 1 — Day 1 (28 days ago): Push Day
    {
      id: 'hist_1', title: 'Push Day', type: 'push', duration: 45, intensity: 'moderate',
      targetMuscles: ['chest', 'shoulders', 'triceps'],
      date: new Date(now - 28 * DAY),
      exercises: [
        { id: 'h1_1', name: 'Bench Press', targetMuscles: ['chest'], sets: 4, reps: '8', weight: 80, isCompleted: true, completedSets: 4 },
        { id: 'h1_2', name: 'Overhead Press', targetMuscles: ['shoulders'], sets: 3, reps: '10', weight: 40, isCompleted: true, completedSets: 3 },
        { id: 'h1_3', name: 'Tricep Pushdown', targetMuscles: ['triceps'], sets: 3, reps: '12', weight: 25, isCompleted: true, completedSets: 3 },
        { id: 'h1_4', name: 'Lateral Raise', targetMuscles: ['shoulders'], sets: 3, reps: '15', weight: 8, isCompleted: true, completedSets: 3 },
      ],
    },
    // Week 1 — Day 3 (26 days ago): Pull Day
    {
      id: 'hist_2', title: 'Pull Day', type: 'pull', duration: 50, intensity: 'moderate',
      targetMuscles: ['back', 'biceps', 'traps'],
      date: new Date(now - 26 * DAY),
      exercises: [
        { id: 'h2_1', name: 'Barbell Row', targetMuscles: ['back'], sets: 4, reps: '8', weight: 60, isCompleted: true, completedSets: 4 },
        { id: 'h2_2', name: 'Lat Pulldown', targetMuscles: ['back'], sets: 3, reps: '10', weight: 55, isCompleted: true, completedSets: 3 },
        { id: 'h2_3', name: 'Bicep Curl', targetMuscles: ['biceps'], sets: 3, reps: '12', weight: 12, isCompleted: true, completedSets: 3 },
        { id: 'h2_4', name: 'Face Pull', targetMuscles: ['traps'], sets: 3, reps: '15', weight: 15, isCompleted: true, completedSets: 3 },
      ],
    },
    // Week 1 — Day 5 (24 days ago): Leg Day
    {
      id: 'hist_3', title: 'Leg Day', type: 'legs', duration: 50, intensity: 'intense',
      targetMuscles: ['quads', 'hamstrings', 'glutes', 'calves'],
      date: new Date(now - 24 * DAY),
      exercises: [
        { id: 'h3_1', name: 'Barbell Squat', targetMuscles: ['quads', 'glutes'], sets: 4, reps: '6', weight: 100, isCompleted: true, completedSets: 4 },
        { id: 'h3_2', name: 'Romanian Deadlift', targetMuscles: ['hamstrings', 'glutes'], sets: 3, reps: '8', weight: 70, isCompleted: true, completedSets: 3 },
        { id: 'h3_3', name: 'Leg Press', targetMuscles: ['quads'], sets: 3, reps: '10', weight: 120, isCompleted: true, completedSets: 3 },
        { id: 'h3_4', name: 'Calf Raise', targetMuscles: ['calves'], sets: 4, reps: '15', weight: 50, isCompleted: true, completedSets: 4 },
      ],
    },
    // Week 2 — Day 8 (21 days ago): Push Day
    {
      id: 'hist_4', title: 'Push Day', type: 'push', duration: 45, intensity: 'moderate',
      targetMuscles: ['chest', 'shoulders', 'triceps'],
      date: new Date(now - 21 * DAY),
      exercises: [
        { id: 'h4_1', name: 'Bench Press', targetMuscles: ['chest'], sets: 4, reps: '8', weight: 82.5, isCompleted: true, completedSets: 4 },
        { id: 'h4_2', name: 'Overhead Press', targetMuscles: ['shoulders'], sets: 3, reps: '10', weight: 42.5, isCompleted: true, completedSets: 3 },
        { id: 'h4_3', name: 'Tricep Pushdown', targetMuscles: ['triceps'], sets: 3, reps: '12', weight: 27.5, isCompleted: true, completedSets: 3 },
        { id: 'h4_4', name: 'Lateral Raise', targetMuscles: ['shoulders'], sets: 3, reps: '15', weight: 9, isCompleted: true, completedSets: 3 },
      ],
    },
    // Week 2 — Day 10 (19 days ago): Pull Day
    {
      id: 'hist_5', title: 'Pull Day', type: 'pull', duration: 50, intensity: 'moderate',
      targetMuscles: ['back', 'biceps', 'traps'],
      date: new Date(now - 19 * DAY),
      exercises: [
        { id: 'h5_1', name: 'Barbell Row', targetMuscles: ['back'], sets: 4, reps: '8', weight: 65, isCompleted: true, completedSets: 4 },
        { id: 'h5_2', name: 'Lat Pulldown', targetMuscles: ['back'], sets: 3, reps: '10', weight: 57.5, isCompleted: true, completedSets: 3 },
        { id: 'h5_3', name: 'Bicep Curl', targetMuscles: ['biceps'], sets: 3, reps: '12', weight: 14, isCompleted: true, completedSets: 3 },
        { id: 'h5_4', name: 'Face Pull', targetMuscles: ['traps'], sets: 3, reps: '15', weight: 17.5, isCompleted: true, completedSets: 3 },
      ],
    },
    // Week 3 — Day 14 (14 days ago): Push Day
    {
      id: 'hist_6', title: 'Push Day', type: 'push', duration: 48, intensity: 'intense',
      targetMuscles: ['chest', 'shoulders', 'triceps'],
      date: new Date(now - 14 * DAY),
      exercises: [
        { id: 'h6_1', name: 'Bench Press', targetMuscles: ['chest'], sets: 4, reps: '8', weight: 85, isCompleted: true, completedSets: 4 },
        { id: 'h6_2', name: 'Overhead Press', targetMuscles: ['shoulders'], sets: 3, reps: '10', weight: 45, isCompleted: true, completedSets: 3 },
        { id: 'h6_3', name: 'Tricep Pushdown', targetMuscles: ['triceps'], sets: 3, reps: '12', weight: 30, isCompleted: true, completedSets: 3 },
      ],
    },
    // Week 3 — Day 12 (12 days ago): Leg Day
    {
      id: 'hist_7', title: 'Leg Day', type: 'legs', duration: 55, intensity: 'intense',
      targetMuscles: ['quads', 'hamstrings', 'glutes', 'calves'],
      date: new Date(now - 12 * DAY),
      exercises: [
        { id: 'h7_1', name: 'Barbell Squat', targetMuscles: ['quads', 'glutes'], sets: 4, reps: '6', weight: 110, isCompleted: true, completedSets: 4 },
        { id: 'h7_2', name: 'Romanian Deadlift', targetMuscles: ['hamstrings', 'glutes'], sets: 3, reps: '8', weight: 80, isCompleted: true, completedSets: 3 },
        { id: 'h7_3', name: 'Hip Thrust', targetMuscles: ['glutes'], sets: 3, reps: '10', weight: 80, isCompleted: true, completedSets: 3 },
        { id: 'h7_4', name: 'Calf Raise', targetMuscles: ['calves'], sets: 4, reps: '15', weight: 55, isCompleted: true, completedSets: 4 },
      ],
    },
    // Week 4 — Day 5 (5 days ago): Push Day
    {
      id: 'hist_8', title: 'Push Day', type: 'push', duration: 50, intensity: 'intense',
      targetMuscles: ['chest', 'shoulders', 'triceps'],
      date: new Date(now - 5 * DAY),
      exercises: [
        { id: 'h8_1', name: 'Bench Press', targetMuscles: ['chest'], sets: 4, reps: '8', weight: 90, isCompleted: true, completedSets: 4 },
        { id: 'h8_2', name: 'Overhead Press', targetMuscles: ['shoulders'], sets: 3, reps: '10', weight: 47.5, isCompleted: true, completedSets: 3 },
        { id: 'h8_3', name: 'Tricep Pushdown', targetMuscles: ['triceps'], sets: 3, reps: '12', weight: 32.5, isCompleted: true, completedSets: 3 },
        { id: 'h8_4', name: 'Lateral Raise', targetMuscles: ['shoulders'], sets: 3, reps: '15', weight: 10, isCompleted: true, completedSets: 3 },
      ],
    },
    // Week 4 — Day 3 (3 days ago): Pull Day
    {
      id: 'hist_9', title: 'Pull Day', type: 'pull', duration: 50, intensity: 'moderate',
      targetMuscles: ['back', 'biceps', 'traps'],
      date: new Date(now - 3 * DAY),
      exercises: [
        { id: 'h9_1', name: 'Barbell Row', targetMuscles: ['back'], sets: 4, reps: '8', weight: 70, isCompleted: true, completedSets: 4 },
        { id: 'h9_2', name: 'Lat Pulldown', targetMuscles: ['back'], sets: 3, reps: '10', weight: 62.5, isCompleted: true, completedSets: 3 },
        { id: 'h9_3', name: 'Bicep Curl', targetMuscles: ['biceps'], sets: 3, reps: '12', weight: 16, isCompleted: true, completedSets: 3 },
        { id: 'h9_4', name: 'Face Pull', targetMuscles: ['traps'], sets: 3, reps: '15', weight: 20, isCompleted: true, completedSets: 3 },
        { id: 'h9_5', name: 'Hammer Curl', targetMuscles: ['biceps'], sets: 3, reps: '10', weight: 14, isCompleted: true, completedSets: 3 },
      ],
    },
    // Week 4 — Day 1 (1 day ago): Leg Day
    {
      id: 'hist_10', title: 'Leg Day', type: 'legs', duration: 55, intensity: 'intense',
      targetMuscles: ['quads', 'hamstrings', 'glutes', 'calves'],
      date: new Date(now - 1 * DAY),
      exercises: [
        { id: 'h10_1', name: 'Barbell Squat', targetMuscles: ['quads', 'glutes'], sets: 4, reps: '6', weight: 115, isCompleted: true, completedSets: 4 },
        { id: 'h10_2', name: 'Romanian Deadlift', targetMuscles: ['hamstrings', 'glutes'], sets: 3, reps: '8', weight: 85, isCompleted: true, completedSets: 3 },
        { id: 'h10_3', name: 'Leg Press', targetMuscles: ['quads'], sets: 3, reps: '10', weight: 140, isCompleted: true, completedSets: 3 },
        { id: 'h10_4', name: 'Hip Thrust', targetMuscles: ['glutes'], sets: 3, reps: '10', weight: 90, isCompleted: true, completedSets: 3 },
        { id: 'h10_5', name: 'Calf Raise', targetMuscles: ['calves'], sets: 4, reps: '15', weight: 60, isCompleted: true, completedSets: 4 },
      ],
    },
  ];
};

export const useWorkoutStore = create<WorkoutState>((set, get) => ({
  todayWorkout: null,
  activeWorkout: {
    workout: null,
    currentExerciseIndex: 0,
    startTime: null,
    restTimer: 0,
    isResting: false,
  },
  workoutHistory: generateSeededWorkoutHistory(),
  workoutLogs: [],
  
  loadTodayWorkout: () => {
    set({ todayWorkout: generateTodayWorkout() });
  },
  
  setTodayWorkoutByType: (type: string, title: string) => {
    const normalizedType = normalizeWorkoutType(type);
    const template = WORKOUT_TEMPLATES[normalizedType];
    if (template) {
      const workout = {
        ...template,
        id: `workout_${Date.now()}`,
        title: title || template.title,
        exercises: template.exercises.map((ex, i) => ({
          ...ex,
          id: `${normalizedType}_${Date.now()}_${i}`,
          isCompleted: false,
          completedSets: 0,
        })),
      };
      console.log(`[WorkoutStore] Setting workout: ${workout.title} (type: ${normalizedType}, ${workout.exercises.length} exercises)`);
      set({ todayWorkout: workout });
    } else {
      console.log(`[WorkoutStore] Unknown workout type: "${type}" (normalized: "${normalizedType}"), falling back to Push Day`);
      set({ todayWorkout: generateTodayWorkout() });
    }
  },
  
  startWorkout: () => {
    const { todayWorkout } = get();
    if (todayWorkout) {
      set({
        activeWorkout: {
          workout: { ...todayWorkout },
          currentExerciseIndex: 0,
          startTime: new Date(),
          restTimer: 0,
          isResting: false,
        },
      });
    }
  },
  
  endWorkout: () => {
    const { activeWorkout, workoutHistory } = get();
    if (activeWorkout.workout) {
      set({
        workoutHistory: [...workoutHistory, activeWorkout.workout],
        activeWorkout: {
          workout: null,
          currentExerciseIndex: 0,
          startTime: null,
          restTimer: 0,
          isResting: false,
        },
      });
    }
  },
  
  completeSet: (exerciseId: string) => {
    set((state) => {
      if (!state.activeWorkout.workout) return state;
      
      const exercises = state.activeWorkout.workout.exercises.map((ex) => {
        if (ex.id === exerciseId) {
          const newCompletedSets = ex.completedSets + 1;
          return {
            ...ex,
            completedSets: newCompletedSets,
            isCompleted: newCompletedSets >= ex.sets,
          };
        }
        return ex;
      });
      
      return {
        activeWorkout: {
          ...state.activeWorkout,
          workout: { ...state.activeWorkout.workout, exercises },
          isResting: true,
          restTimer: 90, // Default 90 second rest
        },
      };
    });
  },
  
  nextExercise: () => {
    set((state) => {
      if (!state.activeWorkout.workout) return state;
      const maxIndex = state.activeWorkout.workout.exercises.length - 1;
      const newIndex = Math.min(state.activeWorkout.currentExerciseIndex + 1, maxIndex);
      return {
        activeWorkout: {
          ...state.activeWorkout,
          currentExerciseIndex: newIndex,
          isResting: false,
          restTimer: 0,
        },
      };
    });
  },
  
  previousExercise: () => {
    set((state) => ({
      activeWorkout: {
        ...state.activeWorkout,
        currentExerciseIndex: Math.max(state.activeWorkout.currentExerciseIndex - 1, 0),
      },
    }));
  },
  
  setRestTimer: (seconds: number) => {
    set((state) => ({
      activeWorkout: {
        ...state.activeWorkout,
        restTimer: seconds,
        isResting: seconds > 0,
      },
    }));
  },
  
  decrementRestTimer: () => {
    set((state) => {
      const newTimer = Math.max(state.activeWorkout.restTimer - 1, 0);
      return {
        activeWorkout: {
          ...state.activeWorkout,
          restTimer: newTimer,
          isResting: newTimer > 0,
        },
      };
    });
  },
  
  swapExercise: (exerciseId: string, newExercise: Exercise) => {
    set((state) => {
      if (!state.todayWorkout) return state;
      
      const exercises = state.todayWorkout.exercises.map((ex) =>
        ex.id === exerciseId ? newExercise : ex
      );
      
      // Also update active workout if running
      const activeExercises = state.activeWorkout.workout?.exercises.map((ex) =>
        ex.id === exerciseId ? newExercise : ex
      );
      
      return {
        todayWorkout: { ...state.todayWorkout, exercises },
        activeWorkout: state.activeWorkout.workout ? {
          ...state.activeWorkout,
          workout: { ...state.activeWorkout.workout, exercises: activeExercises! },
        } : state.activeWorkout,
      };
    });
  },
  
  modifyExercise: (exerciseName: string, changes: { sets?: number; reps?: string; weight?: number }) => {
    set((state) => {
      const updateExercises = (exercises: Exercise[]) =>
        exercises.map((ex) => {
          if (ex.name.toLowerCase() === exerciseName.toLowerCase()) {
            return {
              ...ex,
              sets: changes.sets ?? ex.sets,
              reps: changes.reps ?? ex.reps,
              weight: changes.weight ?? ex.weight,
            };
          }
          return ex;
        });
      
      const updatedToday = state.todayWorkout
        ? { ...state.todayWorkout, exercises: updateExercises(state.todayWorkout.exercises) }
        : state.todayWorkout;
        
      const updatedActive = state.activeWorkout.workout
        ? {
            ...state.activeWorkout,
            workout: { ...state.activeWorkout.workout, exercises: updateExercises(state.activeWorkout.workout.exercises) },
          }
        : state.activeWorkout;
      
      return { todayWorkout: updatedToday, activeWorkout: updatedActive };
    });
  },
  
  applyCoachActions: (actions: any[]) => {
    const { modifyExercise, swapExercise, setRestTimer, todayWorkout, nextExercise, setTodayWorkoutByType } = get();
    console.log(`[WorkoutStore] applyCoachActions called with ${actions.length} actions:`, JSON.stringify(actions));
    
    for (const action of actions) {
      switch (action.type) {
        case 'set_workout': {
          const workoutType = action.workout_type || 'push';
          const title = action.title || '';
          setTodayWorkoutByType(workoutType, title);
          break;
        }
        
        case 'modify_exercise':
          modifyExercise(action.exercise_name, {
            sets: action.new_sets,
            reps: action.new_reps,
            weight: action.new_weight,
          });
          break;
          
        case 'swap_exercise': {
          const existingEx = todayWorkout?.exercises.find(
            (e) => e.name.toLowerCase() === (action.exercise_name || '').toLowerCase()
          );
          if (existingEx) {
            swapExercise(existingEx.id, {
              ...existingEx,
              name: action.new_exercise_name || existingEx.name,
              sets: action.new_sets ?? existingEx.sets,
              reps: action.new_reps ?? existingEx.reps,
              weight: action.new_weight ?? existingEx.weight,
              targetMuscles: action.target_muscles ?? existingEx.targetMuscles,
              completedSets: 0,
              isCompleted: false,
            });
          }
          break;
        }
          
        case 'adjust_rest':
          if (action.new_rest_seconds) {
            setRestTimer(action.new_rest_seconds);
          }
          break;
          
        case 'skip_exercise':
          nextExercise();
          break;
      }
    }
  },

  reorderExercise: (fromIndex: number, toIndex: number) => {
    set((state) => {
      if (!state.todayWorkout) return state;
      const exercises = [...state.todayWorkout.exercises];
      if (fromIndex < 0 || fromIndex >= exercises.length || toIndex < 0 || toIndex >= exercises.length) return state;
      const [moved] = exercises.splice(fromIndex, 1);
      exercises.splice(toIndex, 0, moved);
      return {
        todayWorkout: { ...state.todayWorkout, exercises },
      };
    });
  },

  saveWorkoutLog: (log: WorkoutLog) => {
    set((state) => {
      // Also add the workout to workoutHistory (legacy format) for compatibility
      const historyEntry: Workout = {
        id: log.id,
        title: log.workoutTitle,
        type: log.workoutType as Workout['type'],
        duration: Math.round(log.durationSeconds / 60),
        intensity: 'moderate',
        targetMuscles: log.targetMuscles,
        date: log.date,
        exercises: log.exercises.map((ex, i) => ({
          id: `${log.id}_ex_${i}`,
          name: ex.name,
          targetMuscles: ex.targetMuscles,
          sets: ex.sets,
          reps: ex.reps,
          weight: ex.weight,
          isCompleted: ex.completedSets >= ex.sets,
          completedSets: ex.completedSets,
        })),
      };
      
      console.log(`[WorkoutStore] Saved workout log: ${log.workoutTitle} (${log.totalExercisesCompleted} exercises, ${log.totalSetsCompleted} sets)`);
      
      return {
        workoutLogs: [log, ...state.workoutLogs],
        workoutHistory: [historyEntry, ...state.workoutHistory],
        // Reset active workout
        activeWorkout: {
          workout: null,
          currentExerciseIndex: 0,
          startTime: null,
          restTimer: 0,
          isResting: false,
        },
      };
    });
  },
}));
