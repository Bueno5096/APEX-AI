import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ─── Training Style & Split Data ────────────────────
export interface TrainingStyleInfo {
  key: string;
  name: string;
  description: string;
  repRanges: string;
  focus: string;
  coachBehavior: string;
  bestFor: string;
  icon: string;
}

export const TRAINING_STYLES: TrainingStyleInfo[] = [
  { key: 'bodybuilding', name: 'Bodybuilding', description: 'Maximize muscle size through high volume and isolation work', repRanges: '8-12 compound, 12-15 isolation', focus: 'Mind-muscle connection, pump, volume', coachBehavior: 'Emphasizes isolation exercises, drop sets, supersets, time under tension cues', bestFor: 'Intermediate to advanced, aesthetic goals', icon: 'body' },
  { key: 'powerlifting', name: 'Powerlifting', description: 'Build maximum strength through the squat, bench, and deadlift', repRanges: '1-5 main lifts, 3-8 accessories', focus: 'The big three, progressive overload, strength', coachBehavior: 'Always includes squat/bench/deadlift as main lift, longer rest (3-5 min), RPE based', bestFor: 'Any level, strength goals', icon: 'barbell' },
  { key: 'calisthenics', name: 'Calisthenics', description: 'Build strength and skill using only your bodyweight', repRanges: 'Skill progressions, 5-15 reps', focus: 'Movement quality, skill development, no equipment', coachBehavior: 'Progressions from easier to harder variations, includes skill work like L-sit, handstand', bestFor: 'Any level, home or outdoor training', icon: 'accessibility' },
  { key: 'yoga', name: 'Yoga', description: 'Improve flexibility, balance, and mindfulness through movement', repRanges: 'Pose holds, flow sequences', focus: 'Poses, breathing, flexibility, recovery', coachBehavior: 'Recommends yoga on rest days, focuses on mobility, breathing cues, stress relief', bestFor: 'Any level, recovery and flexibility goals', icon: 'leaf' },
  { key: 'pilates', name: 'Pilates', description: 'Strengthen your core and improve posture through controlled movement', repRanges: '10-20 reps, slow and controlled', focus: 'Core stability, posture, controlled movement', coachBehavior: 'Emphasizes core exercises, breathing patterns, postural alignment, low impact', bestFor: 'Any level, core strength and posture', icon: 'fitness' },
  { key: 'sport_specific', name: 'Sport Specific', description: 'Train to improve performance in your specific sport', repRanges: 'Varies by sport demands', focus: 'Power, speed, agility, sport-specific patterns', coachBehavior: 'Tailors exercises to specific sport, includes plyometrics, agility, explosive movements', bestFor: 'Athletes, any level', icon: 'football' },
  { key: 'crossfit', name: 'CrossFit / Functional', description: 'High intensity functional movements for total body conditioning', repRanges: 'High reps, time-based, AMRAP, EMOM', focus: 'Conditioning, functional movements, intensity', coachBehavior: 'Programs WOD style (AMRAP, EMOM, For Time), includes Olympic lifts, kettlebells', bestFor: 'Intermediate to advanced, conditioning goals', icon: 'flash' },
  { key: 'hybrid', name: 'Hybrid', description: 'Combine multiple training styles for a well-rounded program', repRanges: 'Varies by day and style rotation', focus: 'Balance of strength, hypertrophy, conditioning, mobility', coachBehavior: 'Rotates between heavy days, volume days, and conditioning days', bestFor: 'Any level, balanced fitness goals', icon: 'git-merge' },
];

export interface TrainingSplitInfo {
  key: string;
  name: string;
  description: string;
  bestFor: string;
  schedule: string;
  tag?: string;
  daysPerWeek: number;
}

export const TRAINING_SPLITS: TrainingSplitInfo[] = [
  { key: 'full_body', name: 'Full Body', description: 'Work all major muscle groups each workout', bestFor: 'Beginners, 2-3 days/week', schedule: 'Each session = chest + back + shoulders + arms + legs + core', tag: 'RECOMMENDED FOR BEGINNERS', daysPerWeek: 3 },
  { key: 'upper_lower', name: 'Upper / Lower', description: 'Alternate upper and lower body workouts', bestFor: 'Intermediate, 4 days/week', schedule: 'Upper A / Lower A / Rest / Upper B / Lower B / Rest / Rest', daysPerWeek: 4 },
  { key: 'push_pull_legs', name: 'Push / Pull / Legs', description: 'Focus on one movement pattern per workout', bestFor: 'Intermediate to advanced, 3-6 days/week', schedule: 'Push (chest+shoulders+triceps) / Pull (back+biceps) / Legs — repeat', daysPerWeek: 6 },
  { key: 'fresh_muscle', name: 'Fresh Muscle Groups', description: 'Focus each workout on your two most recovered muscle groups', bestFor: 'Anyone who wants AI-driven dynamic programming', schedule: 'Coach checks muscle readiness daily and selects focus', tag: 'AI POWERED', daysPerWeek: 5 },
  { key: 'bro_split', name: 'Bro Split', description: 'One muscle group per day for maximum volume', bestFor: 'Advanced, 5 days/week', schedule: 'Chest / Back / Shoulders / Arms / Legs', daysPerWeek: 5 },
  { key: 'arnold_split', name: 'Arnold Split', description: 'Chest and back together, shoulders and arms together, legs', bestFor: 'Intermediate to advanced, 6 days/week', schedule: 'Chest+Back / Shoulders+Arms / Legs — repeat 2x/week', daysPerWeek: 6 },
  { key: 'athletic', name: 'Athletic Performance', description: 'Functional movements for strength, speed, and power', bestFor: 'Athletes, any experience level', schedule: 'Power day / Strength day / Conditioning day — repeat', daysPerWeek: 5 },
  { key: 'bodyweight_only', name: 'Bodyweight Only', description: 'No equipment needed — build strength anywhere', bestFor: 'Home workouts, travelers, beginners', schedule: 'Push / Pull / Legs — all bodyweight movements', daysPerWeek: 3 },
];

