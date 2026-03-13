import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useThemeStore } from '../../src/store/themeStore';
import { useWorkoutStore, Workout } from '../../src/store/workoutStore';
import { useHealthStore } from '../../src/store/healthStore';
import { useUserStore } from '../../src/store/userStore';
import { MetallicCard } from '../../src/components/MetallicCard';
import Constants from 'expo-constants';

// ─── Types ──────────────────────────────────────────────
type TimePeriod = '7d' | '15d' | '30d' | 'all';

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

// ─── Main Component ─────────────────────────────────────
export default function ProgressScreen() {
  const { theme, accentColor } = useThemeStore();
  const { workoutHistory } = useWorkoutStore();
  const { recoveryData } = useHealthStore();
  const { profile, setPendingCoachMessage } = useUserStore();
  const router = useRouter();

  const [timePeriod, setTimePeriod] = useState<TimePeriod>('30d');
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [animKey, setAnimKey] = useState(0); // Force re-animation on period change

  const isDark = theme.name === 'dark';

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
        // Find all instances of this exercise in filtered workouts (sorted by date)
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
        } else if (instances.length === 1) {
          if (!bestGain) {
            bestGain = { muscle, exercise: exerciseName, gainPercent: 0, earliestWeight: instances[0].weight, latestWeight: instances[0].weight };
          }
        }
      }

      if (bestGain) {
        gains.push(bestGain);
      }
    }

    // Sort by gain percentage descending
    gains.sort((a, b) => b.gainPercent - a.gainPercent);
    return gains;
  }, [filteredWorkouts]);

  // ─── Calculate personal records (all-time) ──────────
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

    return Object.values(prMap)
      .sort((a, b) => b.weight - a.weight)
      .slice(0, 5);
  }, [workoutHistory]);

  // ─── Calculate stats ────────────────────────────────
  const stats = useMemo(() => {
    const totalWorkouts = filteredWorkouts.length;
    const overallGain = muscleGains.length > 0
      ? Math.round(muscleGains.reduce((sum, g) => sum + g.gainPercent, 0) / muscleGains.length * 10) / 10
      : 0;
    const avgRecovery = recoveryData?.score || 0;

    // Calculate streak (consecutive days with workouts counting backwards from today)
    let streak = 0;
    const DAY = 24 * 60 * 60 * 1000;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let d = 0; d < 60; d++) {
      const checkDate = new Date(today.getTime() - d * DAY);
      const dateStr = checkDate.toDateString();
      const hasWorkout = workoutHistory.some(w => {
        if (!w.date) return false;
        return new Date(w.date).toDateString() === dateStr;
      });
      if (hasWorkout) {
        streak++;
      } else if (d > 0) {
        break;
      }
    }

    return { totalWorkouts, overallGain, avgRecovery, streak };
  }, [filteredWorkouts, muscleGains, recoveryData, workoutHistory]);

  // ─── Fetch AI analysis ──────────────────────────────
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

  // Re-fetch AI analysis when time period changes
  useEffect(() => {
    if (muscleGains.length > 0) {
      fetchAiAnalysis();
    }
  }, [timePeriod]);

  // Re-animate when time period changes
  useEffect(() => {
    setAnimKey(prev => prev + 1);
  }, [timePeriod]);

  // ─── Deep Dive handler ──────────────────────────────
  const handleDeepDive = () => {
    const periodLabel = timePeriod === '7d' ? '7' : timePeriod === '15d' ? '15' : timePeriod === '30d' ? '30' : 'all';
    const goal = profile?.fitnessGoals?.[0] || 'improve my fitness';
    const msg = `Give me a full analysis of my progress over the last ${periodLabel} days. Tell me exactly what I need to focus on to reach my goal of "${goal}".`;
    setPendingCoachMessage(msg);
    router.push('/(tabs)/coach');
  };

  // ─── Format date ────────────────────────────────────
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

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ─── Header ─────────────────────────────── */}
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: theme.colors.textPrimary }]}>Progress</Text>
          <Text style={[styles.headerSubtitle, { color: theme.colors.textMuted }]}>PERFORMANCE TRACKING</Text>
        </View>

        {/* ─── Time Period Selector ───────────────── */}
        <View style={[styles.filterContainer, { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder }]}>
          {(['7d', '15d', '30d', 'all'] as TimePeriod[]).map((period) => (
            <TouchableOpacity
              key={period}
              style={[
                styles.filterButton,
                timePeriod === period && [styles.filterButtonActive, { borderTopColor: accentColor, backgroundColor: theme.colors.cardSecondary }],
              ]}
              onPress={() => setTimePeriod(period)}
              activeOpacity={0.7}
            >
              <Text style={[
                styles.filterText,
                { color: timePeriod === period ? theme.colors.textPrimary : theme.colors.textMuted },
              ]}>
                {period === '7d' ? '7 Days' : period === '15d' ? '15 Days' : period === '30d' ? '30 Days' : 'All Time'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {!hasData ? (
          /* ─── Empty State ─────────────────────── */
          <MetallicCard style={styles.emptyCard}>
            <View style={styles.emptyContent}>
              <Ionicons name="barbell-outline" size={48} color={theme.colors.textMuted} />
              <Text style={[styles.emptyTitle, { color: theme.colors.textPrimary }]}>No Progress Data Yet</Text>
              <Text style={[styles.emptyText, { color: theme.colors.textMuted }]}>
                Log your first workout to start tracking progress
              </Text>
            </View>
          </MetallicCard>
        ) : (
          <>
            {/* ─── Stats Grid 2x2 ───────────────── */}
            <View key={`stats-${animKey}`} style={styles.statsGrid}>
              <MetallicCard style={styles.statCard} delay={0} small>
                <Ionicons name="trending-up" size={20} color={stats.overallGain >= 0 ? theme.colors.success : theme.colors.danger} />
                <CountUp
                  target={Math.round(stats.overallGain)}
                  suffix="%"
                  prefix={stats.overallGain >= 0 ? '+' : ''}
                  color={theme.colors.textPrimary}
                />
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

            {/* ─── Strength Rankings ─────────────── */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: theme.colors.textMuted }]}>STRENGTH GAINS</Text>
              <Text style={[styles.sectionSubtitle, { color: theme.colors.textMuted }]}>Ranked most to least improved</Text>

              {muscleGains.length === 0 ? (
                <Text style={[styles.noDataText, { color: theme.colors.textMuted }]}>No data yet</Text>
              ) : (
                <View key={`gains-${animKey}`}>
                  {muscleGains.map((gain, index) => (
                    <MetallicCard key={gain.muscle} style={styles.gainCard} delay={80 * index} small>
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
                        <Text style={[
                          styles.gainPercent,
                          { color: gain.gainPercent > 0 ? accentColor : theme.colors.textMuted },
                        ]}>
                          {gain.gainPercent > 0 ? '+' : ''}{gain.gainPercent}%
                        </Text>
                      </View>
                    </MetallicCard>
                  ))}
                </View>
              )}
            </View>

            {/* ─── Personal Records ──────────────── */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: theme.colors.textMuted }]}>PERSONAL RECORDS</Text>

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
                    <Text style={[styles.prWeight, { color: accentColor }]}>
                      {record.weight}kg
                    </Text>
                  </View>
                </MetallicCard>
              ))}
            </View>

            {/* ─── AI Analysis ───────────────────── */}
            <View style={styles.section}>
              <MetallicCard style={styles.aiCard} intensity="medium">
                <View style={styles.aiHeader}>
                  <Ionicons name="sparkles" size={20} color={accentColor} />
                  <Text style={[styles.aiTitle, { color: theme.colors.textPrimary }]}>APEX ANALYSIS</Text>
                </View>

                {aiLoading ? (
                  <View style={styles.aiLoading}>
                    {[1, 2, 3, 4].map(i => (
                      <View key={i} style={[styles.skeletonLine, {
                        backgroundColor: theme.colors.cardSecondary,
                        width: i === 4 ? '60%' : '100%',
                      }]} />
                    ))}
                    <ActivityIndicator size="small" color={accentColor} style={{ marginTop: 8 }} />
                  </View>
                ) : aiAnalysis ? (
                  <Text style={[styles.aiText, { color: theme.colors.textSecondary }]}>
                    {aiAnalysis}
                  </Text>
                ) : (
                  <TouchableOpacity onPress={fetchAiAnalysis} style={[styles.generateBtn, { borderColor: accentColor + '40' }]}>
                    <Ionicons name="refresh" size={16} color={accentColor} />
                    <Text style={[styles.generateBtnText, { color: accentColor }]}>Generate Analysis</Text>
                  </TouchableOpacity>
                )}
              </MetallicCard>

              {/* Deep Dive Button */}
              <TouchableOpacity
                style={[styles.deepDiveBtn, { backgroundColor: accentColor + '15', borderColor: accentColor + '30' }]}
                onPress={handleDeepDive}
                activeOpacity={0.7}
              >
                <Text style={[styles.deepDiveText, { color: accentColor }]}>
                  Deep Dive with Coach
                </Text>
                <Ionicons name="arrow-forward" size={18} color={accentColor} />
              </TouchableOpacity>
            </View>
          </>
        )}

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ─────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
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
  // Time Period Selector
  filterContainer: {
    flexDirection: 'row',
    borderRadius: 14,
    padding: 4,
    marginBottom: 24,
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
  // Stats Grid
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -5,
    marginBottom: 24,
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
  // Sections
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 12,
    marginBottom: 16,
    opacity: 0.7,
  },
  noDataText: {
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: 24,
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
  // Bar
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
  aiHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
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
  // Deep Dive Button
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
  // Empty State
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
    height: 20,
  },
});
