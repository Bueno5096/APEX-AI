import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useThemeStore } from '../src/store/themeStore';
import { useExerciseStore } from '../src/store/exerciseStore';
import { useUserStore } from '../src/store/userStore';

interface WorkoutExercise {
  id: string;
  name: string;
  primaryMuscle: string;
  equipment: string;
  sets: number;
  reps: string;
  restSeconds: number;
  notes: string;
}

export default function WorkoutBuilderScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const theme = useThemeStore((s) => s.theme);
  const accentColor = useThemeStore((s) => s.accentColor);
  const { exercises, saveWorkout } = useExerciseStore();
  const { profile } = useUserStore();

  // Parse exercise IDs from params (from exercise browser) or from template
  const exerciseIds = (params.exerciseIds as string || '').split(',').filter(Boolean);
  const safeJsonParse = (str: string | string[] | undefined | null, fallback: any = null) => {
    if (!str) return fallback;
    try { return JSON.parse(Array.isArray(str) ? str[0] : str); } catch { return fallback; }
  };

  const templateExercises = safeJsonParse(params.templateExercises);
  const templateName = params.templateName as string || '';
  const aiWorkout = safeJsonParse(params.aiWorkout);

  const initExercises = useMemo(() => {
    if (aiWorkout && aiWorkout.exercises) {
      return aiWorkout.exercises.map((ex: any, i: number) => ({
        id: ex.id || `ai_${i}`,
        name: ex.name,
        primaryMuscle: ex.targetMuscles?.[0] || 'General',
        equipment: 'Various',
        sets: ex.sets || 3,
        reps: String(ex.reps || '10'),
        restSeconds: ex.restSeconds || 90,
        notes: ex.notes || '',
      }));
    }
    if (templateExercises) {
      return templateExercises.map((ex: any, i: number) => ({
        id: `tpl_${i}`,
        name: ex.name,
        primaryMuscle: 'General',
        equipment: 'Various',
        sets: ex.sets || 3,
        reps: String(ex.reps || '10'),
        restSeconds: ex.restSeconds || 90,
        notes: ex.notes || '',
      }));
    }
    return exerciseIds.map((id) => {
      const ex = exercises.find((e) => e.id === id);
      if (!ex) return null;
      return {
        id: ex.id,
        name: ex.name,
        primaryMuscle: ex.primaryMuscle,
        equipment: ex.equipment,
        sets: ex.defaultSets,
        reps: ex.defaultReps,
        restSeconds: ex.defaultRestSeconds,
        notes: '',
      };
    }).filter(Boolean) as WorkoutExercise[];
  }, []);

  const [workoutName, setWorkoutName] = useState(
    aiWorkout?.title || templateName || 'My Workout'
  );
  const [workoutExercises, setWorkoutExercises] = useState<WorkoutExercise[]>(initExercises);
  const [editingIdx, setEditingIdx] = useState<number | null>(null);

  const updateExercise = (idx: number, field: string, value: any) => {
    setWorkoutExercises((prev) => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], [field]: value };
      return copy;
    });
  };

  const moveExercise = (from: number, to: number) => {
    if (to < 0 || to >= workoutExercises.length) return;
    setWorkoutExercises((prev) => {
      const copy = [...prev];
      const [item] = copy.splice(from, 1);
      copy.splice(to, 0, item);
      return copy;
    });
  };

  const removeExercise = (idx: number) => {
    setWorkoutExercises((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSave = () => {
    if (!workoutName.trim()) {
      Alert.alert('Name Required', 'Please enter a workout name');
      return;
    }
    if (workoutExercises.length === 0) {
      Alert.alert('No Exercises', 'Add at least one exercise');
      return;
    }
    
    const muscles = [...new Set(workoutExercises.map((e) => e.primaryMuscle))];
    const totalTime = workoutExercises.reduce((acc, ex) => {
      return acc + (ex.sets * 45 + ex.sets * ex.restSeconds) / 60;
    }, 0);

    saveWorkout({
      id: `wk_${Date.now()}`,
      name: workoutName,
      targetMuscles: muscles,
      exercises: workoutExercises.map((ex) => ({
        exerciseId: ex.id,
        name: ex.name,
        primaryMuscle: ex.primaryMuscle,
        equipment: ex.equipment,
        sets: ex.sets,
        reps: ex.reps,
        restSeconds: ex.restSeconds,
        notes: ex.notes || undefined,
      })),
      estimatedDuration: Math.round(totalTime),
      difficulty: 'intermediate',
      trainingStyle: profile?.trainingStyle,
      scheduledDays: [],
      repeatWeekly: false,
      createdAt: new Date(),
    });

    Alert.alert('Workout Saved!', `"${workoutName}" has been saved to your library.`, [
      { text: 'OK', onPress: () => router.replace('/(tabs)/workout') },
    ]);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={theme.colors.textPrimary} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={[styles.headerTitle, { color: theme.colors.textPrimary }]}>BUILD WORKOUT</Text>
        </View>
        <TouchableOpacity onPress={() => router.push('/exercise-browser')} style={styles.addMoreBtn}>
          <Ionicons name="add" size={20} color={accentColor} />
          <Text style={[styles.addMoreText, { color: accentColor }]}>Add</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {/* Workout Name */}
        <View style={[styles.nameCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder }]}>
          <Text style={[styles.label, { color: theme.colors.textSecondary }]}>WORKOUT NAME</Text>
          <TextInput
            style={[styles.nameInput, { color: theme.colors.textPrimary, borderColor: theme.colors.cardBorder }]}
            value={workoutName}
            onChangeText={setWorkoutName}
            placeholder="My Workout"
            placeholderTextColor={theme.colors.textMuted}
          />
        </View>

        {/* Exercise List */}
        <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>
          Exercises ({workoutExercises.length})
        </Text>

        {workoutExercises.map((ex, idx) => {
          const isEditing = editingIdx === idx;
          return (
            <View
              key={`${ex.id}_${idx}`}
              style={[styles.exCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder }]}
            >
              <View style={styles.exHeader}>
                <View style={[styles.exNum, { backgroundColor: accentColor + '20' }]}>
                  <Text style={[styles.exNumText, { color: accentColor }]}>{idx + 1}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.exName, { color: theme.colors.textPrimary }]}>{ex.name}</Text>
                  <Text style={[styles.exMuscle, { color: theme.colors.textMuted }]}>{ex.primaryMuscle} · {ex.equipment}</Text>
                </View>
                <View style={styles.exActions}>
                  <TouchableOpacity onPress={() => moveExercise(idx, idx - 1)} disabled={idx === 0} style={[styles.moveBtn, idx === 0 && { opacity: 0.3 }]}>
                    <Ionicons name="chevron-up" size={18} color={theme.colors.textSecondary} />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => moveExercise(idx, idx + 1)} disabled={idx === workoutExercises.length - 1} style={[styles.moveBtn, idx === workoutExercises.length - 1 && { opacity: 0.3 }]}>
                    <Ionicons name="chevron-down" size={18} color={theme.colors.textSecondary} />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Quick stats row */}
              <View style={styles.statsRow}>
                <View style={styles.statItem}>
                  <Text style={[styles.statLabel, { color: theme.colors.textMuted }]}>Sets</Text>
                  <View style={styles.statControls}>
                    <TouchableOpacity onPress={() => updateExercise(idx, 'sets', Math.max(1, ex.sets - 1))} style={[styles.statBtn, { borderColor: theme.colors.cardBorder }]}>
                      <Text style={{ color: theme.colors.textSecondary }}>-</Text>
                    </TouchableOpacity>
                    <Text style={[styles.statValue, { color: theme.colors.textPrimary }]}>{ex.sets}</Text>
                    <TouchableOpacity onPress={() => updateExercise(idx, 'sets', ex.sets + 1)} style={[styles.statBtn, { borderColor: theme.colors.cardBorder }]}>
                      <Text style={{ color: theme.colors.textSecondary }}>+</Text>
                    </TouchableOpacity>
                  </View>
                </View>
                <View style={styles.statItem}>
                  <Text style={[styles.statLabel, { color: theme.colors.textMuted }]}>Reps</Text>
                  <TextInput
                    style={[styles.statInput, { color: theme.colors.textPrimary, borderColor: theme.colors.cardBorder }]}
                    value={ex.reps}
                    onChangeText={(v) => updateExercise(idx, 'reps', v)}
                  />
                </View>
                <View style={styles.statItem}>
                  <Text style={[styles.statLabel, { color: theme.colors.textMuted }]}>Rest</Text>
                  <Text style={[styles.statValue, { color: theme.colors.textPrimary }]}>{ex.restSeconds}s</Text>
                </View>
              </View>

              {/* Delete */}
              <TouchableOpacity onPress={() => removeExercise(idx)} style={styles.deleteBtn}>
                <Ionicons name="trash-outline" size={14} color="#F44336" />
                <Text style={styles.deleteText}>Remove</Text>
              </TouchableOpacity>
            </View>
          );
        })}

        {workoutExercises.length === 0 && (
          <View style={[styles.emptyState, { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder }]}>
            <Ionicons name="barbell-outline" size={40} color={theme.colors.textMuted} />
            <Text style={[styles.emptyText, { color: theme.colors.textMuted }]}>No exercises added yet</Text>
            <TouchableOpacity
              style={[styles.browseBtn, { borderColor: accentColor }]}
              onPress={() => router.push('/exercise-browser')}
            >
              <Text style={[styles.browseBtnText, { color: accentColor }]}>Browse Exercises</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Save Button */}
        {workoutExercises.length > 0 && (
          <TouchableOpacity style={[styles.saveBtn, { backgroundColor: accentColor }]} onPress={handleSave}>
            <Ionicons name="checkmark-circle" size={20} color="#fff" />
            <Text style={styles.saveBtnText}>Save Workout</Text>
          </TouchableOpacity>
        )}

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
  addMoreBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  addMoreText: { fontSize: 14, fontWeight: '600' },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 40 },
  nameCard: { padding: 16, borderRadius: 14, borderWidth: 0.5, marginBottom: 20 },
  label: { fontSize: 11, fontWeight: '700', letterSpacing: 1, marginBottom: 8 },
  nameInput: { fontSize: 18, fontWeight: '700', paddingVertical: 8, borderBottomWidth: 1 },
  sectionTitle: { fontSize: 15, fontWeight: '700', marginBottom: 12 },
  exCard: { padding: 14, borderRadius: 14, borderWidth: 0.5, marginBottom: 10 },
  exHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 },
  exNum: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  exNumText: { fontSize: 14, fontWeight: '700' },
  exName: { fontSize: 15, fontWeight: '600' },
  exMuscle: { fontSize: 12, marginTop: 2 },
  exActions: { flexDirection: 'column', gap: 2 },
  moveBtn: { padding: 4 },
  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 8 },
  statItem: { flex: 1, alignItems: 'center' },
  statLabel: { fontSize: 10, fontWeight: '600', letterSpacing: 0.5, marginBottom: 4 },
  statControls: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  statBtn: { width: 28, height: 28, borderRadius: 8, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  statValue: { fontSize: 16, fontWeight: '700', minWidth: 30, textAlign: 'center' },
  statInput: { fontSize: 16, fontWeight: '700', textAlign: 'center', borderBottomWidth: 1, minWidth: 50, paddingVertical: 2 },
  deleteBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-end', padding: 4 },
  deleteText: { fontSize: 12, color: '#F44336', fontWeight: '500' },
  emptyState: { alignItems: 'center', padding: 40, borderRadius: 14, borderWidth: 0.5, gap: 12 },
  emptyText: { fontSize: 14 },
  browseBtn: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10, borderWidth: 1 },
  browseBtnText: { fontSize: 14, fontWeight: '600' },
  saveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16, borderRadius: 14, marginTop: 16 },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