// ─── Workout Templates ─────────────────────────────
export interface WorkoutTemplate {
  id: string;
  name: string;
  category: string;
  description: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  duration: number;
  targetMuscles: string[];
  equipment: string;
  exercises: {
    name: string;
    sets: number;
    reps: string;
    restSeconds: number;
    notes?: string;
  }[];
}

export const WORKOUT_TEMPLATES: WorkoutTemplate[] = [
  // PUSH
  {
    id: 'tpl_push_1', name: 'Classic Push Day', category: 'Push', description: 'Chest, shoulders, triceps with compound lifts', difficulty: 'intermediate', duration: 50, targetMuscles: ['Chest', 'Shoulders', 'Triceps'], equipment: 'Full Gym',
    exercises: [
      { name: 'Barbell Bench Press', sets: 4, reps: '8-10', restSeconds: 120 },
      { name: 'Incline Dumbbell Press', sets: 3, reps: '10-12', restSeconds: 90 },
      { name: 'Overhead Press', sets: 3, reps: '8-10', restSeconds: 90 },
      { name: 'Lateral Raise', sets: 3, reps: '12-15', restSeconds: 60 },
      { name: 'Tricep Pushdown', sets: 3, reps: '12-15', restSeconds: 60 },
      { name: 'Skull Crusher', sets: 3, reps: '10-12', restSeconds: 60 },
    ],
  },
  // PULL
  {
    id: 'tpl_pull_1', name: 'Back & Biceps Blast', category: 'Pull', description: 'Heavy back work with bicep finishers', difficulty: 'intermediate', duration: 50, targetMuscles: ['Back', 'Biceps'], equipment: 'Full Gym',
    exercises: [
      { name: 'Deadlift', sets: 4, reps: '5', restSeconds: 180 },
      { name: 'Pull Up', sets: 4, reps: '6-10', restSeconds: 120 },
      { name: 'Barbell Row', sets: 4, reps: '8-10', restSeconds: 120 },
      { name: 'Face Pull', sets: 3, reps: '15', restSeconds: 60 },
      { name: 'Barbell Curl', sets: 3, reps: '10-12', restSeconds: 60 },
      { name: 'Hammer Curl', sets: 3, reps: '12', restSeconds: 60 },
    ],
  },
  // LEGS
  {
    id: 'tpl_legs_1', name: 'Leg Day Destroyer', category: 'Legs', description: 'Quads, hamstrings, and glutes', difficulty: 'intermediate', duration: 55, targetMuscles: ['Quads', 'Hamstrings', 'Glutes', 'Calves'], equipment: 'Full Gym',
    exercises: [
      { name: 'Barbell Squat', sets: 4, reps: '8-10', restSeconds: 180 },
      { name: 'Romanian Deadlift', sets: 3, reps: '10-12', restSeconds: 120 },
      { name: 'Leg Press', sets: 3, reps: '12-15', restSeconds: 120 },
      { name: 'Leg Curl', sets: 3, reps: '12-15', restSeconds: 60 },
      { name: 'Hip Thrust', sets: 3, reps: '12', restSeconds: 90 },
      { name: 'Calf Raise', sets: 4, reps: '15-20', restSeconds: 60 },
    ],
  },
  // UPPER BODY
  {
    id: 'tpl_upper_1', name: 'Upper Body Power', category: 'Upper', description: 'Complete upper body with heavy compounds', difficulty: 'intermediate', duration: 55, targetMuscles: ['Chest', 'Back', 'Shoulders', 'Biceps', 'Triceps'], equipment: 'Full Gym',
    exercises: [
      { name: 'Barbell Bench Press', sets: 4, reps: '6-8', restSeconds: 120 },
      { name: 'Barbell Row', sets: 4, reps: '6-8', restSeconds: 120 },
      { name: 'Dumbbell Shoulder Press', sets: 3, reps: '10-12', restSeconds: 90 },
      { name: 'Lat Pulldown', sets: 3, reps: '10-12', restSeconds: 90 },
      { name: 'Barbell Curl', sets: 3, reps: '10-12', restSeconds: 60 },
      { name: 'Tricep Pushdown', sets: 3, reps: '12-15', restSeconds: 60 },
    ],
  },
  // FULL BODY
  {
    id: 'tpl_full_1', name: 'Full Body Fundamentals', category: 'Full Body', description: 'Hit every muscle group in one session', difficulty: 'beginner', duration: 45, targetMuscles: ['Chest', 'Back', 'Shoulders', 'Quads', 'Core'], equipment: 'Full Gym',
    exercises: [
      { name: 'Barbell Squat', sets: 3, reps: '10', restSeconds: 120 },
      { name: 'Barbell Bench Press', sets: 3, reps: '10', restSeconds: 90 },
      { name: 'Barbell Row', sets: 3, reps: '10', restSeconds: 90 },
      { name: 'Overhead Press', sets: 3, reps: '10', restSeconds: 90 },
      { name: 'Romanian Deadlift', sets: 3, reps: '10', restSeconds: 90 },
      { name: 'Plank', sets: 3, reps: '45s', restSeconds: 60 },
    ],
  },
  // BODYWEIGHT
  {
    id: 'tpl_bw_1', name: 'No Equipment Required', category: 'Bodyweight', description: 'Full body workout anywhere, no gym needed', difficulty: 'beginner', duration: 35, targetMuscles: ['Chest', 'Back', 'Core', 'Quads', 'Glutes'], equipment: 'None',
    exercises: [
      { name: 'Push Up', sets: 4, reps: '15', restSeconds: 60 },
      { name: 'Bodyweight Squat', sets: 4, reps: '20', restSeconds: 60 },
      { name: 'Pull Up', sets: 3, reps: '6-10', restSeconds: 90, notes: 'Use door-frame bar or find a bar' },
      { name: 'Reverse Lunge', sets: 3, reps: '12 each', restSeconds: 60 },
      { name: 'Mountain Climber', sets: 3, reps: '20', restSeconds: 60 },
      { name: 'Plank', sets: 3, reps: '45s', restSeconds: 60 },
      { name: 'Glute Bridge', sets: 3, reps: '20', restSeconds: 60 },
    ],
  },
  // STRENGTH
  {
    id: 'tpl_str_1', name: '5×5 Strength Builder', category: 'Strength', description: 'Classic 5×5 for maximum strength gains', difficulty: 'intermediate', duration: 60, targetMuscles: ['Chest', 'Back', 'Quads', 'Shoulders'], equipment: 'Barbell',
    exercises: [
      { name: 'Barbell Squat', sets: 5, reps: '5', restSeconds: 180 },
      { name: 'Barbell Bench Press', sets: 5, reps: '5', restSeconds: 180 },
      { name: 'Barbell Row', sets: 5, reps: '5', restSeconds: 180 },
      { name: 'Overhead Press', sets: 3, reps: '8', restSeconds: 120 },
      { name: 'Deadlift', sets: 1, reps: '5', restSeconds: 180, notes: 'Work up to top set' },
    ],
  },
  // HIIT
  {
    id: 'tpl_hiit_1', name: 'HIIT Conditioning', category: 'HIIT', description: 'High intensity circuit for fat burning and endurance', difficulty: 'intermediate', duration: 30, targetMuscles: ['Full Body', 'Core'], equipment: 'Minimal',
    exercises: [
      { name: 'Burpee', sets: 4, reps: '10', restSeconds: 30 },
      { name: 'Kettlebell Swing', sets: 4, reps: '15', restSeconds: 30 },
      { name: 'Box Jump', sets: 4, reps: '8', restSeconds: 30 },
      { name: 'Mountain Climber', sets: 4, reps: '20', restSeconds: 30 },
      { name: 'Jump Squat', sets: 4, reps: '12', restSeconds: 30 },
      { name: 'High Knees', sets: 4, reps: '30s', restSeconds: 30 },
    ],
  },
  // DUMBBELL ONLY
  {
    id: 'tpl_db_1', name: 'Dumbbell Only Full Body', category: 'Dumbbell', description: 'Complete workout with just dumbbells', difficulty: 'beginner', duration: 40, targetMuscles: ['Chest', 'Back', 'Shoulders', 'Quads', 'Biceps', 'Triceps'], equipment: 'Dumbbells',
    exercises: [
      { name: 'Dumbbell Bench Press', sets: 4, reps: '10', restSeconds: 90 },
      { name: 'Dumbbell Row', sets: 3, reps: '10 each', restSeconds: 90 },
      { name: 'Dumbbell Shoulder Press', sets: 3, reps: '12', restSeconds: 90 },
      { name: 'Goblet Squat', sets: 3, reps: '12', restSeconds: 90 },
      { name: 'Dumbbell Romanian Deadlift', sets: 3, reps: '12', restSeconds: 90 },
      { name: 'Hammer Curl', sets: 3, reps: '12', restSeconds: 60 },
      { name: 'Overhead Tricep Extension', sets: 3, reps: '12', restSeconds: 60 },
    ],
  },
];

