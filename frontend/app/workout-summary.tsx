import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Animated,
  Easing,
  Platform,
  KeyboardAvoidingView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useWorkoutStore, OverallFeedback, ExerciseFeedback, WorkoutLog } from '../src/store/workoutStore';
import { useHealthStore } from '../src/store/healthStore';
import { useThemeStore } from '../src/store/themeStore';

const OVERALL_OPTIONS: { key: OverallFeedback; label: string; icon: string }[] = [
  { key: 'too_easy', label: 'Too Easy', icon: 'happy-outline' },
  { key: 'just_right', label: 'Just Right', icon: 'thumbs-up-outline' },
  { key: 'hard_but_good', label: 'Hard but Good', icon: 'flame-outline' },
  { key: 'too_hard', label: 'Too Hard', icon: 'warning-outline' },
  { key: 'exhausted', label: 'I was exhausted', icon: 'bed-outline' },
];

const EXERCISE_OPTIONS: { key: ExerciseFeedback; label: string }[] = [
  { key: 'too_easy', label: 'Too Easy' },
  { key: 'good', label: 'Good' },
  { key: 'too_hard', label: 'Too Hard' },
  { key: 'had_pain', label: 'Had Pain' },
];

const FATIGUE_MAP: Record<OverallFeedback, number> = {
  too_easy: 0.25,
  just_right: 0.45,
  hard_but_good: 0.6,
  too_hard: 0.7,
  exhausted: 0.8,
};

