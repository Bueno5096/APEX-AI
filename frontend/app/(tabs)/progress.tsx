import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  ActivityIndicator,
  Modal,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useThemeStore } from '../../src/store/themeStore';
import { useWorkoutStore } from '../../src/store/workoutStore';
import { useHealthStore } from '../../src/store/healthStore';
import { useUserStore } from '../../src/store/userStore';
import { useGoalStore } from '../../src/store/goalStore';
import { MetallicCard } from '../../src/components/MetallicCard';
import Constants from 'expo-constants';

// ─── Types ──────────────────────────────────────────────
type TimePeriod = '7d' | '15d' | '30d' | 'all';
type SectionId = 'strength' | 'calendar' | 'records' | 'analysis';

interface Section {
  key: SectionId;
  label: string;
}

interface MuscleGain {
  muscle: string;
  exercise: string;
  gainPercent: number;
  earliestWeight: number;
  latestWeight: number;
}

interface PersonalRecord {
  exercise: string;
  weight: number;
  date: Date;
}

// ─── Muscle → Exercise mapping ──────────────────────────
const MUSCLE_EXERCISE_MAP: { [muscle: string]: string[] } = {
  'Chest': ['Bench Press', 'Chest Fly', 'Push Ups', 'Push-ups'],
  'Back': ['Deadlift', 'Barbell Row', 'Rows', 'Pull Ups', 'Pull-ups', 'Lat Pulldown'],
  'Shoulders': ['Overhead Press', 'Lateral Raise'],
  'Biceps': ['Bicep Curl', 'Hammer Curl'],
  'Triceps': ['Tricep Pushdown', 'Skull Crusher', 'Dips'],
  'Quads': ['Barbell Squat', 'Squat', 'Leg Press', 'Lunges'],
  'Hamstrings': ['Romanian Deadlift', 'Leg Curl'],
  'Glutes': ['Hip Thrust', 'Glute Bridge'],
  'Calves': ['Calf Raise'],
  'Core': ['Plank', 'Crunches', 'Ab Crunch', 'Cable Crunch'],
  'Traps': ['Shrugs', 'Face Pull'],
};

const DEFAULT_SECTION_ORDER: SectionId[] = ['strength', 'calendar', 'records', 'analysis'];
const SECTION_ORDER_KEY = 'apex_progress_section_order';

// ─── Helper: get backend URL ────────────────────────────
const getBackendUrl = () => {
  const extra = Constants.expoConfig?.extra;
  if (extra?.EXPO_BACKEND_URL) return extra.EXPO_BACKEND_URL;
  return '';
};

// ─── Animated Counter ───────────────────────────────────
const CountUp = ({ target, suffix = '', prefix = '', color, duration = 900 }: {
  target: number; suffix?: string; prefix?: string; color: string; duration?: number;
}) => {
  const anim = useRef(new Animated.Value(0)).current;
  const [val, setVal] = useState(0);

  useEffect(() => {
    anim.setValue(0);
    setVal(0);
    Animated.timing(anim, { toValue: target, duration, useNativeDriver: false }).start();
    const id = anim.addListener(({ value }) => setVal(Math.round(value)));
    return () => anim.removeListener(id);
  }, [target]);

  return (
    <Text style={[styles.statValue, { color }]}>
      {prefix}{val}{suffix}
    </Text>
  );
};

// ─── Animated Bar ───────────────────────────────────────
const AnimatedBar = ({ percent, color, delay, mutedColor }: {
  percent: number; color: string; delay: number; mutedColor: string;
}) => {
  const width = useRef(new Animated.Value(0)).current;
  const clamped = Math.min(Math.max(percent, 0), 100);

  useEffect(() => {
    width.setValue(0);
    const timer = setTimeout(() => {
      Animated.timing(width, { toValue: clamped, duration: 700, useNativeDriver: false }).start();
    }, delay);
    return () => clearTimeout(timer);
  }, [clamped, delay]);

  return (
    <View style={[styles.barTrack, { backgroundColor: mutedColor + '20' }]}>
      <Animated.View style={[styles.barFill, {
        backgroundColor: color,
        width: width.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] }),
      }]} />
    </View>
  );
};

// ─── Section Header with drag handle ────────────────────
const SectionHeader = ({ title, subtitle, drag, isActive, theme, accentColor }: {
  title: string; subtitle?: string; drag: () => void; isActive: boolean;
  theme: any; accentColor: string;
}) => (
  <View style={[styles.sectionHeaderRow, isActive && { opacity: 0.9 }]}>
    <View style={styles.sectionHeaderText}>
      <Text style={[styles.sectionTitle, { color: theme.colors.textMuted }]}>{title}</Text>
      {subtitle && <Text style={[styles.sectionSubtitle, { color: theme.colors.textMuted }]}>{subtitle}</Text>}
    </View>
    <TouchableOpacity onLongPress={drag} delayLongPress={150} style={[styles.dragHandle, { backgroundColor: theme.colors.cardSecondary }]} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
      <Ionicons name="reorder-three" size={20} color={isActive ? accentColor : theme.colors.textMuted} />
    </TouchableOpacity>
  </View>
);

