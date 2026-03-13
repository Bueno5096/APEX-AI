import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type ActivityLevel = 'sedentary' | 'lightly_active' | 'moderately_active' | 'very_active' | 'athlete';
export type UnitType = 'imperial' | 'metric';

export interface Measurements {
  weight: number; // kg internally
  height: number; // cm internally
  age: number;
  gender: string;
  neck: number; // cm
  waist: number; // cm
  hip: number; // cm (women only)
  activityLevel: ActivityLevel;
  unit: UnitType;
}

export interface BodyCompResults {
  bodyFatPercent: number;
  leanMassKg: number;
  fatMassKg: number;
  bmi: number;
  ffmi: number;
  normalizedFFMI: number;
  tdee: number;
  bmr: number;
  idealWeightMinKg: number;
  idealWeightMaxKg: number;
  muscleToFatRatio: number;
}

export interface HistoryEntry {
  date: string; // ISO
  measurements: Measurements;
  results: BodyCompResults;
}

interface BodyCompState {
  measurements: Measurements;
  results: BodyCompResults | null;
  history: HistoryEntry[];
  lastUpdated: string | null;
  hasCalculated: boolean;
  setMeasurements: (m: Partial<Measurements>) => void;
  setResults: (r: BodyCompResults) => void;
  saveEntry: () => Promise<void>;
  loadData: () => Promise<void>;
}

const STORAGE_KEY = 'apex_body_composition';

const defaultMeasurements: Measurements = {
  weight: 75,
  height: 178,
  age: 28,
  gender: 'male',
  neck: 38,
  waist: 85,
  hip: 95,
  activityLevel: 'moderately_active',
  unit: 'metric',
};

// US Navy body fat formula
export const calcBodyFat = (m: Measurements): number => {
  const { waist, neck, height, hip, gender } = m;
  if (waist <= 0 || neck <= 0 || height <= 0) return 0;
  if (gender === 'female') {
    if (hip <= 0) return 0;
    const bf = 163.205 * Math.log10(waist + hip - neck) - 97.684 * Math.log10(height) - 78.387;
    return Math.max(Math.min(Math.round(bf * 10) / 10, 50), 3);
  }
  const bf = 86.010 * Math.log10(waist - neck) - 70.041 * Math.log10(height) + 36.76;
  return Math.max(Math.min(Math.round(bf * 10) / 10, 50), 3);
};

export const calcBMR = (weight: number, height: number, age: number, gender: string): number => {
  if (gender === 'female') return Math.round((10 * weight) + (6.25 * height) - (5 * age) - 161);
  return Math.round((10 * weight) + (6.25 * height) - (5 * age) + 5);
};

const ACTIVITY_MULTIPLIERS: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  lightly_active: 1.375,
  moderately_active: 1.55,
  very_active: 1.725,
  athlete: 1.9,
};

export const calcTDEE = (bmr: number, activity: ActivityLevel): number => {
  return Math.round(bmr * ACTIVITY_MULTIPLIERS[activity]);
};

export const calcIdealWeight = (heightCm: number, gender: string, ffmi: number): { min: number; max: number } => {
  const heightIn = heightCm / 2.54;
  const overFiveFeet = Math.max(heightIn - 60, 0);
  let base: number;
  if (gender === 'female') {
    base = 45.5 + 2.2 * overFiveFeet;
  } else {
    base = 48 + 2.7 * overFiveFeet;
  }
  let shift = ffmi > 20 ? 0.05 : 0;
  return {
    min: Math.round(base * (0.9 + shift)),
    max: Math.round(base * (1.1 + shift)),
  };
};

export const calcAllResults = (m: Measurements): BodyCompResults => {
  const bf = calcBodyFat(m);
  const leanMassKg = Math.round(m.weight * (1 - bf / 100) * 10) / 10;
  const fatMassKg = Math.round(m.weight * (bf / 100) * 10) / 10;
  const heightM = m.height / 100;
  const bmi = Math.round((m.weight / (heightM * heightM)) * 10) / 10;
  const ffmi = Math.round((leanMassKg / (heightM * heightM)) * 10) / 10;
  const normalizedFFMI = Math.round((ffmi + 6.1 * (1.8 - heightM)) * 10) / 10;
  const bmr = calcBMR(m.weight, m.height, m.age, m.gender);
  const tdee = calcTDEE(bmr, m.activityLevel);
  const ideal = calcIdealWeight(m.height, m.gender, ffmi);
  const ratio = bf > 0 ? Math.round(((100 - bf) / bf) * 10) / 10 : 0;

  return {
    bodyFatPercent: bf,
    leanMassKg,
    fatMassKg,
    bmi,
    ffmi,
    normalizedFFMI,
    tdee,
    bmr,
    idealWeightMinKg: ideal.min,
    idealWeightMaxKg: ideal.max,
    muscleToFatRatio: ratio,
  };
};

// Unit conversions
export const kgToLbs = (kg: number) => Math.round(kg * 2.2046 * 10) / 10;
export const lbsToKg = (lbs: number) => Math.round(lbs / 2.2046 * 10) / 10;
export const cmToIn = (cm: number) => Math.round(cm / 2.54 * 10) / 10;
export const inToCm = (inches: number) => Math.round(inches * 2.54 * 10) / 10;

export const useBodyCompStore = create<BodyCompState>((set, get) => ({
  measurements: { ...defaultMeasurements },
  results: null,
  history: [],
  lastUpdated: null,
  hasCalculated: false,

  setMeasurements: (m) => {
    set((state) => ({
      measurements: { ...state.measurements, ...m },
    }));
  },

  setResults: (r) => {
    set({ results: r, hasCalculated: true });
  },

  saveEntry: async () => {
    const { measurements, results, history } = get();
    if (!results) return;
    const entry: HistoryEntry = {
      date: new Date().toISOString(),
      measurements: { ...measurements },
      results: { ...results },
    };
    const newHistory = [entry, ...history].slice(0, 20);
    const lastUpdated = new Date().toISOString();
    set({ history: newHistory, lastUpdated });
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({
        measurements,
        results,
        history: newHistory,
        lastUpdated,
      }));
    } catch (e) {
      console.log('Error saving body comp:', e);
    }
  },

  loadData: async () => {
    try {
      const saved = await AsyncStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        set({
          measurements: parsed.measurements || defaultMeasurements,
          results: parsed.results || null,
          history: parsed.history || [],
          lastUpdated: parsed.lastUpdated || null,
          hasCalculated: !!parsed.results,
        });
      }
    } catch (e) {
      console.log('Error loading body comp:', e);
    }
  },
}));