export default function WorkoutSummaryScreen() {
  const router = useRouter();
  const theme = useThemeStore((s) => s.theme);
  const accentColor = useThemeStore((s) => s.accentColor);

  const activeWorkout = useWorkoutStore((s) => s.activeWorkout);
  const saveWorkoutLog = useWorkoutStore((s) => s.saveWorkoutLog);
  const updateMuscleReadiness = useHealthStore((s) => s.updateMuscleReadiness);

  // CRITICAL: Snapshot workout data into local state on mount so that
  // when saveWorkoutLog resets activeWorkout to null, we still have data
  const [snapshotWorkout] = useState(() => {
    const w = activeWorkout?.workout;
    if (!w) return null;
    return {
      title: w.title || 'Workout',
      type: w.type || 'full',
      exercises: (w.exercises || []).map((ex) => ({
        id: ex.id || `ex_${Math.random()}`,
        name: ex.name || 'Unknown Exercise',
        targetMuscles: ex.targetMuscles || [],
        sets: ex.sets || 0,
        reps: ex.reps || '0',
        weight: ex.weight,
        isCompleted: ex.isCompleted || false,
        completedSets: ex.completedSets || 0,
      })),
      targetMuscles: w.targetMuscles || [],
    };
  });

  const [snapshotStartTime] = useState(() => activeWorkout?.startTime || null);

  const durationSeconds = useMemo(() => {
    if (!snapshotStartTime) return 0;
    try {
      return Math.max(0, Math.round((Date.now() - new Date(snapshotStartTime).getTime()) / 1000));
    } catch {
      return 0;
    }
  }, [snapshotStartTime]);

  // State
  const [overallFeedback, setOverallFeedback] = useState<OverallFeedback | null>(null);
  const [exerciseFeedback, setExerciseFeedback] = useState<Record<string, ExerciseFeedback>>({});
  const [notes, setNotes] = useState('');
  const [showExerciseRatings, setShowExerciseRatings] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Animations
  const checkmarkScale = useRef(new Animated.Value(0)).current;
  const headerOpacity = useRef(new Animated.Value(0)).current;
  const celebrationScale = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.timing(checkmarkScale, {
        toValue: 1,
        duration: 500,
        easing: Easing.elastic(1.2),
        useNativeDriver: true,
      }),
      Animated.timing(headerOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  // No workout data — show safe fallback
  if (!snapshotWorkout) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={styles.emptyState}>
          <Ionicons name="alert-circle-outline" size={48} color={theme.colors.textMuted} />
          <Text style={[styles.emptyText, { color: theme.colors.textMuted }]}>No active workout found</Text>
          <TouchableOpacity onPress={() => router.replace('/(tabs)/workout')} style={[styles.backBtn, { backgroundColor: accentColor }]}>
            <Text style={styles.backBtnText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const exercises = snapshotWorkout.exercises;
  const completedExercises = exercises.filter((e) => (e.completedSets || 0) > 0);
  const totalSetsCompleted = exercises.reduce((acc, e) => acc + (e.completedSets || 0), 0);
  const totalSets = exercises.reduce((acc, e) => acc + (e.sets || 0), 0);
  const allTargetMuscles = [...new Set(exercises.flatMap((e) => e.targetMuscles || []))];

  const formatDuration = (seconds: number) => {
    const secs = Math.max(0, seconds || 0);
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m ${s}s`;
  };

  const handleSave = () => {
    try {
      setError(null);
      const log: WorkoutLog = {
        id: `log_${Date.now()}`,
        workoutTitle: snapshotWorkout.title,
        workoutType: snapshotWorkout.type,
        date: new Date(),
        durationSeconds: durationSeconds || 0,
        exercises: exercises.map((e) => ({
          name: e.name || 'Unknown',
          sets: e.sets || 0,
          completedSets: e.completedSets || 0,
          reps: e.reps || '0',
          weight: e.weight,
          targetMuscles: e.targetMuscles || [],
          feedback: exerciseFeedback[e.id],
        })),
        totalSetsCompleted: totalSetsCompleted || 0,
        totalExercisesCompleted: completedExercises.length || 0,
        overallFeedback: overallFeedback || undefined,
        notes: notes.trim() || undefined,
        targetMuscles: allTargetMuscles,
      };

      // Save workout log (this resets activeWorkout, but we use snapshotWorkout)
      saveWorkoutLog(log);

      // Update muscle readiness
      const fatigueFactor = overallFeedback ? FATIGUE_MAP[overallFeedback] : 0.5;
      if (allTargetMuscles.length > 0) {
        updateMuscleReadiness(allTargetMuscles, fatigueFactor);
      }

      // Celebration
      setSaved(true);
      Animated.spring(celebrationScale, {
        toValue: 1,
        friction: 4,
        tension: 60,
        useNativeDriver: true,
      }).start(() => {
        setTimeout(() => {
          try {
            router.replace('/(tabs)/workout');
          } catch {
            // Fallback navigation
            router.back();
          }
        }, 1200);
      });
    } catch (err: any) {
      console.error('[WorkoutSummary] Save error:', err);
      setError('Something went wrong saving your workout. Please try again.');
    }
  };

  if (saved) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={styles.celebrationContainer}>
          <Animated.View style={[styles.celebrationCircle, { backgroundColor: accentColor + '15', transform: [{ scale: celebrationScale }] }]}>
            <Ionicons name="checkmark-circle" size={80} color={accentColor} />
          </Animated.View>
          <Text style={[styles.celebrationTitle, { color: theme.colors.textPrimary }]}>Workout Saved!</Text>
          <Text style={[styles.celebrationSub, { color: theme.colors.textMuted }]}>Great work today</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View style={styles.header}>
            <Animated.View style={[styles.checkmarkContainer, { transform: [{ scale: checkmarkScale }] }]}>
              <View style={[styles.checkCircle, { backgroundColor: accentColor + '15' }]}>
                <Ionicons name="checkmark-circle" size={56} color={accentColor} />
              </View>
            </Animated.View>
            <Animated.View style={{ opacity: headerOpacity }}>
              <Text style={[styles.headerTitle, { color: theme.colors.textPrimary }]}>WORKOUT COMPLETE</Text>
              <Text style={[styles.headerSubtitle, { color: theme.colors.textMuted }]}>{snapshotWorkout.title}</Text>
            </Animated.View>
          </View>

          {/* Stats Row */}
          <View style={[styles.statsRow, { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder }]}>
            <View style={styles.statItem}>
              <Ionicons name="time-outline" size={20} color={accentColor} />
              <Text style={[styles.statValue, { color: theme.colors.textPrimary }]}>{formatDuration(durationSeconds)}</Text>
              <Text style={[styles.statLabel, { color: theme.colors.textMuted }]}>Duration</Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: theme.colors.cardBorder }]} />
            <View style={styles.statItem}>
              <Ionicons name="barbell-outline" size={20} color={accentColor} />
              <Text style={[styles.statValue, { color: theme.colors.textPrimary }]}>{completedExercises.length}/{exercises.length}</Text>
              <Text style={[styles.statLabel, { color: theme.colors.textMuted }]}>Exercises</Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: theme.colors.cardBorder }]} />
            <View style={styles.statItem}>
              <Ionicons name="layers-outline" size={20} color={accentColor} />
              <Text style={[styles.statValue, { color: theme.colors.textPrimary }]}>{totalSetsCompleted}/{totalSets}</Text>
              <Text style={[styles.statLabel, { color: theme.colors.textMuted }]}>Sets</Text>
            </View>
          </View>

          {/* Exercise List */}
          <View style={[styles.section, { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder }]}>
            <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>EXERCISES</Text>
            {exercises.map((ex, i) => (
              <View key={ex.id} style={[styles.exerciseRow, i < exercises.length - 1 && { borderBottomWidth: 0.5, borderBottomColor: theme.colors.cardBorder }]}>
                <View style={styles.exerciseLeft}>
                  <View style={[styles.exerciseStatus, { backgroundColor: (ex.completedSets || 0) >= (ex.sets || 1) ? accentColor : (theme.colors.textMuted + '30') }]}>
                    {(ex.completedSets || 0) >= (ex.sets || 1) ? (
                      <Ionicons name="checkmark" size={12} color="#fff" />
                    ) : (
                      <Text style={{ color: theme.colors.textMuted, fontSize: 10 }}>{ex.completedSets || 0}</Text>
                    )}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.exerciseName, { color: theme.colors.textPrimary }]}>{ex.name}</Text>
                    <Text style={[styles.exerciseDetail, { color: theme.colors.textMuted }]}>
                      {ex.completedSets || 0}/{ex.sets || 0} sets x {ex.reps || '0'} reps{ex.weight ? ` @ ${ex.weight}kg` : ''}
                    </Text>
                  </View>
                </View>
              </View>
            ))}
          </View>

          {/* Overall Feedback */}
          <View style={[styles.section, { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder }]}>
            <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>HOW WAS THIS WORKOUT?</Text>
            <View style={styles.feedbackRow}>
              {OVERALL_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt.key}
                  style={[
                    styles.feedbackPill,
                    {
                      borderColor: overallFeedback === opt.key ? accentColor : theme.colors.cardBorder,
                      backgroundColor: overallFeedback === opt.key ? accentColor + '15' : 'transparent',
                    },
                  ]}
                  onPress={() => setOverallFeedback(opt.key)}
                  activeOpacity={0.7}
                >
                  <Ionicons name={opt.icon as any} size={16} color={overallFeedback === opt.key ? accentColor : theme.colors.textMuted} />
                  <Text style={[styles.feedbackPillText, { color: overallFeedback === opt.key ? accentColor : theme.colors.textMuted }]}>{opt.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Notes */}
          <View style={[styles.section, { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder }]}>
            <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>NOTES</Text>
            <TextInput
              style={[styles.notesInput, { color: theme.colors.textPrimary, borderColor: theme.colors.cardBorder, backgroundColor: theme.colors.background }]}
              placeholder="Any additional notes about this workout?"
              placeholderTextColor={theme.colors.textMuted}
              value={notes}
              onChangeText={setNotes}
              multiline
              maxLength={500}
              textAlignVertical="top"
            />
          </View>

          {/* Per-Exercise Rating */}
          <TouchableOpacity
            style={[styles.section, { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder }]}
            onPress={() => setShowExerciseRatings(!showExerciseRatings)}
            activeOpacity={0.7}
          >
            <View style={styles.expandHeader}>
              <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary, marginBottom: 0 }]}>RATE EACH EXERCISE</Text>
              <Ionicons name={showExerciseRatings ? 'chevron-up' : 'chevron-down'} size={20} color={theme.colors.textMuted} />
            </View>
          </TouchableOpacity>

          {showExerciseRatings && (
            <View style={[styles.section, { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder, marginTop: -8 }]}>
              {exercises.map((ex) => (
                <View key={ex.id} style={styles.exerciseRatingBlock}>
                  <Text style={[styles.exerciseRatingName, { color: theme.colors.textPrimary }]}>{ex.name}</Text>
                  <View style={styles.exerciseRatingRow}>
                    {EXERCISE_OPTIONS.map((opt) => (
                      <TouchableOpacity
                        key={opt.key}
                        style={[
                          styles.exRatingPill,
                          {
                            borderColor: exerciseFeedback[ex.id] === opt.key ? accentColor : theme.colors.cardBorder,
                            backgroundColor: exerciseFeedback[ex.id] === opt.key ? accentColor + '15' : 'transparent',
                          },
                        ]}
                        onPress={() => setExerciseFeedback((prev) => ({ ...prev, [ex.id]: opt.key }))}
                        activeOpacity={0.7}
                      >
                        <Text style={[styles.exRatingText, { color: exerciseFeedback[ex.id] === opt.key ? accentColor : theme.colors.textMuted }]}>{opt.label}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* Error Message */}
          {error && (
            <View style={[styles.errorBanner, { backgroundColor: '#8B3A3A20', borderColor: '#8B3A3A' }]}>
              <Ionicons name="alert-circle" size={18} color="#e74c3c" />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {/* Save Button */}
          <TouchableOpacity
            style={[styles.saveButton, { backgroundColor: accentColor }]}
            onPress={handleSave}
            activeOpacity={0.8}
          >
            <Ionicons name="save-outline" size={20} color="#fff" />
            <Text style={styles.saveButtonText}>Save Workout</Text>
          </TouchableOpacity>

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 40 },
  header: { alignItems: 'center', marginBottom: 24 },
  checkmarkContainer: { marginBottom: 12 },
  checkCircle: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 22, fontWeight: '800', letterSpacing: 2, textAlign: 'center' },
  headerSubtitle: { fontSize: 15, marginTop: 4, textAlign: 'center' },
  statsRow: { flexDirection: 'row', borderRadius: 16, borderWidth: 0.5, paddingVertical: 16, marginBottom: 16 },
  statItem: { flex: 1, alignItems: 'center', gap: 4 },
  statValue: { fontSize: 18, fontWeight: '700' },
  statLabel: { fontSize: 11, fontWeight: '500', textTransform: 'uppercase', letterSpacing: 0.5 },
  statDivider: { width: 0.5, height: '80%', alignSelf: 'center' },
  section: { borderRadius: 16, borderWidth: 0.5, padding: 16, marginBottom: 12 },
  sectionTitle: { fontSize: 12, fontWeight: '700', letterSpacing: 1, marginBottom: 12 },
  exerciseRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10 },
  exerciseLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  exerciseStatus: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  exerciseName: { fontSize: 14, fontWeight: '600' },
  exerciseDetail: { fontSize: 12, marginTop: 2 },
  feedbackRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  feedbackPill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 50, borderWidth: 1 },
  feedbackPillText: { fontSize: 13, fontWeight: '600' },
  notesInput: { borderWidth: 0.5, borderRadius: 12, padding: 12, fontSize: 14, minHeight: 80 },
  expandHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  exerciseRatingBlock: { marginBottom: 12 },
  exerciseRatingName: { fontSize: 14, fontWeight: '600', marginBottom: 8 },
  exerciseRatingRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  exRatingPill: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 50, borderWidth: 1 },
  exRatingText: { fontSize: 12, fontWeight: '600' },
  errorBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: 12, borderWidth: 0.5, marginBottom: 12 },
  errorText: { color: '#e74c3c', fontSize: 13, fontWeight: '500', flex: 1 },
  saveButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16, borderRadius: 14, marginTop: 8 },
  saveButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 },
  emptyText: { fontSize: 16 },
  backBtn: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
  backBtnText: { color: '#fff', fontWeight: '600' },
  celebrationContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 },
  celebrationCircle: { width: 120, height: 120, borderRadius: 60, alignItems: 'center', justifyContent: 'center' },
  celebrationTitle: { fontSize: 24, fontWeight: '800' },
  celebrationSub: { fontSize: 16 },
});
