import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useThemeStore } from '../src/store/themeStore';
import { useUserStore } from '../src/store/userStore';
import { useExerciseStore } from '../src/store/exerciseStore';
import { useWorkoutStore } from '../src/store/workoutStore';

export default function AIWorkoutPreviewScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const theme = useThemeStore((s) => s.theme);
  const accentColor = useThemeStore((s) => s.accentColor);
  const { profile } = useUserStore();
  const { saveWorkout } = useExerciseStore();
  const { setTodayWorkoutByType } = useWorkoutStore();

  const workout = params.workoutData ? JSON.parse(params.workoutData) : null;
  const genParams = params.genParams ? JSON.parse(params.genParams) : null;

  if (!workout) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <Text style={[styles.errorText, { color: theme.colors.textMuted }]}>No workout data</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={[styles.backLink, { color: accentColor }]}>Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const handleStartNow = () => {
    const exercises = (workout.exercises || []).map((ex, i) => ({
      id: ex.id || `ai_live_${i}`,
      name: ex.name,
      sets: Array.from({ length: ex.sets || 3 }, (_, si) => ({
        id: `s${si}`,
        weight: ex.weight || 0,
        reps: parseInt(ex.reps) || 10,
        completed: false,
      })),
      restSeconds: ex.restSeconds || 90,
    }));
    setTodayWorkoutByType('custom', {
      title: workout.title || 'AI Workout',
      exercises,
    });
    router.replace('/(tabs)/workout');
  };

  const handleSave = () => {
    try {
      saveWorkout({
        id: `wk_ai_${Date.now()}`,
        name: workout.title || 'AI Workout',
        targetMuscles: workout.targetMuscles || [],
        exercises: (workout.exercises || []).map((ex, i) => ({
          exerciseId: ex.id || `ai_${i}`,
          name: ex.name,
          primaryMuscle: (ex.targetMuscles || [])[0] || 'General',
          equipment: 'Various',
          sets: ex.sets || 3,
          reps: String(ex.reps || '10'),
          restSeconds: ex.restSeconds || 90,
          notes: ex.notes || undefined,
        })),
        estimatedDuration: workout.duration || 45,
        difficulty: workout.intensity || 'intermediate',
        trainingStyle: profile?.trainingStyle,
        scheduledDays: [],
        repeatWeekly: false,
        createdAt: new Date(),
      });
      Alert.alert('Saved!', `"${workout.title}" added to My Workouts`);
    } catch (e) {
      Alert.alert('Save Failed', 'Could not save workout. Please try again.');
    }
  };

  const handleRegenerate = () => {
    router.back();
  };

  const handleEdit = () => {
    router.push({
      pathname: '/workout-builder',
      params: { aiWorkout: JSON.stringify(workout) },
    });
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={theme.colors.textPrimary} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={[styles.headerTitle, { color: theme.colors.textPrimary }]}>AI WORKOUT</Text>
          <Text style={[styles.headerSub, { color: theme.colors.textMuted }]}>Generated for you</Text>
        </View>
        <Ionicons name="sparkles" size={22} color="#7C3AED" />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Workout Title & Meta */}
        <View style={[styles.titleCard, { backgroundColor: theme.colors.card, borderColor: '#7C3AED40' }]}>
          <Text style={[styles.workoutTitle, { color: theme.colors.textPrimary }]}>{workout.title}</Text>
          <View style={styles.metaRow}>
            <View style={[styles.metaTag, { backgroundColor: theme.colors.backgroundSecondary }]}>
              <Ionicons name="time-outline" size={13} color={theme.colors.textSecondary} />
              <Text style={[styles.metaText, { color: theme.colors.textSecondary }]}>{workout.duration || '~45'} min</Text>
            </View>
            <View style={[styles.metaTag, { backgroundColor: theme.colors.backgroundSecondary }]}>
              <Ionicons name="barbell-outline" size={13} color={theme.colors.textSecondary} />
              <Text style={[styles.metaText, { color: theme.colors.textSecondary }]}>{(workout.exercises || []).length} exercises</Text>
            </View>
            {workout.intensity && (
              <View style={[styles.metaTag, { backgroundColor: theme.colors.backgroundSecondary }]}>
                <Ionicons name="flame-outline" size={13} color={theme.colors.textSecondary} />
                <Text style={[styles.metaText, { color: theme.colors.textSecondary }]}>{workout.intensity}</Text>
              </View>
            )}
          </View>
          {(workout.targetMuscles || []).length > 0 && (
            <View style={styles.muscleChips}>
              {workout.targetMuscles.map((m) => (
                <View key={m} style={[styles.muscleChip, { backgroundColor: '#7C3AED15' }]}>
                  <Text style={[styles.muscleChipText, { color: '#7C3AED' }]}>{m}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Exercise List */}
        <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>Exercises</Text>
        {(workout.exercises || []).map((ex, i) => (
          <View key={i} style={[styles.exCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder }]}>
            <View style={styles.exHeader}>
              <View style={[styles.exNum, { backgroundColor: '#7C3AED20' }]}>
                <Text style={[styles.exNumText, { color: '#7C3AED' }]}>{i + 1}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.exName, { color: theme.colors.textPrimary }]}>{ex.name}</Text>
                <Text style={[styles.exMeta, { color: theme.colors.textMuted }]}>
                  {ex.sets} x {ex.reps} · {ex.restSeconds || 90}s rest
                </Text>
              </View>
            </View>
            {ex.notes && (
              <Text style={[styles.exNotes, { color: theme.colors.textSecondary }]}>{ex.notes}</Text>
            )}
          </View>
        ))}

        {/* Action Buttons */}
        <View style={styles.buttonSection}>
          <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: accentColor }]} onPress={handleStartNow}>
            <Ionicons name="play-circle" size={20} color="#fff" />
            <Text style={styles.primaryBtnText}>Start Workout Now</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.secondaryBtn, { borderColor: accentColor }]} onPress={handleSave}>
            <Ionicons name="bookmark-outline" size={18} color={accentColor} />
            <Text style={[styles.secondaryBtnText, { color: accentColor }]}>Save to My Workouts</Text>
          </TouchableOpacity>

          <View style={styles.btnRow}>
            <TouchableOpacity style={[styles.halfBtn, { borderColor: '#7C3AED' }]} onPress={handleRegenerate}>
              <Ionicons name="refresh" size={16} color="#7C3AED" />
              <Text style={[styles.halfBtnText, { color: '#7C3AED' }]}>Regenerate</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.halfBtn, { borderColor: theme.colors.cardBorder }]} onPress={handleEdit}>
              <Ionicons name="create-outline" size={16} color={theme.colors.textSecondary} />
              <Text style={[styles.halfBtnText, { color: theme.colors.textSecondary }]}>Edit Manually</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12, gap: 8 },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '800', letterSpacing: 1.5 },
  headerSub: { fontSize: 12, marginTop: 2 },
  errorText: { fontSize: 16, textAlign: 'center', marginTop: 60 },
  backLink: { fontSize: 16, textAlign: 'center', marginTop: 12, fontWeight: '600' },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 40 },
  titleCard: { padding: 18, borderRadius: 16, borderWidth: 1, marginBottom: 20 },
  workoutTitle: { fontSize: 22, fontWeight: '800', marginBottom: 10 },
  metaRow: { flexDirection: 'row', gap: 8, marginBottom: 10, flexWrap: 'wrap' },
  metaTag: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  metaText: { fontSize: 12 },
  muscleChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  muscleChip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  muscleChipText: { fontSize: 11, fontWeight: '600' },
  sectionTitle: { fontSize: 15, fontWeight: '700', marginBottom: 10 },
  exCard: { padding: 14, borderRadius: 12, borderWidth: 0.5, marginBottom: 8 },
  exHeader: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  exNum: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  exNumText: { fontSize: 14, fontWeight: '700' },
  exName: { fontSize: 15, fontWeight: '600' },
  exMeta: { fontSize: 12, marginTop: 2 },
  exNotes: { fontSize: 12, fontStyle: 'italic', marginTop: 8, marginLeft: 44, lineHeight: 17 },
  buttonSection: { marginTop: 20 },
  primaryBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16, borderRadius: 14, marginBottom: 10 },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  secondaryBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 14, borderWidth: 1.5, marginBottom: 10 },
  secondaryBtnText: { fontSize: 15, fontWeight: '700' },
  btnRow: { flexDirection: 'row', gap: 10 },
  halfBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderRadius: 12, borderWidth: 1 },
  halfBtnText: { fontSize: 13, fontWeight: '600' },
});
