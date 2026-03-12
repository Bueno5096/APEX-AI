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

interface WorkoutState {
  todayWorkout: Workout | null;
  activeWorkout: ActiveWorkoutState;
  workoutHistory: Workout[];
  
  loadTodayWorkout: () => void;
  startWorkout: () => void;
  endWorkout: () => void;
  completeSet: (exerciseId: string) => void;
  nextExercise: () => void;
  previousExercise: () => void;
  setRestTimer: (seconds: number) => void;
  decrementRestTimer: () => void;
  swapExercise: (exerciseId: string, newExercise: Exercise) => void;
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
}));