// ─── Goal Progress Card ─────────────────────────────────
const GoalProgressCard = ({ goal, accentColor, theme }: { goal: any; accentColor: string; theme: any }) => {
  const progress = goal.startingValue !== goal.targetValue
    ? Math.round(Math.abs((goal.currentValue - goal.startingValue) / (goal.targetValue - goal.startingValue)) * 100)
    : 0;
  const clampedProgress = Math.min(Math.max(progress, 0), 100);
  const weeksElapsed = Math.round((Date.now() - new Date(goal.startDate).getTime()) / (7 * 24 * 60 * 60 * 1000));
  const weeksRemaining = Math.max(goal.timeframeWeeks - weeksElapsed, 0);
  const expectedProgress = goal.timeframeWeeks > 0 ? Math.round((weeksElapsed / goal.timeframeWeeks) * 100) : 0;
  const status = clampedProgress >= expectedProgress + 10 ? 'Ahead of Schedule' : clampedProgress >= expectedProgress - 10 ? 'On Track' : 'Behind';
  const statusColor = status === 'Ahead of Schedule' ? '#4CAF50' : status === 'On Track' ? accentColor : '#F44336';
  const goalLabel = goal.type === 'reduce_bodyfat' ? `Reduce body fat from ${goal.startingValue}% to ${goal.targetValue}%` :
    goal.type === 'build_muscle' ? `Build muscle mass to ${goal.targetValue} FFMI` :
    `Increase training to ${goal.targetValue} days/week`;

  return (
    <MetallicCard style={styles.goalProgressCard} intensity="medium">
      <Text style={[styles.goalProgressLabel, { color: theme.colors.textMuted }]}>SECONDARY GOAL</Text>
      <Text style={[styles.goalProgressDesc, { color: theme.colors.textPrimary }]}>{goalLabel}</Text>
      <View style={[styles.goalProgressBar, { backgroundColor: theme.colors.cardSecondary }]}>
        <View style={[styles.goalProgressFill, { width: `${clampedProgress}%`, backgroundColor: accentColor }]} />
      </View>
      <View style={styles.goalProgressValues}>
        <Text style={[styles.goalProgressVal, { color: theme.colors.textMuted }]}>{goal.startingValue}</Text>
        <Text style={[styles.goalProgressValBold, { color: theme.colors.textPrimary }]}>{goal.currentValue}</Text>
        <Text style={[styles.goalProgressVal, { color: theme.colors.textMuted }]}>{goal.targetValue}</Text>
      </View>
      <View style={styles.goalProgressFooter}>
        <Text style={[styles.goalProgressWeeks, { color: theme.colors.textMuted }]}>{weeksRemaining} weeks remaining</Text>
        <View style={[styles.goalStatusBadge, { backgroundColor: statusColor + '20' }]}>
          <Text style={[styles.goalStatusText, { color: statusColor }]}>{status}</Text>
        </View>
      </View>
    </MetallicCard>
  );
};

