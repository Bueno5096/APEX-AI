import { useWorkoutStore, Workout, Exercise } from '../store/workoutStore';

interface NewExerciseInput {
  name?: string;
  targetMuscles?: string[];
  target_muscles?: string[];
  sets?: number;
  reps?: string | number;
  weight?: number;
  primaryMuscle?: string;
  previousPerformance?: Exercise['previousPerformance'];
}

interface CoachAction {
  type: string;
  exercise_name?: string;
  new_exercise_name?: string;
  new_sets?: number;
  new_reps?: string;
  new_weight?: number;
  target_muscles?: string[];
  new_rest_seconds?: number;
  workout?: Workout;
  exercise?: NewExerciseInput;
  position?: string;
  weight?: number;
  operation?: string;
}

let _idCounter = 0;
function generateId(): string {
  const counter = (++_idCounter).toString(36).padStart(4, '0');
  const timestamp = Date.now().toString(36);
  const random = Math.floor(Math.random() * 0xFFFFFF).toString(16).padStart(6, '0');
  return `${timestamp}${random}${counter}`;
}

/**
 * WorkoutEngine — Single source of truth for all workout operations.
 * Every part of the app that starts, modifies, or implements a workout MUST use this service.
 */
class WorkoutEngine {

  /** Normalize any workout-like object into a valid Workout for the store */
  static normalizeWorkout(workout: Partial<Workout> & { name?: string; estimatedDuration?: number }): Workout {
    return {
      id: workout.id || `wk_${generateId()}`,
      title: workout.title || workout.name || 'Today\'s Workout',
      type: workout.type || 'full',
      duration: workout.duration || workout.estimatedDuration || 45,
      intensity: workout.intensity || 'moderate',
      targetMuscles: workout.targetMuscles || [],
      exercises: (workout.exercises || []).map((ex, index) => ({
        id: ex.id || `ex_${generateId()}_${index}`,
        name: ex.name || `Exercise ${index + 1}`,
        targetMuscles: ex.targetMuscles?.length ? ex.targetMuscles : ['General'],
        sets: typeof ex.sets === 'number' ? ex.sets : 3,
        reps: ex.reps ? String(ex.reps) : '10',
        weight: typeof ex.weight === 'number' ? ex.weight : undefined,
        isCompleted: false,
        completedSets: 0,
        previousPerformance: ex.previousPerformance,
      })),
    };
  }

  /** SET a workout as today's workout (pre-workout view). Navigating to workout tab will show it. */
  static setTodayWorkout(workout: Partial<Workout> & { name?: string; estimatedDuration?: number }): Workout {
    try {
      console.log('WorkoutEngine: Setting today workout:', workout?.title || workout?.name);
      const normalized = WorkoutEngine.normalizeWorkout(workout);
      useWorkoutStore.getState().setTodayWorkoutDirect(normalized);
      
      // Verify
      const saved = useWorkoutStore.getState().todayWorkout;
      if (!saved || saved.id !== normalized.id) {
        throw new Error('Workout was not saved to store correctly');
      }
      console.log(`WorkoutEngine: ✅ Today workout set: "${normalized.title}" with ${normalized.exercises.length} exercises`);
      return normalized;
    } catch (error: any) {
      console.error('WorkoutEngine: ❌ setTodayWorkout failed:', error.message);
      throw error;
    }
  }

  /** START the workout immediately (sets it as active with timer running) */
  static startWorkoutDirect(workout: Partial<Workout> & { name?: string; estimatedDuration?: number }): Workout {
    try {
      console.log('WorkoutEngine: Starting workout directly:', workout?.title || workout?.name);
      const normalized = WorkoutEngine.normalizeWorkout(workout);
      useWorkoutStore.getState().setActiveWorkoutDirect(normalized);
      
      const saved = useWorkoutStore.getState().activeWorkout;
      if (!saved || !saved.workout || saved.workout.id !== normalized.id) {
        throw new Error('Workout was not activated in store correctly');
      }
      console.log(`WorkoutEngine: ✅ Workout started: "${normalized.title}" with ${normalized.exercises.length} exercises`);
      return normalized;
    } catch (error: any) {
      console.error('WorkoutEngine: ❌ startWorkoutDirect failed:', error.message);
      throw error;
    }
  }