// ─── Exercise Database ─────────────────────────────

export interface ExerciseData {
  id: string;
  name: string;
  description: string;
  instructions: string[];
  primaryMuscle: string;
  secondaryMuscles: string[];
  equipment: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  exerciseType: 'strength' | 'cardio' | 'flexibility' | 'plyometric';
  gifUrl: string;
  defaultSets: number;
  defaultReps: string;
  defaultRestSeconds: number;
}

export interface SavedWorkout {
  id: string;
  name: string;
  targetMuscles: string[];
  exercises: {
    exerciseId: string;
    name: string;
    primaryMuscle: string;
    equipment: string;
    sets: number;
    reps: string;
    weight?: number;
    restSeconds: number;
    notes?: string;
  }[];
  estimatedDuration: number;
  difficulty: string;
  trainingStyle?: string;
  scheduledDays: number[];
  repeatWeekly: boolean;
  createdAt: Date;
}

interface ExerciseState {
  exercises: ExerciseData[];
  savedWorkouts: SavedWorkout[];
  isFetching: boolean;
  loadExercises: () => void;
  saveWorkout: (workout: SavedWorkout) => Promise<void>;
  deleteWorkout: (id: string) => Promise<void>;
  loadSavedWorkouts: () => Promise<void>;
  resetStore: () => Promise<void>;
}