// ─── Main Component ─────────────────────────────────────
export default function ProgressScreen() {
  const { theme, accentColor, unitSystem } = useThemeStore();
  const { workoutHistory } = useWorkoutStore();
  const { recoveryData } = useHealthStore();
  const { profile, setPendingCoachMessage } = useUserStore();
  const { hasActiveGoalLayeringPlan, secondaryGoal } = useGoalStore();
  const router = useRouter();

  const [timePeriod, setTimePeriod] = useState<TimePeriod>('30d');
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [animKey, setAnimKey] = useState(0);
  const timePeriods: TimePeriod[] = ['7d', '15d', '30d', 'all'];
  const [sections, setSections] = useState<Section[]>(
    DEFAULT_SECTION_ORDER.map(id => ({ key: id, label: id }))
  );

  const isDark = theme.name === 'dark';

  // Calendar state
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<string | null>(null);

  // Load saved section order
  useEffect(() => {
    const loadOrder = async () => {
      try {
        const saved = await AsyncStorage.getItem(SECTION_ORDER_KEY);
        if (saved) {
          const order: SectionId[] = JSON.parse(saved);
          setSections(order.map(id => ({ key: id, label: id })));
        }
      } catch (e) {
        console.log('Error loading section order:', e);
      }
    };
    loadOrder();
  }, []);

  // Save section order
  const saveSectionOrder = useCallback(async (newSections: Section[]) => {
    try {
      const order = newSections.map(s => s.key);
      await AsyncStorage.setItem(SECTION_ORDER_KEY, JSON.stringify(order));
    } catch (e) {
      console.log('Error saving section order:', e);
    }
  }, []);

  // ─── Filter workouts by time period ─────────────────
  const filteredWorkouts = useMemo(() => {
    const now = Date.now();
    const DAY = 24 * 60 * 60 * 1000;
    let cutoff = 0;
    switch (timePeriod) {
      case '7d': cutoff = now - 7 * DAY; break;
      case '15d': cutoff = now - 15 * DAY; break;
      case '30d': cutoff = now - 30 * DAY; break;
      case 'all': cutoff = 0; break;
    }
    return workoutHistory.filter(w => {
      const wDate = w.date ? new Date(w.date).getTime() : 0;
      return wDate >= cutoff;
    });
  }, [workoutHistory, timePeriod]);

  // ─── Calculate muscle group strength gains ──────────
  const muscleGains = useMemo((): MuscleGain[] => {
    const gains: MuscleGain[] = [];
    for (const [muscle, exercises] of Object.entries(MUSCLE_EXERCISE_MAP)) {
      let bestGain: MuscleGain | null = null;
      for (const exerciseName of exercises) {
        const instances: { weight: number; date: number }[] = [];
        filteredWorkouts.forEach(w => {
          const wDate = w.date ? new Date(w.date).getTime() : 0;
          w.exercises.forEach(ex => {
            if (ex.name.toLowerCase() === exerciseName.toLowerCase() && ex.weight && ex.weight > 0) {
              instances.push({ weight: ex.weight, date: wDate });
            }
          });
        });
        if (instances.length >= 2) {
          instances.sort((a, b) => a.date - b.date);
          const earliest = instances[0].weight;
          const latest = instances[instances.length - 1].weight;
          const gainPercent = ((latest - earliest) / earliest) * 100;
          if (!bestGain || gainPercent > bestGain.gainPercent) {
            bestGain = { muscle, exercise: exerciseName, gainPercent: Math.round(gainPercent * 10) / 10, earliestWeight: earliest, latestWeight: latest };
          }
        } else if (instances.length === 1 && !bestGain) {
          bestGain = { muscle, exercise: exerciseName, gainPercent: 0, earliestWeight: instances[0].weight, latestWeight: instances[0].weight };
        }
      }
      if (bestGain) gains.push(bestGain);
    }
    gains.sort((a, b) => b.gainPercent - a.gainPercent);
    return gains;
  }, [filteredWorkouts]);

  // ─── Personal records (all-time) ────────────────────
  const personalRecords = useMemo((): PersonalRecord[] => {
    const prMap: { [exercise: string]: PersonalRecord } = {};
    workoutHistory.forEach(w => {
      const wDate = w.date ? new Date(w.date) : new Date();
      w.exercises.forEach(ex => {
        if (ex.weight && ex.weight > 0) {
          if (!prMap[ex.name] || ex.weight > prMap[ex.name].weight) {
            prMap[ex.name] = { exercise: ex.name, weight: ex.weight, date: wDate };
          }
        }
      });
    });
    return Object.values(prMap).sort((a, b) => b.weight - a.weight).slice(0, 5);
  }, [workoutHistory]);

  // ─── Stats ──────────────────────────────────────────
  const stats = useMemo(() => {
    const totalWorkouts = filteredWorkouts.length;
    const overallGain = muscleGains.length > 0
      ? Math.round(muscleGains.reduce((sum, g) => sum + g.gainPercent, 0) / muscleGains.length * 10) / 10
      : 0;
    const avgRecovery = recoveryData?.score || 0;
    let streak = 0;
    const DAY = 24 * 60 * 60 * 1000;
    const today = new Date(); today.setHours(0, 0, 0, 0);
    for (let d = 0; d < 60; d++) {
      const checkDate = new Date(today.getTime() - d * DAY);
      const dateStr = checkDate.toDateString();
      const hasWorkout = workoutHistory.some(w => w.date && new Date(w.date).toDateString() === dateStr);
      if (hasWorkout) streak++;
      else if (d > 0) break;
    }
    return { totalWorkouts, overallGain, avgRecovery, streak };
  }, [filteredWorkouts, muscleGains, recoveryData, workoutHistory]);

  // ─── AI Analysis ────────────────────────────────────
  const [aiRetryCount, setAiRetryCount] = useState(0);

  const fetchAiAnalysis = useCallback(async (retryAttempt: number = 0) => {
    setAiLoading(true);
    if (retryAttempt === 0) setAiAnalysis(null);
    const periodLabel = timePeriod === '7d' ? '7 days' : timePeriod === '15d' ? '15 days' : timePeriod === '30d' ? '30 days' : 'all time';
    const gainsSummary = muscleGains.map(g => `${g.muscle}: ${g.gainPercent > 0 ? '+' : ''}${g.gainPercent}% (${g.exercise})`).join(', ');
    const goals = profile?.fitnessGoals?.join(', ') || 'general fitness';
    const recoverySummary = recoveryData?.muscles?.map(m => `${m.name}: ${m.readiness}%`).join(', ') || 'No recovery data';
    const message = `Analyze my progress data for the last ${periodLabel}. Give me exactly 4 bullet point insights (use bullet characters). Here is my data:
Muscle strength gains ranked: ${gainsSummary || 'No data yet'}
Total workouts: ${stats.totalWorkouts || 0}
Average recovery score: ${stats.avgRecovery || 0}%
Current streak: ${stats.streak || 0} days
Fitness goals: ${goals}
Muscle readiness: ${recoverySummary}
Tell me: 1) Which muscle improved most, 2) Which muscle is most undertrained or lagging, 3) Whether I'm overtrained in any area, 4) One specific actionable recommendation. Keep each point to 1-2 sentences. Do NOT include any action blocks.`;
    try {
      const backendUrl = getBackendUrl();
      const url = backendUrl ? `${backendUrl}/api/coach/chat` : '/api/coach/chat';
      console.log(`[APEX] Fetching analysis from: ${url} (attempt ${retryAttempt + 1})`);
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, context: { coachStyle: 'analytical' } }),
      });
      if (!response.ok) {
        const errText = await response.text().catch(() => '');
        throw new Error(`HTTP ${response.status}: ${errText.slice(0, 200)}`);
      }
      const data = await response.json();
      setAiAnalysis(data.response || 'Unable to generate analysis.');
      setAiRetryCount(0);
      setAiLoading(false);
    } catch (e: any) {
      console.log(`[APEX] Error (attempt ${retryAttempt + 1}):`, e?.message || e);
      if (retryAttempt < 2) {
        setTimeout(() => fetchAiAnalysis(retryAttempt + 1), 2000 * (retryAttempt + 1));
        return;
      }
      // Final failure
      let errorMsg: string;
      if (e?.message?.includes('401') || e?.message?.includes('403')) {
        errorMsg = 'Coach AI is not configured. Please add your API key in settings.';
      } else if (e?.message?.includes('NetworkError') || e?.message?.includes('Failed to fetch')) {
        errorMsg = 'No internet connection. Please check your connection and try again.';
      } else {
        errorMsg = `APEX AI connection error: ${e?.message || 'Unknown error'}. Tap Retry to try again.`;
      }
      setAiAnalysis(errorMsg);
      setAiRetryCount(retryAttempt + 1);
      setAiLoading(false);
    }
  }, [timePeriod, muscleGains, stats, profile, recoveryData]);

  useEffect(() => {
    if (muscleGains.length > 0) fetchAiAnalysis();
  }, [timePeriod]);

  useEffect(() => {
    setAnimKey(prev => prev + 1);
  }, [timePeriod]);

  // ─── Deep Dive ──────────────────────────────────────
  const handleDeepDive = () => {
    const periodLabel = timePeriod === '7d' ? '7' : timePeriod === '15d' ? '15' : timePeriod === '30d' ? '30' : 'all';
    const goal = profile?.fitnessGoals?.[0] || 'improve my fitness';
    setPendingCoachMessage(`Give me a full analysis of my progress over the last ${periodLabel} days. Tell me exactly what I need to focus on to reach my goal of "${goal}".`);
    router.push('/(tabs)/coach');
  };

  const formatDate = (date: Date) => {
    const d = new Date(date);
    const now = new Date();
    const diff = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
    if (diff === 0) return 'Today';
    if (diff === 1) return 'Yesterday';
    if (diff < 7) return `${diff} days ago`;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const hasData = workoutHistory.length > 0;
  const maxGain = muscleGains.length > 0 ? Math.max(...muscleGains.map(g => Math.abs(g.gainPercent)), 1) : 1;

  // ─── Section Renderers ──────────────────────────────
  const renderStrengthSection = (drag: () => void, isActive: boolean) => (
    <View style={styles.sectionContainer}>
      <SectionHeader title="STRENGTH GAINS" subtitle="Ranked most to least improved" drag={drag} isActive={isActive} theme={theme} accentColor={accentColor} />
      {muscleGains.length === 0 ? (
        <Text style={[styles.noDataText, { color: theme.colors.textMuted }]}>No data yet</Text>
      ) : (
        <View key={`gains-${animKey}`}>
          {muscleGains.map((gain, index) => (
            <MetallicCard key={gain.muscle} style={styles.gainCard} delay={60 * index} small>
              <View style={styles.gainRow}>
                <View style={styles.gainLeft}>
                  <Text style={[styles.gainMuscle, { color: theme.colors.textPrimary }]}>{gain.muscle}</Text>
                  <Text style={[styles.gainExercise, { color: theme.colors.textMuted }]}>{gain.exercise}</Text>
                </View>
                <View style={styles.gainCenter}>
                  <AnimatedBar
                    percent={(Math.abs(gain.gainPercent) / maxGain) * 100}
                    color={gain.gainPercent > 0 ? accentColor : theme.colors.textMuted}
                    delay={60 * index}
                    mutedColor={theme.colors.textMuted}
                  />
                </View>
                <Text style={[styles.gainPercent, { color: gain.gainPercent > 0 ? accentColor : theme.colors.textMuted }]}>
                  {gain.gainPercent > 0 ? '+' : ''}{gain.gainPercent}%
                </Text>
              </View>
            </MetallicCard>
          ))}
        </View>
      )}
    </View>
  );

  const renderRecordsSection = (drag: () => void, isActive: boolean) => (
    <View style={styles.sectionContainer}>
      <SectionHeader title="PERSONAL RECORDS" drag={drag} isActive={isActive} theme={theme} accentColor={accentColor} />
      {personalRecords.map((record, index) => (
        <MetallicCard key={record.exercise} style={styles.prCard} delay={80 * index} small>
          <View style={styles.prRow}>
            <View style={[styles.prIcon, { backgroundColor: accentColor + '12' }]}>
              <Text style={styles.prEmoji}>🏆</Text>
            </View>
            <View style={styles.prInfo}>
              <Text style={[styles.prExercise, { color: theme.colors.textPrimary }]}>{record.exercise}</Text>
              <Text style={[styles.prDate, { color: theme.colors.textMuted }]}>{formatDate(record.date)}</Text>
            </View>
            <Text style={[styles.prWeight, { color: accentColor }]}>{unitSystem === 'imperial' ? `${Math.round(record.weight * 2.20462)} lbs` : `${record.weight}kg`}</Text>
          </View>
        </MetallicCard>
      ))}
    </View>
  );

  const renderAnalysisSection = (drag: () => void, isActive: boolean) => (
    <View style={styles.sectionContainer}>
      <MetallicCard style={styles.aiCard} intensity="medium">
        <View style={styles.aiHeaderRow}>
          <View style={styles.aiHeader}>
            <Ionicons name="sparkles" size={20} color={accentColor} />
            <Text style={[styles.aiTitle, { color: theme.colors.textPrimary }]}>APEX ANALYSIS</Text>
          </View>
          <TouchableOpacity onLongPress={drag} delayLongPress={150} style={[styles.dragHandle, { backgroundColor: theme.colors.cardSecondary }]} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <Ionicons name="reorder-three" size={20} color={isActive ? accentColor : theme.colors.textMuted} />
          </TouchableOpacity>
        </View>
        {aiLoading ? (
          <View style={styles.aiLoading}>
            {[1, 2, 3, 4].map(i => (
              <View key={i} style={[styles.skeletonLine, { backgroundColor: theme.colors.cardSecondary, width: i === 4 ? '60%' : '100%' }]} />
            ))}
            <ActivityIndicator size="small" color={accentColor} style={{ marginTop: 8 }} />
          </View>
        ) : aiAnalysis ? (
          <View>
            <Text style={[styles.aiText, { color: theme.colors.textSecondary }]}>{aiAnalysis}</Text>
            {aiAnalysis.includes('Unable to connect') || aiAnalysis.includes('not configured') ? (
              <TouchableOpacity
                onPress={() => fetchAiAnalysis(0)}
                style={[styles.generateBtn, { borderColor: accentColor + '40', marginTop: 12 }]}
              >
                <Ionicons name="refresh" size={16} color={accentColor} />
                <Text style={[styles.generateBtnText, { color: accentColor }]}>Retry</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        ) : (
          <TouchableOpacity onPress={() => fetchAiAnalysis(0)} style={[styles.generateBtn, { borderColor: accentColor + '40' }]}>
            <Ionicons name="refresh" size={16} color={accentColor} />
            <Text style={[styles.generateBtnText, { color: accentColor }]}>Generate Analysis</Text>
          </TouchableOpacity>
        )}
      </MetallicCard>
      <TouchableOpacity
        style={[styles.deepDiveBtn, { backgroundColor: accentColor + '15', borderColor: accentColor + '30' }]}
        onPress={handleDeepDive}
        activeOpacity={0.7}
      >
        <Text style={[styles.deepDiveText, { color: accentColor }]}>Deep Dive with Coach</Text>
        <Ionicons name="arrow-forward" size={18} color={accentColor} />
      </TouchableOpacity>
    </View>
  );

  const renderStatsSection = (drag: () => void, isActive: boolean) => (
    <View style={styles.sectionContainer}>
      <SectionHeader title="OVERVIEW" drag={drag} isActive={isActive} theme={theme} accentColor={accentColor} />
      <View key={`stats-${animKey}`} style={styles.statsGrid}>
        <MetallicCard style={styles.statCard} delay={0} small>
          <Ionicons name="trending-up" size={20} color={stats.overallGain >= 0 ? theme.colors.success : theme.colors.danger} />
          <CountUp target={Math.round(stats.overallGain)} suffix="%" prefix={stats.overallGain >= 0 ? '+' : ''} color={theme.colors.textPrimary} />
          <Text style={[styles.statLabel, { color: theme.colors.textMuted }]}>Strength Gain</Text>
        </MetallicCard>
        <MetallicCard style={styles.statCard} delay={80} small>
          <Ionicons name="pulse" size={20} color={accentColor} />
          <CountUp target={stats.avgRecovery} suffix="%" color={theme.colors.textPrimary} />
          <Text style={[styles.statLabel, { color: theme.colors.textMuted }]}>Avg Recovery</Text>
        </MetallicCard>
        <MetallicCard style={styles.statCard} delay={160} small>
          <Ionicons name="flame" size={20} color={isDark ? '#8A6A3A' : theme.colors.warning} />
          <CountUp target={stats.totalWorkouts} color={theme.colors.textPrimary} />
          <Text style={[styles.statLabel, { color: theme.colors.textMuted }]}>Workouts</Text>
        </MetallicCard>
        <MetallicCard style={styles.statCard} delay={240} small>
          <Ionicons name="trophy" size={20} color={isDark ? '#8A6A3A' : theme.colors.warning} />
          <CountUp target={stats.streak} color={theme.colors.textPrimary} />
          <Text style={[styles.statLabel, { color: theme.colors.textMuted }]}>Day Streak</Text>
        </MetallicCard>
      </View>
    </View>
  );

  // ─── Workout History Calendar ────────────────────────
  const workoutDatesMap = useMemo(() => {
    const map: Record<string, any[]> = {};
    workoutHistory.forEach(w => {
      if (w.date) {
        const d = new Date(w.date);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        if (!map[key]) map[key] = [];
        map[key].push(w);
      }
    });
    return map;
  }, [workoutHistory]);

  const streaks = useMemo(() => {
    const dates = Object.keys(workoutDatesMap).sort().reverse();
    let current = 0;
    let longest = 0;
    let streak = 0;
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    
    // Calculate streaks based on consecutive days
    for (let i = 0; i < 365; i++) {
      const d = new Date(today.getTime() - i * 86400000);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      if (workoutDatesMap[key]) {
        streak++;
        if (i === 0 || streak > 1) current = Math.max(current, streak);
      } else {
        if (i === 0) current = 0; // no workout today
        longest = Math.max(longest, streak);
        if (i > 0 && current === 0) break; // stop counting current if broken early
        streak = 0;
      }
    }
    longest = Math.max(longest, streak);
    if (current === 0 && workoutDatesMap[todayStr]) current = streak;
    return { current: Math.max(current, streak), longest };
  }, [workoutDatesMap]);

  const renderCalendarSection = useCallback((drag: () => void, isActive: boolean) => {
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();
    const firstDay = new Date(year, month, 1).getDay(); // 0=Sun
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const DAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
    const monthName = calendarMonth.toLocaleString('default', { month: 'long', year: 'numeric' });

    const cells: (number | null)[] = [];
    for (let i = 0; i < firstDay; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);
    while (cells.length % 7 !== 0) cells.push(null);

    const selectedWorkouts = selectedCalendarDate ? workoutDatesMap[selectedCalendarDate] || [] : [];

    return (
      <View>
        <SectionHeader title="WORKOUT HISTORY" drag={drag} isActive={isActive} theme={theme} accentColor={accentColor} />
        
        {/* Streak */}
        <View style={[styles.streakRow, { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder }]}>
          <View style={styles.streakItem}>
            <Ionicons name="flame" size={18} color={accentColor} />
            <Text style={[styles.streakValue, { color: theme.colors.textPrimary }]}>{streaks.current}</Text>
            <Text style={[styles.streakLabel, { color: theme.colors.textMuted }]}>Current</Text>
          </View>
          <View style={[styles.streakDivider, { backgroundColor: theme.colors.cardBorder }]} />
          <View style={styles.streakItem}>
            <Ionicons name="trophy" size={18} color="#FFD700" />
            <Text style={[styles.streakValue, { color: theme.colors.textPrimary }]}>{streaks.longest}</Text>
            <Text style={[styles.streakLabel, { color: theme.colors.textMuted }]}>Best</Text>
          </View>
        </View>

        <MetallicCard style={styles.calendarCard}>
          {/* Month Nav */}
          <View style={styles.calMonthNav}>
            <TouchableOpacity onPress={() => setCalendarMonth(new Date(year, month - 1, 1))}>
              <Ionicons name="chevron-back" size={22} color={theme.colors.textSecondary} />
            </TouchableOpacity>
            <Text style={[styles.calMonthText, { color: theme.colors.textPrimary }]}>{monthName}</Text>
            <TouchableOpacity onPress={() => setCalendarMonth(new Date(year, month + 1, 1))}>
              <Ionicons name="chevron-forward" size={22} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Day Headers */}
          <View style={styles.calRow}>
            {DAYS.map((d, i) => (
              <View key={i} style={styles.calCell}>
                <Text style={[styles.calDayHeader, { color: theme.colors.textMuted }]}>{d}</Text>
              </View>
            ))}
          </View>

          {/* Calendar Grid */}
          {Array.from({ length: Math.ceil(cells.length / 7) }).map((_, rowIdx) => (
            <View key={rowIdx} style={styles.calRow}>
              {cells.slice(rowIdx * 7, rowIdx * 7 + 7).map((day, colIdx) => {
                if (day === null) return <View key={colIdx} style={styles.calCell} />;
                const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                const hasWorkout = !!workoutDatesMap[dateKey];
                const isToday = dateKey === `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(new Date().getDate()).padStart(2, '0')}`;
                const isSelected = selectedCalendarDate === dateKey;

                return (
                  <TouchableOpacity
                    key={colIdx}
                    style={[styles.calCell, isSelected && { backgroundColor: accentColor + '20', borderRadius: 8 }]}
                    onPress={() => hasWorkout && setSelectedCalendarDate(isSelected ? null : dateKey)}
                    activeOpacity={hasWorkout ? 0.6 : 1}
                  >
                    <Text style={[
                      styles.calDayText,
                      { color: isToday ? accentColor : theme.colors.textPrimary },
                      isToday && styles.calDayToday,
                    ]}>{day}</Text>
                    {hasWorkout && <View style={[styles.calDot, { backgroundColor: accentColor }]} />}
                  </TouchableOpacity>
                );
              })}
            </View>
          ))}
        </MetallicCard>

        {/* Selected Date Detail Modal */}
        <Modal visible={!!selectedCalendarDate && selectedWorkouts.length > 0} transparent animationType="fade" onRequestClose={() => setSelectedCalendarDate(null)}>
          <TouchableOpacity style={styles.calModalOverlay} activeOpacity={1} onPress={() => setSelectedCalendarDate(null)}>
            <View style={[styles.calModal, { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder }]}>
              <View style={styles.calModalHeader}>
                <Text style={[styles.calModalTitle, { color: theme.colors.textPrimary }]}>
                  {selectedCalendarDate ? new Date(selectedCalendarDate + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' }) : ''}
                </Text>
                <TouchableOpacity onPress={() => setSelectedCalendarDate(null)}>
                  <Ionicons name="close" size={22} color={theme.colors.textSecondary} />
                </TouchableOpacity>
              </View>
              <ScrollView style={{ maxHeight: 350 }}>
                {selectedWorkouts.map((w: any, wi: number) => (
                  <View key={wi} style={[styles.calModalWorkout, wi > 0 && { borderTopWidth: 0.5, borderTopColor: theme.colors.cardBorder, marginTop: 12, paddingTop: 12 }]}>
                    <Text style={[styles.calModalWorkoutTitle, { color: accentColor }]}>{w.title}</Text>
                    <Text style={[styles.calModalMeta, { color: theme.colors.textMuted }]}>{w.duration} min • {w.intensity}</Text>
                    {w.exercises?.map((ex: any, ei: number) => (
                      <View key={ei} style={styles.calModalExRow}>
                        <Text style={[styles.calModalExName, { color: theme.colors.textPrimary }]}>{ex.name}</Text>
                        <Text style={[styles.calModalExDetail, { color: theme.colors.textMuted }]}>
                          {ex.completedSets || ex.sets}x{ex.reps}{ex.weight ? ` @ ${ex.weight}kg` : ''}
                        </Text>
                      </View>
                    ))}
                  </View>
                ))}
              </ScrollView>
            </View>
          </TouchableOpacity>
        </Modal>
      </View>
    );
  }, [calendarMonth, workoutDatesMap, selectedCalendarDate, streaks, theme, accentColor]);

  // ─── Header + filter (always at top, not draggable) ─
  const ListHeader = () => (
    <View style={styles.listHeader}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: theme.colors.textPrimary }]}>
          {profile?.name ? `${profile.name}'s Progress` : 'Progress'}
        </Text>
        <Text style={[styles.headerSubtitle, { color: theme.colors.textMuted }]}>
          {profile?.fitnessGoals?.[0] ? profile.fitnessGoals[0].toUpperCase() : 'PERFORMANCE TRACKING'}
        </Text>
      </View>

      {/* Time Period Selector */}

      {/* Secondary Goal Progress Card */}
      {hasActiveGoalLayeringPlan && secondaryGoal?.isActive && (
        <GoalProgressCard goal={secondaryGoal} accentColor={accentColor} theme={theme} />
      )}

      {/* Time Period Selector (original) */}
      <View style={[styles.filterContainer, { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder }]}>
        {timePeriods.map((period) => (
          <TouchableOpacity
            key={period}
            style={[
              styles.filterButton,
              timePeriod === period && [styles.filterButtonActive, { borderTopColor: accentColor, backgroundColor: theme.colors.cardSecondary }],
            ]}
            onPress={() => setTimePeriod(period)}
            activeOpacity={0.7}
          >
            <Text style={[styles.filterText, { color: timePeriod === period ? theme.colors.textPrimary : theme.colors.textMuted }]}>
              {period === '7d' ? '7 Days' : period === '15d' ? '15 Days' : period === '30d' ? '30 Days' : 'All Time'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Reorder hint */}
      <View style={[styles.hintRow, { backgroundColor: theme.colors.cardSecondary, borderColor: theme.colors.cardBorder }]}>
        <Ionicons name="move-outline" size={14} color={theme.colors.textMuted} />
        <Text style={[styles.hintText, { color: theme.colors.textMuted }]}>
          Hold the <Ionicons name="reorder-three" size={14} color={theme.colors.textMuted} /> icon to reorder sections
        </Text>
      </View>
    </View>
  );

  if (!hasData) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <ListHeader />
        <View style={styles.emptyWrap}>
          <MetallicCard style={styles.emptyCard}>
            <View style={styles.emptyContent}>
              <Ionicons name="barbell-outline" size={48} color={theme.colors.textMuted} />
              <Text style={[styles.emptyTitle, { color: theme.colors.textPrimary }]}>No Progress Data Yet</Text>
              <Text style={[styles.emptyText, { color: theme.colors.textMuted }]}>Log your first workout to start tracking progress</Text>
            </View>
          </MetallicCard>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 120 }]}
        keyboardShouldPersistTaps="handled"
      >
        <ListHeader />
        {sections.map((section) => {
          const item = section;
          switch (item.key) {
            case 'strength': return <View key={item.key}>{renderStrengthSection(() => {}, false)}</View>;
            case 'calendar': return <View key={item.key}>{renderCalendarSection(() => {}, false)}</View>;
            case 'records': return <View key={item.key}>{renderRecordsSection(() => {}, false)}</View>;
            case 'analysis': return <View key={item.key}>{renderAnalysisSection(() => {}, false)}</View>;
            default: return null;
          }
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ─────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  listHeader: {
    paddingTop: 20,
  },
  header: {
    marginBottom: 24,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 1.5,
    marginTop: 4,
  },
  filterContainer: {
    flexDirection: 'row',
    borderRadius: 14,
    padding: 4,
    marginBottom: 16,
    borderWidth: 0.5,
  },
  filterButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10,
  },
  filterButtonActive: {
    borderTopWidth: 1,
  },
  filterText: {
    fontSize: 13,
    fontWeight: '600',
  },
  hintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 0.5,
    marginBottom: 20,
  },
  hintText: {
    fontSize: 12,
    fontWeight: '500',
  },
  // Sections
  sectionContainer: {
    marginBottom: 24,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionHeaderText: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 1.5,
  },
  sectionSubtitle: {
    fontSize: 12,
    marginTop: 2,
    opacity: 0.7,
  },
  dragHandle: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noDataText: {
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: 24,
  },
  // Stats Grid
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -5,
  },
  statCard: {
    width: '46%',
    marginHorizontal: '2%',
    marginBottom: 10,
    alignItems: 'center',
    paddingVertical: 20,
  },
  statValue: {
    fontSize: 28,
    fontWeight: '700',
    marginTop: 8,
    letterSpacing: -1,
  },
  statLabel: {
    fontSize: 11,
    marginTop: 4,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  // Strength Gain Cards
  gainCard: {
    marginBottom: 8,
  },
  gainRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  gainLeft: {
    width: 90,
    marginRight: 12,
  },
  gainMuscle: {
    fontSize: 14,
    fontWeight: '700',
  },
  gainExercise: {
    fontSize: 11,
    marginTop: 2,
  },
  gainCenter: {
    flex: 1,
    marginRight: 12,
  },
  gainPercent: {
    fontSize: 18,
    fontWeight: '700',
    width: 65,
    textAlign: 'right',
    letterSpacing: -0.5,
  },
  barTrack: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 4,
  },
  // Personal Records
  prCard: {
    marginBottom: 8,
  },
  prRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  prIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  prEmoji: {
    fontSize: 20,
  },
  prInfo: {
    flex: 1,
  },
  prExercise: {
    fontSize: 16,
    fontWeight: '600',
  },
  prDate: {
    fontSize: 12,
    marginTop: 2,
  },
  prWeight: {
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  // AI Analysis
  aiCard: {
    marginBottom: 12,
  },
  aiHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  aiHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  aiTitle: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 1.5,
  },
  aiText: {
    fontSize: 14,
    lineHeight: 22,
  },
  aiLoading: {
    gap: 8,
  },
  skeletonLine: {
    height: 14,
    borderRadius: 7,
  },
  generateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    gap: 8,
  },
  generateBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
  deepDiveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 14,
    borderWidth: 1,
    gap: 8,
  },
  deepDiveText: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  // Empty
  emptyWrap: {
    padding: 20,
  },
  emptyCard: {
    marginTop: 40,
  },
  emptyContent: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 16,
  },
  emptyText: {
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  bottomSpacer: {
    height: 40,
  },
  // Goal Progress Card
  goalProgressCard: {
    marginBottom: 16,
  },
  goalProgressLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1,
  },
  goalProgressDesc: {
    fontSize: 15,
    fontWeight: '600',
    marginTop: 4,
    marginBottom: 12,
  },
  goalProgressBar: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  goalProgressFill: {
    height: '100%',
    borderRadius: 4,
  },
  goalProgressValues: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  goalProgressVal: {
    fontSize: 12,
    fontWeight: '500',
  },
  goalProgressValBold: {
    fontSize: 14,
    fontWeight: '700',
  },
  goalProgressFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
  },
  goalProgressWeeks: {
    fontSize: 12,
    fontWeight: '500',
  },
  goalStatusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  goalStatusText: {
    fontSize: 12,
    fontWeight: '700',
  },
  // Calendar styles
  streakRow: {
    flexDirection: 'row',
    borderRadius: 14,
    borderWidth: 0.5,
    paddingVertical: 12,
    marginBottom: 12,
  },
  streakItem: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  streakValue: {
    fontSize: 20,
    fontWeight: '800',
  },
  streakLabel: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  streakDivider: {
    width: 0.5,
    height: '80%',
    alignSelf: 'center',
  },
  calendarCard: {
    marginBottom: 16,
  },
  calMonthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  calMonthText: {
    fontSize: 16,
    fontWeight: '700',
  },
  calRow: {
    flexDirection: 'row',
  },
  calCell: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    minHeight: 36,
  },
  calDayHeader: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  calDayText: {
    fontSize: 13,
    fontWeight: '500',
  },
  calDayToday: {
    fontWeight: '800',
  },
  calDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    marginTop: 2,
  },
  calModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  calModal: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 16,
    borderWidth: 0.5,
    padding: 20,
  },
  calModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  calModalTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  calModalWorkout: {},
  calModalWorkoutTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
  },
  calModalMeta: {
    fontSize: 12,
    marginBottom: 10,
  },
  calModalExRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  calModalExName: {
    fontSize: 13,
    fontWeight: '500',
  },
  calModalExDetail: {
    fontSize: 12,
  },
});