  /** START today's workout (transition from pre-workout to active) */
  static startTodayWorkout(): Workout {
    try {
      const todayWorkout = useWorkoutStore.getState().todayWorkout;
      if (!todayWorkout) throw new Error('No today workout to start — call setTodayWorkout first');
      useWorkoutStore.getState().startWorkout();
      console.log(`WorkoutEngine: ✅ Today workout started: "${todayWorkout.title}"`);
      return todayWorkout;
    } catch (error: any) {
      console.error('WorkoutEngine: ❌ startTodayWorkout failed:', error.message);
      throw error;
    }
  }

  /** REPLACE one exercise by name with a new exercise at the same position */
  static replaceExercise(oldExerciseName: string, newExercise: NewExerciseInput): { success: boolean; oldExercise: string; newExercise: string; position: number } {
    try {
      const state = useWorkoutStore.getState();
      const workout = state.activeWorkout.workout || state.todayWorkout;
      if (!workout) throw new Error('No active or today workout to modify');

      const lowerOldName = oldExerciseName.toLowerCase().trim();
      let index = workout.exercises.findIndex(
        (ex: any) => ex.name.toLowerCase().trim() === lowerOldName
      );
      
      // Try partial match
      if (index === -1) {
        index = workout.exercises.findIndex(
          (ex: any) => ex.name.toLowerCase().includes(lowerOldName) || lowerOldName.includes(ex.name.toLowerCase())
        );
      }
      
      if (index === -1) {
        throw new Error(`Exercise "${oldExerciseName}" not found. Available: ${workout.exercises.map((e: any) => e.name).join(', ')}`);
      }

      const oldExercise = workout.exercises[index];
      const replacement = {
        id: `ex_${generateId()}`,
        name: newExercise.name || 'New Exercise',
        targetMuscles: newExercise.targetMuscles || newExercise.target_muscles || oldExercise.targetMuscles,
        sets: newExercise.sets || oldExercise.sets,
        reps: newExercise.reps ? String(newExercise.reps) : oldExercise.reps,
        weight: newExercise.weight !== undefined ? newExercise.weight : oldExercise.weight,
        isCompleted: false,
        completedSets: 0,
      };

      // Use the store's swapExercise
      state.swapExercise(oldExercise.id, replacement);
      
      console.log(`WorkoutEngine: ✅ Replaced "${oldExercise.name}" with "${replacement.name}" at position ${index}`);
      return { success: true, oldExercise: oldExercise.name, newExercise: replacement.name, position: index };
    } catch (error: any) {
      console.error('WorkoutEngine: ❌ replaceExercise failed:', error.message);
      throw error;
    }
  }

  /** UPDATE weight for a specific exercise */
  static updateExerciseWeight(exerciseName: string, newWeight: number, operation: string = 'set'): { success: boolean; exerciseName: string; oldWeight: number; newWeight: number } {
    try {
      const state = useWorkoutStore.getState();
      const workout = state.activeWorkout.workout || state.todayWorkout;
      if (!workout) throw new Error('No active workout');

      const exercise = workout.exercises.find(
        (ex: any) => ex.name.toLowerCase().trim() === exerciseName.toLowerCase().trim()
      );
      if (!exercise) throw new Error(`Exercise "${exerciseName}" not found`);

      const currentWeight = exercise.weight || 0;
      let calculatedWeight = newWeight;

      if (operation === 'increase') {
        const isCompound = ['squat', 'bench', 'deadlift', 'press', 'row', 'pull'].some(
          kw => new RegExp(`\\b${kw}\\b`, 'i').test(exerciseName)
        );
        calculatedWeight = currentWeight + (newWeight || (isCompound ? 5 : 2.5));
      } else if (operation === 'decrease') {
        const isCompound = ['squat', 'bench', 'deadlift', 'press', 'row', 'pull'].some(
          kw => new RegExp(`\\b${kw}\\b`, 'i').test(exerciseName)
        );
        calculatedWeight = Math.max(0, currentWeight - (newWeight || (isCompound ? 5 : 2.5)));
      }

      state.modifyExercise(exerciseName, { weight: calculatedWeight });
      console.log(`WorkoutEngine: ✅ ${exerciseName} weight: ${currentWeight} → ${calculatedWeight}`);
      return { success: true, exerciseName, oldWeight: currentWeight, newWeight: calculatedWeight };
    } catch (error: any) {
      console.error('WorkoutEngine: ❌ updateExerciseWeight failed:', error.message);
      throw error;
    }
  }

