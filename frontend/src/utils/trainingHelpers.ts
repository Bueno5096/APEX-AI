// ─── Split Day Helper ───────────────────────────────
// Determines today's muscle groups based on training split and training days
import { useMuscleStore } from '../store/muscleStore';

export interface SplitDayInfo {
  dayName: string;
  targetMuscles: string[];
  isTrainingDay: boolean;
  isRestDay: boolean;
  splitDayLabel: string;
}

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export function getTodaySplitDay(
  trainingSplit: string | undefined,
  trainingDays: string[] | undefined,
  trainingFrequency: number | undefined
): SplitDayInfo {
  const today = DAY_NAMES[new Date().getDay()];
  const days = trainingDays || ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

  // Check if today is a training day
  const isTrainingDay = days.includes(today);

  if (!isTrainingDay) {
    return {
      dayName: today,
      targetMuscles: [],
      isTrainingDay: false,
      isRestDay: true,
      splitDayLabel: 'Rest Day',
    };
  }

  // Find the training day index (e.g., 0 = first training day of the week, 1 = second...)
  const trainingDayIndex = days.indexOf(today);

  switch (trainingSplit) {
    case 'full_body':
      return { dayName: today, targetMuscles: ['Chest', 'Back', 'Shoulders', 'Quads', 'Hamstrings', 'Core'], isTrainingDay: true, isRestDay: false, splitDayLabel: 'Full Body' };

    case 'upper_lower': {
      const isUpper = trainingDayIndex % 2 === 0;
      return {
        dayName: today,
        targetMuscles: isUpper ? ['Chest', 'Back', 'Shoulders', 'Biceps', 'Triceps'] : ['Quads', 'Hamstrings', 'Glutes', 'Calves'],
        isTrainingDay: true, isRestDay: false,
        splitDayLabel: isUpper ? 'Upper Body' : 'Lower Body',
      };
    }

    case 'push_pull_legs': {
      const cycle = trainingDayIndex % 3;
      if (cycle === 0) return { dayName: today, targetMuscles: ['Chest', 'Shoulders', 'Triceps'], isTrainingDay: true, isRestDay: false, splitDayLabel: 'Push Day' };
      if (cycle === 1) return { dayName: today, targetMuscles: ['Back', 'Biceps'], isTrainingDay: true, isRestDay: false, splitDayLabel: 'Pull Day' };
      return { dayName: today, targetMuscles: ['Quads', 'Hamstrings', 'Glutes', 'Calves'], isTrainingDay: true, isRestDay: false, splitDayLabel: 'Legs Day' };
    }

    case 'bro_split': {
      const broOrder = ['Chest', 'Back', 'Shoulders', 'Biceps', 'Quads'];
      const broLabels = ['Chest Day', 'Back Day', 'Shoulder Day', 'Arms Day', 'Leg Day'];
      const broMuscles = [['Chest', 'Triceps'], ['Back', 'Biceps'], ['Shoulders'], ['Biceps', 'Triceps'], ['Quads', 'Hamstrings', 'Glutes', 'Calves']];
      const idx = trainingDayIndex % 5;
      return { dayName: today, targetMuscles: broMuscles[idx], isTrainingDay: true, isRestDay: false, splitDayLabel: broLabels[idx] };
    }

    case 'arnold_split': {
      const arnoldCycle = trainingDayIndex % 3;
      if (arnoldCycle === 0) return { dayName: today, targetMuscles: ['Chest', 'Back'], isTrainingDay: true, isRestDay: false, splitDayLabel: 'Chest + Back' };
      if (arnoldCycle === 1) return { dayName: today, targetMuscles: ['Shoulders', 'Biceps', 'Triceps'], isTrainingDay: true, isRestDay: false, splitDayLabel: 'Shoulders + Arms' };
      return { dayName: today, targetMuscles: ['Quads', 'Hamstrings', 'Glutes', 'Calves'], isTrainingDay: true, isRestDay: false, splitDayLabel: 'Legs' };
    }

    case 'athletic': {
      const athCycle = trainingDayIndex % 3;
      if (athCycle === 0) return { dayName: today, targetMuscles: ['Full Body', 'Core'], isTrainingDay: true, isRestDay: false, splitDayLabel: 'Power Day' };
      if (athCycle === 1) return { dayName: today, targetMuscles: ['Chest', 'Back', 'Quads'], isTrainingDay: true, isRestDay: false, splitDayLabel: 'Strength Day' };
      return { dayName: today, targetMuscles: ['Full Body', 'Core'], isTrainingDay: true, isRestDay: false, splitDayLabel: 'Conditioning Day' };
    }

    case 'bodyweight_only': {
      const bwCycle = trainingDayIndex % 3;
      if (bwCycle === 0) return { dayName: today, targetMuscles: ['Chest', 'Shoulders', 'Triceps'], isTrainingDay: true, isRestDay: false, splitDayLabel: 'Push (Bodyweight)' };
      if (bwCycle === 1) return { dayName: today, targetMuscles: ['Back', 'Biceps'], isTrainingDay: true, isRestDay: false, splitDayLabel: 'Pull (Bodyweight)' };
      return { dayName: today, targetMuscles: ['Quads', 'Hamstrings', 'Glutes', 'Core'], isTrainingDay: true, isRestDay: false, splitDayLabel: 'Legs (Bodyweight)' };
    }

    case 'fresh_muscle': {
      // Select the 2 muscle groups with highest readiness from the muscle store
      const muscleState = useMuscleStore.getState();
      const muscleGroups = [
        { label: 'Push', muscles: ['Chest', 'Shoulders', 'Triceps'], ids: ['chest', 'shoulders', 'triceps_left', 'triceps_right'] },
        { label: 'Pull', muscles: ['Back', 'Biceps'], ids: ['back', 'biceps_left', 'biceps_right', 'traps'] },
        { label: 'Legs', muscles: ['Quads', 'Hamstrings', 'Glutes', 'Calves'], ids: ['quads', 'hamstrings', 'glutes', 'calves'] },
        { label: 'Core', muscles: ['Core'], ids: ['core'] },
      ];
      const scored = muscleGroups.map((g) => ({
        ...g,
        readiness: g.ids.reduce((sum: number, id: string) => sum + muscleState.getMuscleReadiness(id), 0) / g.ids.length,
      }));
      scored.sort((a, b) => b.readiness - a.readiness);
      const top2 = scored.slice(0, 2);
      const targetMuscles: string[] = ([] as string[]).concat(...top2.map((g) => g.muscles));
      const dayLabel = top2.map((g) => g.label).join(' + ');
      return { dayName: today, targetMuscles, isTrainingDay: true, isRestDay: false, splitDayLabel: `${dayLabel} (Readiness)` };
    }

    default:
      return { dayName: today, targetMuscles: ['Full Body'], isTrainingDay: true, isRestDay: false, splitDayLabel: 'Training Day' };
  }
}

