import React, { useState } from 'react';
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
import { useRouter } from 'expo-router';
import { useThemeStore } from '../src/store/themeStore';
import { WORKOUT_TEMPLATES } from '../src/store/exerciseStore';
import { useExerciseStore } from '../src/store/exerciseStore';
import { useUserStore } from '../src/store/userStore';
import { useWorkoutStore } from '../src/store/workoutStore';
import { STYLE_TEMPLATE_COMPAT } from '../src/utils/trainingHelpers';
import WorkoutEngine from '../src/services/WorkoutEngine';

const CATEGORIES = ['All', 'Push', 'Pull', 'Legs', 'Upper', 'Full Body', 'Bodyweight', 'Strength', 'HIIT', 'Dumbbell'];

export default function WorkoutTemplatesScreen() {
  const router = useRouter();
  const theme = useThemeStore((s) => s.theme);
  const accentColor = useThemeStore((s) => s.accentColor);
  const { profile } = useUserStore();
  const { saveWorkout } = useExerciseStore();
  const { setTodayWorkoutByType } = useWorkoutStore();
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [expandedId, setExpandedId] = useState(null);

  const userStyle = profile?.trainingStyle;
  const styleCompat = userStyle ? STYLE_TEMPLATE_COMPAT[userStyle] : null;

  const getStyleStatus = (tpl) => {
    if (!styleCompat) return 'neutral';
    if (styleCompat.match.includes(tpl.category)) return 'match';
    if (styleCompat.conflict.includes(tpl.category)) return 'conflict';
    return 'neutral';
  };

  const base = selectedCategory === 'All'
    ? WORKOUT_TEMPLATES
    : WORKOUT_TEMPLATES.filter((t) => t.category === selectedCategory);

  const filtered = [...base].sort((a, b) => {
    const order = { match: 0, neutral: 1, conflict: 2 };
    return (order[getStyleStatus(a)] || 1) - (order[getStyleStatus(b)] || 1);
  });

  const getDifficultyColor = (d) => {
    if (d === 'beginner') return '#4CAF50';
    if (d === 'intermediate') return '#FF9800';
    return '#F44336';
  };

  const handleStartNow = (template) => {
    try {
      // Use WorkoutEngine to properly set the workout
      WorkoutEngine.setTodayWorkout({
        title: template.name,
        type: 'full',
        duration: template.duration || 45,
        intensity: template.difficulty || 'moderate',
        targetMuscles: template.targetMuscles || [],
        exercises: template.exercises.map((ex, i) => ({
          id: `tpl_${Date.now()}_${i}`,
          name: ex.name,
          targetMuscles: ex.targetMuscles || [ex.primaryMuscle || 'General'],
          sets: ex.sets || 3,
          reps: ex.reps || '10',
          weight: ex.weight || undefined,
          restSeconds: ex.restSeconds || 90,
          isCompleted: false,
          completedSets: 0,
        })),
      });
      router.replace('/(tabs)/workout');
    } catch (error) {
      Alert.alert('Could Not Start Workout', 'Something went wrong. Please try again.');
      console.error('Start workout failed:', error);
    }
  };

  const handleSave = (template) => {
    try {
      const muscles = template.targetMuscles || [];
      saveWorkout({
        id: `wk_tpl_${Date.now()}`,
        name: template.name,
        targetMuscles: muscles,
        exercises: template.exercises.map((ex, i) => ({
          exerciseId: `tpl_${i}`,
          name: ex.name,
          primaryMuscle: muscles[0] || 'General',
          equipment: template.equipment || 'Various',
          sets: ex.sets,
          reps: String(ex.reps),
          restSeconds: ex.restSeconds,
          notes: ex.notes || undefined,
        })),
        estimatedDuration: template.duration,
        difficulty: template.difficulty,
        trainingStyle: profile?.trainingStyle,
        scheduledDays: [],
        repeatWeekly: false,
        createdAt: new Date(),
      });
      Alert.alert('Saved!', `"${template.name}" added to My Workouts`);
    } catch (e) {
      Alert.alert('Save Failed', 'Could not save workout. Please try again.');
    }
  };

  const handleSchedule = (template) => {
    // Navigate to workout builder with template data for scheduling
    router.push({
      pathname: '/workout-builder',
      params: {
        templateName: template.name,
        templateExercises: JSON.stringify(template.exercises),
      },
    });
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={theme.colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.textPrimary }]}>WORKOUT TEMPLATES</Text>
      </View>

      {/* FIX 1: Proper horizontal ScrollView for category filters */}
      <ScrollView
        horizontal={true}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterContent}
        style={styles.filterRow}
      >
        {CATEGORIES.map((cat) => (
          <TouchableOpacity
            key={cat}
            style={[
              styles.filterChip,
              { borderColor: theme.colors.cardBorder },
              selectedCategory === cat && { backgroundColor: accentColor + '20', borderColor: accentColor },
            ]}
            onPress={() => setSelectedCategory(cat)}
          >
            <Text style={[styles.filterChipText, { color: selectedCategory === cat ? accentColor : theme.colors.textSecondary }]}>{cat}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {filtered.map((template) => {
          const isExpanded = expandedId === template.id;
          return (
            <View key={template.id} style={[styles.templateCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder }]}>
              {/* Style Match/Conflict Tag */}
              {userStyle && getStyleStatus(template) === 'match' && (
                <View style={[styles.styleTag, { backgroundColor: '#4CAF5015' }]}>
                  <Ionicons name="checkmark-circle" size={12} color="#4CAF50" />
                  <Text style={[styles.styleTagText, { color: '#4CAF50' }]}>MATCHES YOUR STYLE</Text>
                </View>
              )}
              {userStyle && getStyleStatus(template) === 'conflict' && (
                <View style={[styles.styleTag, { backgroundColor: '#F4433615' }]}>
                  <Ionicons name="warning" size={12} color="#F44336" />
                  <Text style={[styles.styleTagText, { color: '#F44336' }]}>Doesn't match your {userStyle.replace('_', ' ')} style</Text>
                </View>
              )}
              <TouchableOpacity
                style={styles.templateHeader}
                onPress={() => setExpandedId(isExpanded ? null : template.id)}
                activeOpacity={0.7}
              >
                <View style={{ flex: 1 }}>
                  <View style={styles.templateTitleRow}>
                    <Text style={[styles.templateName, { color: theme.colors.textPrimary }]}>{template.name}</Text>
                    <View style={[styles.diffBadge, { backgroundColor: getDifficultyColor(template.difficulty) + '15' }]}>
                      <Text style={[styles.diffBadgeText, { color: getDifficultyColor(template.difficulty) }]}>{template.difficulty}</Text>
                    </View>
                  </View>
                  <Text style={[styles.templateDesc, { color: theme.colors.textMuted }]}>{template.description}</Text>
                  <View style={styles.templateMeta}>
                    <View style={styles.metaItem}>
                      <Ionicons name="time-outline" size={13} color={theme.colors.textSecondary} />
                      <Text style={[styles.metaText, { color: theme.colors.textSecondary }]}>{template.duration} min</Text>
                    </View>
                    <View style={styles.metaItem}>
                      <Ionicons name="barbell-outline" size={13} color={theme.colors.textSecondary} />
                      <Text style={[styles.metaText, { color: theme.colors.textSecondary }]}>{template.exercises.length} exercises</Text>
                    </View>
                    <View style={styles.metaItem}>
                      <Ionicons name="construct-outline" size={13} color={theme.colors.textSecondary} />
                      <Text style={[styles.metaText, { color: theme.colors.textSecondary }]}>{template.equipment}</Text>
                    </View>
                  </View>
                </View>
                <Ionicons name={isExpanded ? 'chevron-up' : 'chevron-down'} size={20} color={theme.colors.textSecondary} />
              </TouchableOpacity>

              {isExpanded && (
                <View style={styles.templateDetails}>
                  {/* Muscles */}
                  <View style={styles.muscleChips}>
                    {template.targetMuscles.map((m) => (
                      <View key={m} style={[styles.muscleChip, { backgroundColor: accentColor + '15' }]}>
                        <Text style={[styles.muscleChipText, { color: accentColor }]}>{m}</Text>
                      </View>
                    ))}
                  </View>

                  {/* Exercise List */}
                  <View style={[styles.exerciseList, { backgroundColor: theme.colors.backgroundSecondary, borderColor: theme.colors.cardBorder }]}>
                    {template.exercises.map((ex, i) => (
                      <View key={i} style={[styles.exerciseRow, i > 0 && { borderTopWidth: 0.5, borderTopColor: theme.colors.cardBorder }]}>
                        <Text style={[styles.exerciseNum, { color: accentColor }]}>{i + 1}</Text>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.exerciseName, { color: theme.colors.textPrimary }]}>{ex.name}</Text>
                          <Text style={[styles.exerciseSets, { color: theme.colors.textMuted }]}>{ex.sets} x {ex.reps} · {ex.restSeconds}s rest</Text>
                        </View>
                      </View>
                    ))}
                  </View>

                  {/* FIX 2: Three buttons */}
                  <TouchableOpacity
                    style={[styles.primaryBtn, { backgroundColor: accentColor }]}
                    onPress={() => handleStartNow(template)}
                  >
                    <Ionicons name="play-circle" size={20} color="#fff" />
                    <Text style={styles.primaryBtnText}>Start Workout Now</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.secondaryBtn, { borderColor: accentColor }]}
                    onPress={() => handleSave(template)}
                  >
                    <Ionicons name="bookmark-outline" size={18} color={accentColor} />
                    <Text style={[styles.secondaryBtnText, { color: accentColor }]}>Save to My Workouts</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.tertiaryBtn, { borderColor: theme.colors.cardBorder }]}
                    onPress={() => handleSchedule(template)}
                  >
                    <Ionicons name="calendar-outline" size={18} color={theme.colors.textSecondary} />
                    <Text style={[styles.tertiaryBtnText, { color: theme.colors.textSecondary }]}>Schedule for a Day</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.coachBtn, { borderColor: '#7C3AED', backgroundColor: '#7C3AED10' }]}
                    onPress={() => {
                      // Set the template as today's workout first, then navigate to coach
                      try {
                        WorkoutEngine.setTodayWorkout({
                          title: template.name,
                          type: 'full',
                          duration: template.duration || 45,
                          intensity: template.difficulty || 'moderate',
                          targetMuscles: template.targetMuscles || [],
                          exercises: template.exercises.map((ex, i) => ({
                            id: `tpl_coach_${Date.now()}_${i}`,
                            name: ex.name,
                            targetMuscles: ex.targetMuscles || [ex.primaryMuscle || 'General'],
                            sets: ex.sets || 3,
                            reps: ex.reps || '10',
                            weight: ex.weight || undefined,
                            restSeconds: ex.restSeconds || 90,
                            isCompleted: false,
                            completedSets: 0,
                          })),
                        });
                        router.push('/(tabs)/coach');
                      } catch (e) {
                        Alert.alert('Error', 'Could not load template for coach. Please try again.');
                      }
                    }}
                  >
                    <Ionicons name="chatbubbles" size={18} color="#7C3AED" />
                    <Text style={[styles.coachBtnText, { color: '#7C3AED' }]}>Modify with Coach 💬</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          );
        })}

        {filtered.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={[styles.emptyText, { color: theme.colors.textMuted }]}>No templates in this category</Text>
          </View>
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
  filterRow: { flexGrow: 0, flexShrink: 0, marginBottom: 8 },
  filterContent: { paddingHorizontal: 16, paddingVertical: 8, gap: 8 },
  filterChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1, minWidth: 50 },
  filterChipText: { fontSize: 13, fontWeight: '600', textAlign: 'center' },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 40 },
  templateCard: { borderRadius: 14, borderWidth: 0.5, marginBottom: 12, overflow: 'hidden' },
  styleTag: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 6 },
  styleTagText: { fontSize: 11, fontWeight: '700' },
  templateHeader: { flexDirection: 'row', alignItems: 'flex-start', padding: 16, gap: 12 },
  templateTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  templateName: { fontSize: 16, fontWeight: '700' },
  diffBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  diffBadgeText: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },
  templateDesc: { fontSize: 13, lineHeight: 18, marginBottom: 8 },
  templateMeta: { flexDirection: 'row', gap: 16 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 12 },
  templateDetails: { padding: 16, paddingTop: 0 },
  muscleChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 },
  muscleChip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  muscleChipText: { fontSize: 11, fontWeight: '600' },
  exerciseList: { borderRadius: 12, borderWidth: 0.5, overflow: 'hidden', marginBottom: 14 },
  exerciseRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10, gap: 10 },
  exerciseNum: { fontSize: 14, fontWeight: '700', width: 20, textAlign: 'center' },
  exerciseName: { fontSize: 14, fontWeight: '600' },
  exerciseSets: { fontSize: 12, marginTop: 2 },
  // FIX 2: Three button styles
  primaryBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 12, marginBottom: 8 },
  primaryBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  secondaryBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 12, borderWidth: 1.5, marginBottom: 8 },
  secondaryBtnText: { fontSize: 15, fontWeight: '700' },
  tertiaryBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, borderRadius: 12, borderWidth: 1, marginBottom: 8 },
  tertiaryBtnText: { fontSize: 14, fontWeight: '600' },
  coachBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, borderRadius: 12, borderWidth: 1.5 },
  coachBtnText: { fontSize: 14, fontWeight: '700' },
  emptyState: { alignItems: 'center', paddingVertical: 60 },
  emptyText: { fontSize: 14 },
});