// ─── Local Fallback Database (100+ exercises) ────────
const LOCAL_EXERCISES: ExerciseData[] = [
  // CHEST
  { id: 'ex1', name: 'Barbell Bench Press', description: 'The king of chest exercises', instructions: ['Lie flat on bench','Grip bar slightly wider than shoulders','Lower bar to mid-chest','Press up to full extension'], primaryMuscle: 'Chest', secondaryMuscles: ['Triceps','Shoulders'], equipment: 'Barbell', difficulty: 'intermediate', exerciseType: 'strength', gifUrl: '', defaultSets: 4, defaultReps: '8-10', defaultRestSeconds: 120 },
  { id: 'ex2', name: 'Incline Dumbbell Press', description: 'Target upper chest', instructions: ['Set bench to 30-45 degrees','Press dumbbells up from shoulders','Lower with control'], primaryMuscle: 'Chest', secondaryMuscles: ['Shoulders','Triceps'], equipment: 'Dumbbell', difficulty: 'intermediate', exerciseType: 'strength', gifUrl: '', defaultSets: 3, defaultReps: '10-12', defaultRestSeconds: 90 },
  { id: 'ex3', name: 'Cable Chest Fly', description: 'Isolation for chest', instructions: ['Set cables at shoulder height','Step forward','Bring hands together in arc'], primaryMuscle: 'Chest', secondaryMuscles: ['Shoulders'], equipment: 'Cable machine', difficulty: 'beginner', exerciseType: 'strength', gifUrl: '', defaultSets: 3, defaultReps: '12-15', defaultRestSeconds: 60 },
  { id: 'ex4', name: 'Decline Dumbbell Press', description: 'Target lower chest', instructions: ['Set bench to decline','Press dumbbells up','Lower to chest level'], primaryMuscle: 'Chest', secondaryMuscles: ['Triceps'], equipment: 'Dumbbell', difficulty: 'intermediate', exerciseType: 'strength', gifUrl: '', defaultSets: 3, defaultReps: '10-12', defaultRestSeconds: 90 },
  { id: 'ex5', name: 'Push Up', description: 'Classic bodyweight chest exercise', instructions: ['Hands shoulder-width apart','Lower chest to floor','Push up to full extension'], primaryMuscle: 'Chest', secondaryMuscles: ['Triceps','Shoulders','Core'], equipment: 'Bodyweight', difficulty: 'beginner', exerciseType: 'strength', gifUrl: '', defaultSets: 4, defaultReps: '15', defaultRestSeconds: 60 },
  { id: 'ex6', name: 'Dumbbell Pullover', description: 'Chest and lats stretch', instructions: ['Lie across bench','Hold dumbbell overhead','Lower behind head','Pull back to start'], primaryMuscle: 'Chest', secondaryMuscles: ['Back'], equipment: 'Dumbbell', difficulty: 'intermediate', exerciseType: 'strength', gifUrl: '', defaultSets: 3, defaultReps: '12', defaultRestSeconds: 90 },
  // BACK
  { id: 'ex10', name: 'Deadlift', description: 'Compound back and leg builder', instructions: ['Stand with feet hip-width','Grip bar outside knees','Drive hips forward to stand','Lower with control'], primaryMuscle: 'Back', secondaryMuscles: ['Hamstrings','Glutes','Core'], equipment: 'Barbell', difficulty: 'advanced', exerciseType: 'strength', gifUrl: '', defaultSets: 4, defaultReps: '5', defaultRestSeconds: 180 },
  { id: 'ex11', name: 'Pull Up', description: 'Bodyweight back builder', instructions: ['Grip bar overhand shoulder-width','Pull chin above bar','Lower with control'], primaryMuscle: 'Back', secondaryMuscles: ['Biceps','Shoulders'], equipment: 'Pull up bar', difficulty: 'intermediate', exerciseType: 'strength', gifUrl: '', defaultSets: 4, defaultReps: '6-10', defaultRestSeconds: 120 },
  { id: 'ex12', name: 'Barbell Row', description: 'Thick back builder', instructions: ['Hinge at hips','Pull bar to lower chest','Squeeze shoulder blades','Lower with control'], primaryMuscle: 'Back', secondaryMuscles: ['Biceps','Core'], equipment: 'Barbell', difficulty: 'intermediate', exerciseType: 'strength', gifUrl: '', defaultSets: 4, defaultReps: '8-10', defaultRestSeconds: 120 },
  { id: 'ex13', name: 'Lat Pulldown', description: 'Wide back development', instructions: ['Grip bar wide','Pull to upper chest','Squeeze lats','Return slowly'], primaryMuscle: 'Back', secondaryMuscles: ['Biceps'], equipment: 'Cable machine', difficulty: 'beginner', exerciseType: 'strength', gifUrl: '', defaultSets: 3, defaultReps: '10-12', defaultRestSeconds: 90 },
  { id: 'ex14', name: 'Seated Cable Row', description: 'Mid-back thickness', instructions: ['Sit upright','Pull handle to torso','Squeeze back','Return slowly'], primaryMuscle: 'Back', secondaryMuscles: ['Biceps'], equipment: 'Cable machine', difficulty: 'beginner', exerciseType: 'strength', gifUrl: '', defaultSets: 3, defaultReps: '12', defaultRestSeconds: 90 },
  { id: 'ex15', name: 'Face Pull', description: 'Rear delts and upper back', instructions: ['Set cable at head height','Pull rope to face','Externally rotate','Return slowly'], primaryMuscle: 'Back', secondaryMuscles: ['Shoulders'], equipment: 'Cable machine', difficulty: 'beginner', exerciseType: 'strength', gifUrl: '', defaultSets: 3, defaultReps: '15', defaultRestSeconds: 60 },
  { id: 'ex16', name: 'Dumbbell Row', description: 'Unilateral back work', instructions: ['Support on bench','Pull dumbbell to hip','Squeeze lat','Lower with control'], primaryMuscle: 'Back', secondaryMuscles: ['Biceps'], equipment: 'Dumbbell', difficulty: 'beginner', exerciseType: 'strength', gifUrl: '', defaultSets: 3, defaultReps: '10 each', defaultRestSeconds: 90 },
  // SHOULDERS
  { id: 'ex20', name: 'Overhead Press', description: 'Shoulder strength builder', instructions: ['Stand with bar at shoulders','Press overhead','Lock out arms','Lower with control'], primaryMuscle: 'Shoulders', secondaryMuscles: ['Triceps','Core'], equipment: 'Barbell', difficulty: 'intermediate', exerciseType: 'strength', gifUrl: '', defaultSets: 4, defaultReps: '8-10', defaultRestSeconds: 120 },
  { id: 'ex21', name: 'Lateral Raise', description: 'Side delt isolation', instructions: ['Hold dumbbells at sides','Raise to shoulder height','Lower slowly'], primaryMuscle: 'Shoulders', secondaryMuscles: [], equipment: 'Dumbbell', difficulty: 'beginner', exerciseType: 'strength', gifUrl: '', defaultSets: 3, defaultReps: '12-15', defaultRestSeconds: 60 },
  { id: 'ex22', name: 'Arnold Press', description: 'Full shoulder rotation press', instructions: ['Start with palms facing you','Rotate and press overhead','Reverse on way down'], primaryMuscle: 'Shoulders', secondaryMuscles: ['Triceps'], equipment: 'Dumbbell', difficulty: 'intermediate', exerciseType: 'strength', gifUrl: '', defaultSets: 3, defaultReps: '10', defaultRestSeconds: 90 },
  { id: 'ex23', name: 'Front Raise', description: 'Front delt isolation', instructions: ['Hold dumbbells in front','Raise to shoulder height','Lower slowly'], primaryMuscle: 'Shoulders', secondaryMuscles: [], equipment: 'Dumbbell', difficulty: 'beginner', exerciseType: 'strength', gifUrl: '', defaultSets: 3, defaultReps: '12', defaultRestSeconds: 60 },
  { id: 'ex24', name: 'Rear Delt Fly', description: 'Rear delt isolation', instructions: ['Bend over or use machine','Raise arms out to sides','Squeeze rear delts','Lower slowly'], primaryMuscle: 'Shoulders', secondaryMuscles: ['Back'], equipment: 'Dumbbell', difficulty: 'beginner', exerciseType: 'strength', gifUrl: '', defaultSets: 3, defaultReps: '15', defaultRestSeconds: 60 },
  { id: 'ex25', name: 'Dumbbell Shoulder Press', description: 'Seated shoulder press', instructions: ['Sit upright','Press dumbbells overhead','Lower to shoulders'], primaryMuscle: 'Shoulders', secondaryMuscles: ['Triceps'], equipment: 'Dumbbell', difficulty: 'beginner', exerciseType: 'strength', gifUrl: '', defaultSets: 3, defaultReps: '12', defaultRestSeconds: 90 },
  { id: 'ex26', name: 'Upright Row', description: 'Shoulders and traps', instructions: ['Hold bar at waist','Pull to chin','Lead with elbows','Lower slowly'], primaryMuscle: 'Shoulders', secondaryMuscles: ['Traps'], equipment: 'Barbell', difficulty: 'intermediate', exerciseType: 'strength', gifUrl: '', defaultSets: 3, defaultReps: '12', defaultRestSeconds: 90 },
  // ARMS
  { id: 'ex30', name: 'Barbell Curl', description: 'Bicep mass builder', instructions: ['Stand with bar at arms length','Curl to shoulders','Lower with control'], primaryMuscle: 'Biceps', secondaryMuscles: ['Forearms'], equipment: 'Barbell', difficulty: 'beginner', exerciseType: 'strength', gifUrl: '', defaultSets: 3, defaultReps: '10-12', defaultRestSeconds: 60 },
  { id: 'ex31', name: 'Hammer Curl', description: 'Bicep and brachialis', instructions: ['Hold dumbbells with neutral grip','Curl up','Lower with control'], primaryMuscle: 'Biceps', secondaryMuscles: ['Forearms'], equipment: 'Dumbbell', difficulty: 'beginner', exerciseType: 'strength', gifUrl: '', defaultSets: 3, defaultReps: '12', defaultRestSeconds: 60 },
  { id: 'ex32', name: 'Preacher Curl', description: 'Strict bicep isolation', instructions: ['Rest arms on pad','Curl bar up','Lower fully'], primaryMuscle: 'Biceps', secondaryMuscles: [], equipment: 'Barbell', difficulty: 'beginner', exerciseType: 'strength', gifUrl: '', defaultSets: 3, defaultReps: '12', defaultRestSeconds: 60 },
  { id: 'ex33', name: 'Tricep Pushdown', description: 'Tricep isolation', instructions: ['Stand at cable machine','Push bar down','Squeeze triceps','Return slowly'], primaryMuscle: 'Triceps', secondaryMuscles: [], equipment: 'Cable machine', difficulty: 'beginner', exerciseType: 'strength', gifUrl: '', defaultSets: 3, defaultReps: '12-15', defaultRestSeconds: 60 },
  { id: 'ex34', name: 'Skull Crusher', description: 'Tricep mass builder', instructions: ['Lie on bench','Lower bar to forehead','Extend arms','Keep elbows in'], primaryMuscle: 'Triceps', secondaryMuscles: [], equipment: 'Barbell', difficulty: 'intermediate', exerciseType: 'strength', gifUrl: '', defaultSets: 3, defaultReps: '10-12', defaultRestSeconds: 90 },
  { id: 'ex35', name: 'Overhead Tricep Extension', description: 'Long head tricep focus', instructions: ['Hold dumbbell overhead','Lower behind head','Extend up'], primaryMuscle: 'Triceps', secondaryMuscles: [], equipment: 'Dumbbell', difficulty: 'beginner', exerciseType: 'strength', gifUrl: '', defaultSets: 3, defaultReps: '12', defaultRestSeconds: 60 },
  { id: 'ex36', name: 'Dip', description: 'Tricep compound', instructions: ['Support on parallel bars','Lower until elbows at 90°','Push up'], primaryMuscle: 'Triceps', secondaryMuscles: ['Chest','Shoulders'], equipment: 'Dip bars', difficulty: 'intermediate', exerciseType: 'strength', gifUrl: '', defaultSets: 3, defaultReps: '10', defaultRestSeconds: 90 },
  // LEGS
  { id: 'ex40', name: 'Barbell Squat', description: 'King of leg exercises', instructions: ['Bar on upper back','Squat to parallel','Drive through heels','Stand tall'], primaryMuscle: 'Quads', secondaryMuscles: ['Glutes','Hamstrings','Core'], equipment: 'Barbell', difficulty: 'intermediate', exerciseType: 'strength', gifUrl: '', defaultSets: 4, defaultReps: '8-10', defaultRestSeconds: 180 },
  { id: 'ex41', name: 'Romanian Deadlift', description: 'Hamstring developer', instructions: ['Hold bar at hips','Hinge forward','Feel hamstring stretch','Return to start'], primaryMuscle: 'Hamstrings', secondaryMuscles: ['Glutes','Back'], equipment: 'Barbell', difficulty: 'intermediate', exerciseType: 'strength', gifUrl: '', defaultSets: 3, defaultReps: '10-12', defaultRestSeconds: 120 },
  { id: 'ex42', name: 'Leg Press', description: 'Quad and glute builder', instructions: ['Sit in machine','Place feet shoulder-width','Lower weight','Press up'], primaryMuscle: 'Quads', secondaryMuscles: ['Glutes'], equipment: 'Leg press machine', difficulty: 'beginner', exerciseType: 'strength', gifUrl: '', defaultSets: 3, defaultReps: '12-15', defaultRestSeconds: 120 },
  { id: 'ex43', name: 'Leg Curl', description: 'Hamstring isolation', instructions: ['Lie on machine','Curl weight up','Squeeze hamstrings','Lower slowly'], primaryMuscle: 'Hamstrings', secondaryMuscles: [], equipment: 'Leg press machine', difficulty: 'beginner', exerciseType: 'strength', gifUrl: '', defaultSets: 3, defaultReps: '12-15', defaultRestSeconds: 60 },
  { id: 'ex44', name: 'Leg Extension', description: 'Quad isolation', instructions: ['Sit in machine','Extend legs','Squeeze quads','Lower slowly'], primaryMuscle: 'Quads', secondaryMuscles: [], equipment: 'Leg press machine', difficulty: 'beginner', exerciseType: 'strength', gifUrl: '', defaultSets: 3, defaultReps: '15', defaultRestSeconds: 60 },
  { id: 'ex45', name: 'Hip Thrust', description: 'Glute builder', instructions: ['Back against bench','Bar on hips','Drive hips up','Squeeze glutes'], primaryMuscle: 'Glutes', secondaryMuscles: ['Hamstrings'], equipment: 'Barbell', difficulty: 'intermediate', exerciseType: 'strength', gifUrl: '', defaultSets: 3, defaultReps: '12', defaultRestSeconds: 90 },
  { id: 'ex46', name: 'Calf Raise', description: 'Calf builder', instructions: ['Stand on edge','Rise up on toes','Squeeze calves','Lower slowly'], primaryMuscle: 'Calves', secondaryMuscles: [], equipment: 'Bodyweight', difficulty: 'beginner', exerciseType: 'strength', gifUrl: '', defaultSets: 4, defaultReps: '15-20', defaultRestSeconds: 60 },
  { id: 'ex47', name: 'Goblet Squat', description: 'Beginner-friendly squat', instructions: ['Hold dumbbell at chest','Squat down','Keep chest up','Stand up'], primaryMuscle: 'Quads', secondaryMuscles: ['Glutes','Core'], equipment: 'Dumbbell', difficulty: 'beginner', exerciseType: 'strength', gifUrl: '', defaultSets: 3, defaultReps: '12', defaultRestSeconds: 90 },
  { id: 'ex48', name: 'Reverse Lunge', description: 'Unilateral leg work', instructions: ['Step back','Lower knee toward floor','Push back to start','Alternate legs'], primaryMuscle: 'Quads', secondaryMuscles: ['Glutes','Hamstrings'], equipment: 'Bodyweight', difficulty: 'beginner', exerciseType: 'strength', gifUrl: '', defaultSets: 3, defaultReps: '12 each', defaultRestSeconds: 90 },
  { id: 'ex49', name: 'Bodyweight Squat', description: 'Basic squat pattern', instructions: ['Stand feet shoulder-width','Squat to parallel','Drive through heels','Stand'], primaryMuscle: 'Quads', secondaryMuscles: ['Glutes'], equipment: 'Bodyweight', difficulty: 'beginner', exerciseType: 'strength', gifUrl: '', defaultSets: 4, defaultReps: '20', defaultRestSeconds: 60 },
  // CORE
  { id: 'ex50', name: 'Plank', description: 'Core stability', instructions: ['Forearms on floor','Body straight','Hold position','Breathe steadily'], primaryMuscle: 'Core', secondaryMuscles: ['Shoulders'], equipment: 'Bodyweight', difficulty: 'beginner', exerciseType: 'strength', gifUrl: '', defaultSets: 3, defaultReps: '30-60s', defaultRestSeconds: 60 },
  { id: 'ex51', name: 'Mountain Climber', description: 'Core and cardio', instructions: ['Start in push-up position','Drive knees to chest alternating','Keep hips level'], primaryMuscle: 'Core', secondaryMuscles: ['Shoulders'], equipment: 'Bodyweight', difficulty: 'beginner', exerciseType: 'cardio', gifUrl: '', defaultSets: 3, defaultReps: '20', defaultRestSeconds: 60 },
  { id: 'ex52', name: 'Glute Bridge', description: 'Glute activation', instructions: ['Lie on back','Feet flat on floor','Drive hips up','Squeeze glutes'], primaryMuscle: 'Glutes', secondaryMuscles: ['Hamstrings','Core'], equipment: 'Bodyweight', difficulty: 'beginner', exerciseType: 'strength', gifUrl: '', defaultSets: 3, defaultReps: '20', defaultRestSeconds: 60 },
  // EXPLOSIVE / ATHLETIC
  { id: 'ex60', name: 'Power Clean', description: 'Olympic lift for power', instructions: ['Start position like deadlift','Explode upward','Catch bar at shoulders','Stand'], primaryMuscle: 'Full Body', secondaryMuscles: ['Back','Shoulders','Quads'], equipment: 'Barbell', difficulty: 'advanced', exerciseType: 'plyometric', gifUrl: '', defaultSets: 4, defaultReps: '3', defaultRestSeconds: 180 },
  { id: 'ex61', name: 'Box Jump', description: 'Lower body power', instructions: ['Stand in front of box','Jump onto box','Land softly','Step down'], primaryMuscle: 'Quads', secondaryMuscles: ['Glutes','Calves'], equipment: 'Bodyweight', difficulty: 'intermediate', exerciseType: 'plyometric', gifUrl: '', defaultSets: 4, defaultReps: '5', defaultRestSeconds: 120 },
  { id: 'ex62', name: 'Burpee', description: 'Full body conditioning', instructions: ['Squat down','Jump feet back','Push up','Jump feet forward and jump up'], primaryMuscle: 'Full Body', secondaryMuscles: ['Chest','Core'], equipment: 'Bodyweight', difficulty: 'intermediate', exerciseType: 'cardio', gifUrl: '', defaultSets: 4, defaultReps: '10', defaultRestSeconds: 60 },
  { id: 'ex63', name: 'Jump Squat', description: 'Explosive leg power', instructions: ['Squat down','Explode upward','Land softly','Repeat'], primaryMuscle: 'Quads', secondaryMuscles: ['Glutes','Calves'], equipment: 'Bodyweight', difficulty: 'intermediate', exerciseType: 'plyometric', gifUrl: '', defaultSets: 4, defaultReps: '15', defaultRestSeconds: 90 },
  { id: 'ex64', name: 'Medicine Ball Slam', description: 'Power and core', instructions: ['Raise ball overhead','Slam to ground','Pick up','Repeat'], primaryMuscle: 'Core', secondaryMuscles: ['Shoulders','Back'], equipment: 'Bodyweight', difficulty: 'beginner', exerciseType: 'plyometric', gifUrl: '', defaultSets: 3, defaultReps: '15', defaultRestSeconds: 60 },
  { id: 'ex65', name: 'Kettlebell Swing', description: 'Hip hinge power', instructions: ['Hinge at hips','Swing kettlebell between legs','Drive hips forward','Swing to chest height'], primaryMuscle: 'Glutes', secondaryMuscles: ['Hamstrings','Core','Back'], equipment: 'Kettlebell', difficulty: 'intermediate', exerciseType: 'strength', gifUrl: '', defaultSets: 4, defaultReps: '15', defaultRestSeconds: 90 },
  // MORE EXERCISES
  { id: 'ex70', name: 'Incline Barbell Press', description: 'Upper chest press', instructions: ['Set bench to 30°','Press bar up from upper chest','Lower with control'], primaryMuscle: 'Chest', secondaryMuscles: ['Shoulders','Triceps'], equipment: 'Barbell', difficulty: 'intermediate', exerciseType: 'strength', gifUrl: '', defaultSets: 4, defaultReps: '8', defaultRestSeconds: 120 },
  { id: 'ex71', name: 'Pike Push Up', description: 'Bodyweight shoulder press', instructions: ['Hands on floor, hips high','Lower head toward floor','Push back up'], primaryMuscle: 'Shoulders', secondaryMuscles: ['Triceps','Chest'], equipment: 'Bodyweight', difficulty: 'intermediate', exerciseType: 'strength', gifUrl: '', defaultSets: 3, defaultReps: '12', defaultRestSeconds: 60 },
  { id: 'ex72', name: 'High Knees', description: 'Cardio conditioning', instructions: ['Run in place','Drive knees high','Pump arms','Keep pace'], primaryMuscle: 'Core', secondaryMuscles: ['Quads'], equipment: 'Bodyweight', difficulty: 'beginner', exerciseType: 'cardio', gifUrl: '', defaultSets: 4, defaultReps: '30s', defaultRestSeconds: 30 },
  { id: 'ex73', name: 'Shrug', description: 'Trap builder', instructions: ['Hold heavy dumbbells','Shrug shoulders up','Squeeze at top','Lower slowly'], primaryMuscle: 'Traps', secondaryMuscles: [], equipment: 'Dumbbell', difficulty: 'beginner', exerciseType: 'strength', gifUrl: '', defaultSets: 3, defaultReps: '15', defaultRestSeconds: 60 },
  { id: 'ex74', name: 'Dumbbell Bench Press', description: 'Chest with full range', instructions: ['Lie flat with dumbbells','Press up','Lower to sides of chest'], primaryMuscle: 'Chest', secondaryMuscles: ['Triceps','Shoulders'], equipment: 'Dumbbell', difficulty: 'beginner', exerciseType: 'strength', gifUrl: '', defaultSets: 3, defaultReps: '10', defaultRestSeconds: 90 },
  { id: 'ex75', name: 'Dumbbell Romanian Deadlift', description: 'Hamstring stretch focus', instructions: ['Hold dumbbells','Hinge at hips','Lower along legs','Stand up'], primaryMuscle: 'Hamstrings', secondaryMuscles: ['Glutes','Back'], equipment: 'Dumbbell', difficulty: 'beginner', exerciseType: 'strength', gifUrl: '', defaultSets: 3, defaultReps: '12', defaultRestSeconds: 90 },
  { id: 'ex76', name: 'Lateral Bound', description: 'Lateral power', instructions: ['Stand on one leg','Jump sideways','Land on opposite leg','Repeat'], primaryMuscle: 'Quads', secondaryMuscles: ['Glutes','Calves'], equipment: 'Bodyweight', difficulty: 'intermediate', exerciseType: 'plyometric', gifUrl: '', defaultSets: 3, defaultReps: '10 each', defaultRestSeconds: 90 },
  { id: 'ex77', name: 'Hang Snatch', description: 'Olympic lift variation', instructions: ['Bar at thigh level','Explosively pull overhead','Catch in squat','Stand'], primaryMuscle: 'Full Body', secondaryMuscles: ['Shoulders','Back'], equipment: 'Barbell', difficulty: 'advanced', exerciseType: 'plyometric', gifUrl: '', defaultSets: 3, defaultReps: '3', defaultRestSeconds: 180 },
  { id: 'ex78', name: 'Chest Press Machine', description: 'Machine chest press', instructions: ['Sit in machine','Press handles forward','Return with control'], primaryMuscle: 'Chest', secondaryMuscles: ['Triceps'], equipment: 'Chest press machine', difficulty: 'beginner', exerciseType: 'strength', gifUrl: '', defaultSets: 3, defaultReps: '12', defaultRestSeconds: 90 },
];

const STORAGE_KEY = 'apex_exercise_store';

export const useExerciseStore = create<ExerciseState>((set, get) => ({
  exercises: LOCAL_EXERCISES,
  savedWorkouts: [],
  isFetching: false,

  loadExercises: () => {
    // Use local database - no API call needed
    set({ exercises: LOCAL_EXERCISES });
  },

  saveWorkout: async (workout: SavedWorkout) => {
    const updated = [workout, ...useExerciseStore.getState().savedWorkouts.filter(w => w.id !== workout.id)];
    set({ savedWorkouts: updated });
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
      console.error('Error saving workout:', e);
    }
  },

  deleteWorkout: async (id: string) => {
    const updated = useExerciseStore.getState().savedWorkouts.filter((w) => w.id !== id);
    set({ savedWorkouts: updated });
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
      console.error('Error deleting workout:', e);
    }
  },

  loadSavedWorkouts: async () => {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEY);
      if (data) set({ savedWorkouts: JSON.parse(data) });
    } catch (e) {
      console.log('Error loading saved workouts:', e);
    }
  },

  resetStore: async () => {
    await AsyncStorage.removeItem(STORAGE_KEY);
    set({ savedWorkouts: [], exercises: LOCAL_EXERCISES });
  },
}));
