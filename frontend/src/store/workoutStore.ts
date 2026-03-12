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
};

interface WorkoutState {
  todayWorkout: Workout | null;
  activeWorkout: ActiveWorkoutState;
  workoutHistory: Workout[];
  
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
  reorderExercise: (fromIndex: number, toIndex: number) => void;
}

export const useWorkoutStore = create<WorkoutState>((set, get) => ({
  todayWorkout: null,
  activeWorkout: {
    workout: null,
    currentExerciseIndex: 0,
    startTime: null,
    restTimer: 0,
    isResting: false,
  },
  workoutHistory: [],
  
  loadTodayWorkout: () => {
    set({ todayWorkout: generateTodayWorkout() });
  },
  
  setTodayWorkoutByType: (type: string, title: string) => {
    const template = WORKOUT_TEMPLATES[type];
    if (template) {
      const workout = {
        ...template,
        id: `workout_${Date.now()}`,
        title: title || template.title,
      };
      set({ todayWorkout: workout });
    } else {
      // Fallback to default push day
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
    const { modifyExercise, swapExercise, setRestTimer, todayWorkout, nextExercise } = get();
    
    for (const action of actions) {
      switch (action.type) {
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
}));
