import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DraggableFlatList, { ScaleDecorator, RenderItemParams } from 'react-native-draggable-flatlist';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useThemeStore } from '../../src/store/themeStore';
import { useWorkoutStore } from '../../src/store/workoutStore';
import { useHealthStore } from '../../src/store/healthStore';
import { useUserStore } from '../../src/store/userStore';
import { useGoalStore } from '../../src/store/goalStore';
import { MetallicCard } from '../../src/components/MetallicCard';
import Constants from 'expo-constants';

// ─── Types ──────────────────────────────────────────────
type TimePeriod = '7d' | '15d' | '30d' | 'all';
type SectionId = 'strength' | 'records' | 'analysis' | 'stats';

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

const DEFAULT_SECTION_ORDER: SectionId[] = ['strength', 'records', 'analysis', 'stats'];
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
  const fetchAiAnalysis = useCallback(async () => {
    setAiLoading(true);
    setAiAnalysis(null);
    const periodLabel = timePeriod === '7d' ? '7 days' : timePeriod === '15d' ? '15 days' : timePeriod === '30d' ? '30 days' : 'all time';
    const gainsSummary = muscleGains.map(g => `${g.muscle}: ${g.gainPercent > 0 ? '+' : ''}${g.gainPercent}% (${g.exercise})`).join(', ');
    const goals = profile?.fitnessGoals?.join(', ') || 'general fitness';
    const message = `Analyze my progress data for the last ${periodLabel}. Give me exactly 4 bullet point insights (use bullet characters). Here is my data:
Muscle strength gains ranked: ${gainsSummary || 'No data yet'}
Total workouts: ${stats.totalWorkouts}
Average recovery score: ${stats.avgRecovery}%
Current streak: ${stats.streak} days
Fitness goals: ${goals}
Tell me: 1) Which muscle improved most, 2) Which muscle is most undertrained or lagging, 3) Whether I'm overtrained in any area, 4) One specific actionable recommendation. Keep each point to 1-2 sentences. Do NOT include any action blocks.`;
    try {
      const response = await fetch(`${getBackendUrl()}/api/coach/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message }),
      });
      const data = await response.json();
      setAiAnalysis(data.response || 'Unable to generate analysis.');
    } catch {
      setAiAnalysis('Unable to connect to APEX AI. Check your connection and try again.');
    } finally {
      setAiLoading(false);
    }
  }, [timePeriod, muscleGains, stats, profile]);

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
          <Text style={[styles.aiText, { color: theme.colors.textSecondary }]}>{aiAnalysis}</Text>
        ) : (
          <TouchableOpacity onPress={fetchAiAnalysis} style={[styles.generateBtn, { borderColor: accentColor + '40' }]}>
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

  // ─── Draggable section renderer ─────────────────────
  const renderSection = useCallback(({ item, drag, isActive }: RenderItemParams<Section>) => {
    const content = (() => {
      switch (item.key) {
        case 'strength': return renderStrengthSection(drag, isActive);
        case 'records': return renderRecordsSection(drag, isActive);
        case 'analysis': return renderAnalysisSection(drag, isActive);
        case 'stats': return renderStatsSection(drag, isActive);
        default: return null;
      }
    })();

    return (
      <ScaleDecorator activeScale={0.97}>
        <View style={[isActive && { opacity: 0.85, transform: [{ scale: 0.98 }] }]}>
          {content}
        </View>
      </ScaleDecorator>
    );
  }, [theme, accentColor, muscleGains, personalRecords, stats, aiAnalysis, aiLoading, animKey, isDark, maxGain, timePeriod]);

  const onDragEnd = useCallback(({ data }: { data: Section[] }) => {
    setSections(data);
    saveSectionOrder(data);
  }, [saveSectionOrder]);

  // ─── Header + filter (always at top, not draggable) ─
  const ListHeader = () => (
    <View style={styles.listHeader}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: theme.colors.textPrimary }]}>Progress</Text>
        <Text style={[styles.headerSubtitle, { color: theme.colors.textMuted }]}>PERFORMANCE TRACKING</Text>
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
    <GestureHandlerRootView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <SafeAreaView style={styles.container}>
        <DraggableFlatList
          data={sections}
          onDragEnd={onDragEnd}
          keyExtractor={(item) => item.key}
          renderItem={renderSection}
          ListHeaderComponent={ListHeader}
          ListFooterComponent={<View style={styles.bottomSpacer} />}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          activationDistance={10}
        />
      </SafeAreaView>
    </GestureHandlerRootView>
  );
}

// ─── Styles ─────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
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
});