// Get time-of-day greeting
export function getGreeting(name?: string): string {
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  return name ? `${greeting}, ${name}` : greeting;
}

// Frequency to compatible splits mapping
export const FREQUENCY_SPLIT_COMPAT: Record<number, string[]> = {
  2: ['full_body'],
  3: ['full_body', 'push_pull_legs', 'bodyweight_only'],
  4: ['upper_lower', 'push_pull_legs', 'full_body'],
  5: ['bro_split', 'push_pull_legs', 'upper_lower', 'fresh_muscle', 'athletic'],
  6: ['arnold_split', 'push_pull_legs', 'bro_split'],
  7: ['arnold_split', 'push_pull_legs'],
};

// Training style to template category compatibility
export const STYLE_TEMPLATE_COMPAT: Record<string, { match: string[]; conflict: string[] }> = {
  bodybuilding: { match: ['Push', 'Pull', 'Legs', 'Upper', 'Dumbbell'], conflict: ['Bodyweight', 'HIIT'] },
  powerlifting: { match: ['Strength', 'Push', 'Pull', 'Legs'], conflict: ['Bodyweight', 'HIIT'] },
  calisthenics: { match: ['Bodyweight'], conflict: ['Strength', 'Push', 'Pull', 'Legs', 'Upper', 'Dumbbell'] },
  yoga: { match: [], conflict: ['Strength', 'Push', 'Pull', 'Legs', 'HIIT'] },
  pilates: { match: [], conflict: ['Strength', 'Push', 'Pull', 'HIIT'] },
  sport_specific: { match: ['HIIT', 'Full Body'], conflict: [] },
  crossfit: { match: ['HIIT', 'Full Body'], conflict: [] },
  hybrid: { match: ['Push', 'Pull', 'Legs', 'Full Body', 'HIIT', 'Strength'], conflict: [] },
};

