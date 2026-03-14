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
import { useUserStore } from '../src/store/userStore';
import { useGoalStore } from '../src/store/goalStore';
import { useExerciseStore } from '../src/store/exerciseStore';
import { useWorkoutStore } from '../src/store/workoutStore';
import { MetallicCard } from '../src/components/MetallicCard';

export default function PlanDisplayScreen() {
  const { theme, accentColor } = useThemeStore();
  const { profile } = useUserStore();
  const { secondaryGoal, generatedPlan } = useGoalStore();
  const { saveWorkout } = useExerciseStore();
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  const primaryGoal = profile?.fitnessGoals?.[0] || 'Build Muscle';
  const secondaryLabel = secondaryGoal?.type === 'reduce_bodyfat' ? 'Reduce Body Fat' :
    secondaryGoal?.type === 'build_muscle' ? 'Build Muscle Mass' :
    secondaryGoal?.type === 'increase_frequency' ? 'Increase Frequency' : 'Maintain Health';

  if (!generatedPlan) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={styles.emptyWrap}>
          <Text style={[styles.emptyText, { color: theme.colors.textMuted }]}>No plan generated yet.</Text>
          <TouchableOpacity onPress={() => router.back()} style={[styles.backLink]}>
            <Text style={[styles.backLinkText, { color: accentColor }]}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const estimatedDate = generatedPlan.estimatedCompletionDate
    ? new Date(generatedPlan.estimatedCompletionDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : 'TBD';

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={24} color={theme.colors.textPrimary} />
          </TouchableOpacity>
          <View>
            <Text style={[styles.headerTitle, { color: theme.colors.textPrimary }]}>Your Plan</Text>
            <Text style={[styles.headerSubtitle, { color: theme.colors.textMuted }]}>BALANCED TRAINING PROGRAM</Text>
          </View>
        </View>

        {/* Goal Summary */}
        <MetallicCard style={styles.goalSummary} intensity="medium">
          <View style={styles.goalRow}>
            <View style={styles.goalItem}>
              <Ionicons name="flag" size={20} color={accentColor} />
              <Text style={[styles.goalLabel, { color: theme.colors.textMuted }]}>PRIMARY</Text>
              <Text style={[styles.goalValue, { color: theme.colors.textPrimary }]}>{primaryGoal}</Text>
            </View>
            <View style={[styles.goalDivider, { backgroundColor: theme.colors.cardBorder }]} />
            <View style={styles.goalItem}>
              <Ionicons name="layers" size={20} color={accentColor} />
              <Text style={[styles.goalLabel, { color: theme.colors.textMuted }]}>SECONDARY</Text>
              <Text style={[styles.goalValue, { color: theme.colors.textPrimary }]}>{secondaryLabel}</Text>
            </View>
          </View>
          <View style={[styles.completionRow, { borderTopColor: theme.colors.cardBorder }]}>
            <Ionicons name="time" size={16} color={theme.colors.textMuted} />
            <Text style={[styles.completionText, { color: theme.colors.textMuted }]}>Estimated completion: {estimatedDate}</Text>
          </View>
        </MetallicCard>

        {/* Summary */}
        {generatedPlan.summary && (
          <MetallicCard style={styles.summaryCard}>
            <Text style={[styles.summaryText, { color: theme.colors.textSecondary }]}>{generatedPlan.summary}</Text>
          </MetallicCard>
        )}

        {/* Weekly Split */}
        <Text style={[styles.sectionTitle, { color: theme.colors.textMuted }]}>WEEKLY SPLIT</Text>
        {generatedPlan.weeklySplit.map((day, index) => (
          <MetallicCard key={index} style={styles.dayCard} delay={60 * index} small>
            <View style={styles.dayRow}>
              <View style={[styles.dayBadge, { backgroundColor: day.type === 'training' ? accentColor + '15' : theme.colors.cardSecondary }]}>
                <Text style={[styles.dayBadgeText, { color: day.type === 'training' ? accentColor : theme.colors.textMuted }]}>
                  {day.day.substring(0, 3)}
                </Text>
              </View>
              <View style={styles.dayInfo}>
                <Text style={[styles.dayType, { color: theme.colors.textPrimary }]}>
                  {day.type === 'training' ? (day.muscleGroups?.join(', ') || 'Training') : 'RECOVERY'}
                </Text>
                <View style={styles.dayMeta}>
                  {day.repRange && <Text style={[styles.dayMetaText, { color: theme.colors.textMuted }]}>Reps: {day.repRange}</Text>}
                  {day.duration && <Text style={[styles.dayMetaText, { color: theme.colors.textMuted }]}>{day.duration} min</Text>}
                </View>
                {day.notes && <Text style={[styles.dayNotes, { color: theme.colors.textMuted }]}>{day.notes}</Text>}
              </View>
            </View>
          </MetallicCard>
        ))}

        {/* Cardio */}
        {generatedPlan.cardioRecommendations && (
          <>
            <Text style={[styles.sectionTitle, { color: theme.colors.textMuted, marginTop: 16 }]}>CARDIO RECOMMENDATIONS</Text>
            <MetallicCard style={styles.cardioCard}>
              <View style={styles.cardioRow}>
                <Ionicons name="bicycle" size={22} color={accentColor} />
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={[styles.cardioType, { color: theme.colors.textPrimary }]}>{generatedPlan.cardioRecommendations.type}</Text>
                  <Text style={[styles.cardioDetail, { color: theme.colors.textSecondary }]}>
                    {generatedPlan.cardioRecommendations.durationMinutes} min • {generatedPlan.cardioRecommendations.timesPerWeek}x per week
                  </Text>
                  <Text style={[styles.cardioTiming, { color: theme.colors.textMuted }]}>{generatedPlan.cardioRecommendations.timing}</Text>
                </View>
              </View>
            </MetallicCard>
          </>
        )}

        {/* Focus Areas */}
        {generatedPlan.focusAreas && (
          <>
            <Text style={[styles.sectionTitle, { color: theme.colors.textMuted, marginTop: 16 }]}>KEY FOCUS AREAS</Text>
            <MetallicCard style={styles.focusCard}>
              <View style={styles.focusSection}>
                <Ionicons name="arrow-up-circle" size={18} color={accentColor} />
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={[styles.focusLabel, { color: theme.colors.textMuted }]}>PRIORITY MUSCLES</Text>
                  <Text style={[styles.focusValue, { color: theme.colors.textPrimary }]}>
                    {generatedPlan.focusAreas.priorityMuscles?.join(', ') || 'Balanced'}
                  </Text>
                </View>
              </View>
              <View style={[styles.focusDivider, { backgroundColor: theme.colors.cardBorder }]} />
              <View style={styles.focusSection}>
                <Ionicons name="shield-checkmark" size={18} color={theme.colors.warning || '#D4A746'} />
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={[styles.focusLabel, { color: theme.colors.textMuted }]}>NEEDS MORE RECOVERY</Text>
                  <Text style={[styles.focusValue, { color: theme.colors.textPrimary }]}>
                    {generatedPlan.focusAreas.recoveryMuscles?.join(', ') || 'None flagged'}
                  </Text>
                </View>
              </View>
            </MetallicCard>
          </>
        )}

        {/* Save Button */}
        <TouchableOpacity
          style={[styles.saveBtn, { backgroundColor: isSaved ? '#4CAF50' : accentColor }]}
          onPress={() => {
            if (isSaved) {
              router.replace('/(tabs)/workout');
              return;
            }
            setIsSaving(true);
            try {
              // Parse weekly split and create scheduled workouts
              const dayNameToIndex: Record<string, number> = {
                'Monday': 1, 'Tuesday': 2, 'Wednesday': 3,
                'Thursday': 4, 'Friday': 5, 'Saturday': 6, 'Sunday': 0,
              };

              let savedCount = 0;
              for (const day of generatedPlan.weeklySplit) {
                if (day.type !== 'training') continue;
                
                const dayIndex = dayNameToIndex[day.day];
                if (dayIndex === undefined) continue;

                const muscles = day.muscleGroups || ['Full Body'];
                const workoutName = `${muscles.join(' + ')} (${day.day})`;
                
                // Create a workout template from the plan day
                const exerciseTemplates = muscles.map((muscle: string, i: number) => ({
                  exerciseId: `plan_${day.day}_${i}`,
                  name: `${muscle} Exercise ${i + 1}`,
                  primaryMuscle: muscle,
                  equipment: 'Various',
                  sets: 3,
                  reps: day.repRange || '8-12',
                  restSeconds: 90,
                  notes: day.notes || undefined,
                }));

                saveWorkout({
                  id: `wk_plan_${Date.now()}_${dayIndex}`,
                  name: workoutName,
                  targetMuscles: muscles,
                  exercises: exerciseTemplates,
                  estimatedDuration: day.duration || 45,
                  difficulty: 'intermediate',
                  trainingStyle: profile?.trainingStyle,
                  scheduledDays: [dayIndex],
                  repeatWeekly: true,
                  createdAt: new Date(),
                });
                savedCount++;
              }

              setIsSaved(true);
              setIsSaving(false);
              Alert.alert(
                'Plan Applied!',
                `${savedCount} workouts saved to your weekly schedule. Check My Workouts to see them.`,
                [{ text: 'Go to Workouts', onPress: () => router.replace('/(tabs)/workout') }]
              );
            } catch (e) {
              setIsSaving(false);
              Alert.alert('Error', 'Failed to save plan. Please try again.');
            }
          }}
          activeOpacity={0.8}
          disabled={isSaving}
        >
          {isSaving ? (
            <Text style={styles.saveBtnText}>Saving...</Text>
          ) : isSaved ? (
            <>
              <Ionicons name="checkmark-circle" size={20} color="#fff" />
              <Text style={[styles.saveBtnText, { color: '#fff' }]}>Saved! Go to Workouts</Text>
            </>
          ) : (
            <>
              <Text style={styles.saveBtnText}>Save & Apply to Schedule</Text>
              <Ionicons name="arrow-forward" size={20} color="#000" />
            </>
          )}
        </TouchableOpacity>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollView: { flex: 1 },
  scrollContent: { padding: 20 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 24 },
  backBtn: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 22, fontWeight: '700', letterSpacing: -0.5 },
  headerSubtitle: { fontSize: 12, fontWeight: '600', letterSpacing: 1.5, marginTop: 2 },
  // Goal summary
  goalSummary: { marginBottom: 16 },
  goalRow: { flexDirection: 'row' },
  goalItem: { flex: 1, alignItems: 'center', gap: 6 },
  goalDivider: { width: 1, marginVertical: 4 },
  goalLabel: { fontSize: 10, fontWeight: '600', letterSpacing: 1 },
  goalValue: { fontSize: 14, fontWeight: '700', textAlign: 'center' },
  completionRow: { flexDirection: 'row', alignItems: 'center', gap: 8, borderTopWidth: 0.5, marginTop: 14, paddingTop: 12 },
  completionText: { fontSize: 13, fontWeight: '500' },
  // Summary
  summaryCard: { marginBottom: 20 },
  summaryText: { fontSize: 14, lineHeight: 22 },
  // Sections
  sectionTitle: { fontSize: 12, fontWeight: '600', letterSpacing: 1.5, marginBottom: 12 },
  // Day cards
  dayCard: { marginBottom: 8 },
  dayRow: { flexDirection: 'row', alignItems: 'center' },
  dayBadge: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  dayBadgeText: { fontSize: 13, fontWeight: '700' },
  dayInfo: { flex: 1 },
  dayType: { fontSize: 15, fontWeight: '700', textTransform: 'capitalize' },
  dayMeta: { flexDirection: 'row', gap: 12, marginTop: 3 },
  dayMetaText: { fontSize: 12, fontWeight: '500' },
  dayNotes: { fontSize: 12, marginTop: 3, fontStyle: 'italic' },
  // Cardio
  cardioCard: { marginBottom: 8 },
  cardioRow: { flexDirection: 'row', alignItems: 'center' },
  cardioType: { fontSize: 16, fontWeight: '700' },
  cardioDetail: { fontSize: 14, marginTop: 2 },
  cardioTiming: { fontSize: 12, marginTop: 4, fontStyle: 'italic' },
  // Focus
  focusCard: { marginBottom: 20 },
  focusSection: { flexDirection: 'row', alignItems: 'center', paddingVertical: 4 },
  focusDivider: { height: 0.5, marginVertical: 12 },
  focusLabel: { fontSize: 11, fontWeight: '600', letterSpacing: 0.5 },
  focusValue: { fontSize: 14, fontWeight: '600', marginTop: 2, textTransform: 'capitalize' },
  // Save
  saveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 18, borderRadius: 14, gap: 8, marginTop: 8 },
  saveBtnText: { color: '#000', fontSize: 17, fontWeight: '700' },
  // Empty
  emptyWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  emptyText: { fontSize: 16, textAlign: 'center' },
  backLink: { marginTop: 16 },
  backLinkText: { fontSize: 16, fontWeight: '600' },
  bottomSpacer: { height: 40 },
});