  /** UPDATE sets/reps for an exercise */
  static updateExerciseSetsReps(exerciseName: string, sets?: number, reps?: string): any {
    try {
      const state = useWorkoutStore.getState();
      state.modifyExercise(exerciseName, { sets, reps });
      console.log(`WorkoutEngine: ✅ Updated ${exerciseName}: sets=${sets}, reps=${reps}`);
      return { success: true, exerciseName, sets, reps };
    } catch (error: any) {
      console.error('WorkoutEngine: ❌ updateExerciseSetsReps failed:', error.message);
      throw error;
    }
  }

  /** REMOVE an exercise from the workout */
  static removeExercise(exerciseName: string): any {
    try {
      const state = useWorkoutStore.getState();
      const activeWorkoutData = state.activeWorkout.workout;
      const todayWorkoutData = state.todayWorkout;
      const workout = activeWorkoutData || todayWorkoutData;
      if (!workout) throw new Error('No active workout');

      const lowerName = exerciseName.toLowerCase().trim();
      const exercise = workout.exercises.find(
        (ex: any) => ex.name.toLowerCase().trim() === lowerName
      );
      if (!exercise) throw new Error(`Exercise "${exerciseName}" not found`);

      const filtered = workout.exercises.filter(
        (ex: any) => ex.name.toLowerCase().trim() !== lowerName
      );

      // Update both todayWorkout and activeWorkout atomically
      useWorkoutStore.setState((s) => ({
        todayWorkout: s.todayWorkout
          ? { ...s.todayWorkout, exercises: filtered }
          : s.todayWorkout,
        activeWorkout: s.activeWorkout.workout
          ? {
              ...s.activeWorkout,
              workout: { ...s.activeWorkout.workout, exercises: filtered },
            }
          : s.activeWorkout,
      }));

      // Verify removal from both slices
      const newState = useWorkoutStore.getState();
      const stillInActive = newState.activeWorkout.workout?.exercises.some(
        (ex: any) => ex.name.toLowerCase().trim() === lowerName
      );
      const stillInToday = newState.todayWorkout?.exercises.some(
        (ex: any) => ex.name.toLowerCase().trim() === lowerName
      );
      if (stillInActive || stillInToday) {
        throw new Error(`Failed to remove "${exerciseName}" from one or both workout slices`);
      }

      console.log(`WorkoutEngine: ✅ Removed exercise: ${exerciseName}`);
      return { success: true, exerciseName };
    } catch (error: any) {
      console.error('WorkoutEngine: ❌ removeExercise failed:', error.message);
      throw error;
    }
  }

  /** ADD a new exercise to the workout */
  static addExercise(exercise: any, position: string = 'end'): any {
    try {
      const state = useWorkoutStore.getState();
      const workout = state.activeWorkout.workout || state.todayWorkout;
      if (!workout) throw new Error('No active workout');

      const newExercise = {
        id: `ex_${generateId()}`,
        name: exercise.name,
        targetMuscles: exercise.targetMuscles || exercise.primaryMuscle ? [exercise.primaryMuscle] : ['General'],
        sets: exercise.sets || 3,
        reps: exercise.reps ? String(exercise.reps) : '10',
        weight: exercise.weight || undefined,
        isCompleted: false,
        completedSets: 0,
      };

      const exercises = position === 'end'
        ? [...workout.exercises, newExercise]
        : [newExercise, ...workout.exercises];

      state.setTodayWorkoutDirect({ ...workout, exercises });
      console.log(`WorkoutEngine: ✅ Added exercise: ${exercise.name} at ${position}`);
      return { success: true, exerciseName: exercise.name };
    } catch (error: any) {
      console.error('WorkoutEngine: ❌ addExercise failed:', error.message);
      throw error;
    }
  }