// Body composition metric info descriptions for FIX 4
export const METRIC_INFO: Record<string, { title: string; description: string; ranges?: string; whyItMatters?: string; howToUse?: string; scale?: string; note?: string }> = {
  bodyFat: {
    title: 'What is Body Fat %?',
    description: 'Body fat percentage is how much of your total body weight is fat. It is calculated using the U.S. Navy method which measures specific body circumferences for a much more accurate result than traditional BMI. Lower is generally better for performance but going too low has health risks.',
    ranges: 'Healthy ranges: Men 6-24% / Women 14-31%',
  },
  leanBMI: {
    title: 'What is Lean BMI?',
    description: 'Traditional BMI is notoriously inaccurate for people who exercise because it cannot tell the difference between fat and muscle. Lean BMI fixes this by calculating BMI using only your lean body mass — the muscle, bone, and organ weight — excluding fat entirely. This gives a far more accurate picture of your true body composition.',
    whyItMatters: 'A muscular athlete might have a traditional BMI of 28 which incorrectly labels them overweight. Their Lean BMI of 21 correctly shows they are in the healthy range.',
  },
  ffmi: {
    title: 'What is FFMI?',
    description: 'FFMI measures how muscular you are relative to your height. It is the gold standard metric for tracking muscle building progress over time. Unlike the scale or BMI, FFMI only goes up when you actually build muscle.',
    scale: '17-18 is average. 20-22 is excellent for a natural athlete. 22-23 is superior. Above 26 is considered to exceed what is typically achievable naturally.',
    whyItMatters: 'Track this number over months — if it is going up you are building real muscle regardless of what the scale says.',
  },
  tdee: {
    title: 'What is TDEE?',
    description: 'TDEE is the total number of calories your body burns in a day including exercise. It is calculated from your basal metabolic rate (the calories you burn just existing) multiplied by your activity level.',
    howToUse: 'Use this as a reference point. APEX uses this to understand your energy demands and structure your training accordingly. Note: APEX is a training app — nutrition planning is outside our scope.',
  },
  idealWeight: {
    title: 'What is Ideal Weight Range?',
    description: 'This is the weight range where your body tends to perform best based on your height, frame size, and muscle mass. Unlike traditional ideal weight charts this range is adjusted upward for people with higher muscle mass so athletes are never told they are overweight.',
    note: 'This is a general guideline. How you feel and perform matters more than a number on the scale.',
  },
  muscleToFat: {
    title: 'What is Muscle to Fat Ratio?',
    description: 'This ratio compares your lean muscle mass to your fat mass. A ratio of 3:1 means you have 3 times more lean mass than fat mass. Higher ratios indicate better body composition regardless of total body weight.',
    ranges: 'Below 2:1 needs improvement. 2-3:1 is good. 3-4:1 is athletic. Above 4:1 is elite.',
  },
  compositionBar: {
    title: 'What does this bar show?',
    description: 'This bar visually splits your total body weight into lean mass (muscle, bone, organs, water) on the left and fat mass on the right. The goal over time is to see the lean mass side grow larger as you build muscle and reduce body fat through training.',
  },
};