  /** REPLACE entire workout with a completely new one */
  static replaceEntireWorkout(newWorkout: any): any {
    try {
      console.log('WorkoutEngine: Replacing entire workout with:', newWorkout?.name);
      return WorkoutEngine.setTodayWorkout(newWorkout);
    } catch (error: any) {
      console.error('WorkoutEngine: ❌ replaceEntireWorkout failed:', error.message);
      throw error;
    }
  }

  /** Execute an action from the Coach AI backend */
  static executeAction(action: CoachAction): unknown {
    switch (action.type) {
      case 'swap_exercise':
        return WorkoutEngine.replaceExercise(action.exercise_name, {
          name: action.new_exercise_name,
          sets: action.new_sets,
          reps: action.new_reps,
          weight: action.new_weight,
          targetMuscles: action.target_muscles,
        });
      case 'modify_exercise':
        return WorkoutEngine.updateExerciseSetsReps(
          action.exercise_name,
          action.new_sets,
          action.new_reps
        );
      case 'replace_entire_workout':
        return WorkoutEngine.replaceEntireWorkout(action.workout);
      case 'add_exercise':
        return WorkoutEngine.addExercise(action.exercise || action, action.position);
      case 'remove_exercise':
        return WorkoutEngine.removeExercise(action.exercise_name);
      case 'update_weight':
        return WorkoutEngine.updateExerciseWeight(
          action.exercise_name,
          action.weight || action.new_weight,
          action.operation || 'set'
        );
      case 'skip_exercise':
        useWorkoutStore.getState().nextExercise();
        return { success: true };
      case 'adjust_rest':
        if (action.new_rest_seconds) {
          useWorkoutStore.getState().setRestTimer(action.new_rest_seconds);
        }
        return { success: true };
      case 'set_workout':
        return WorkoutEngine.replaceEntireWorkout(action);
      default:
        console.warn('WorkoutEngine: Unknown action type:', action.type);
        return { success: false, error: `Unknown action type: ${action.type}` };
    }
  }

  /** Execute all actions from a Coach response and return results */
  static executeAllActions(actions: CoachAction[]): { action: CoachAction; result?: unknown; error?: string; success: boolean }[] {
    const results: { action: CoachAction; result?: unknown; error?: string; success: boolean }[] = [];
    for (const action of actions) {
      try {
        const result = WorkoutEngine.executeAction(action);
        results.push({ action, result, success: true });
        console.log(`WorkoutEngine: ✅ Action ${action.type} executed`);
      } catch (error: any) {
        results.push({ action, error: error.message, success: false });
        console.error(`WorkoutEngine: ❌ Action ${action.type} failed: ${error.message}`);
      }
    }
    return results;
  }

  /** Get a description string for a completed action */
  static getActionDescription(action: CoachAction): string {
    switch (action.type) {
      case 'swap_exercise':
        return `✓ Replaced "${action.exercise_name}" → "${action.new_exercise_name}"`;
      case 'modify_exercise':
        const parts = [];
        if (action.new_sets) parts.push(`${action.new_sets} sets`);
        if (action.new_reps) parts.push(`${action.new_reps} reps`);
        if (action.new_weight) parts.push(`${action.new_weight} weight`);
        return `✓ Updated ${action.exercise_name}: ${parts.join(', ')}`;
      case 'replace_entire_workout':
        return `✓ Workout changed to "${action.workout?.name || action.title || 'New Workout'}"`;
      case 'add_exercise':
        return `✓ Added "${action.exercise?.name || action.name}" to workout`;
      case 'remove_exercise':
        return `✓ Removed "${action.exercise_name}" from workout`;
      case 'skip_exercise':
        return `✓ Skipped to next exercise`;
      case 'adjust_rest':
        return `✓ Rest timer set to ${action.new_rest_seconds}s`;
      default:
        return `✓ Applied ${action.type}`;
    }
  }
}

export default WorkoutEngine;
