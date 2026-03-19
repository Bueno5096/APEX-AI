import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  Animated,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import Slider from '@react-native-community/slider';
import { useThemeStore } from '../src/store/themeStore';
import { useUserStore } from '../src/store/userStore';
import { useGoalStore, SecondaryGoal, GeneratedPlan } from '../src/store/goalStore';
import { useWorkoutStore } from '../src/store/workoutStore';
import { useHealthStore } from '../src/store/healthStore';
import { kgToLbs } from '../src/store/bodyCompositionStore';
import { MetallicCard } from '../src/components/MetallicCard';
import { apiFetch } from '../src/utils/api';

type GoalType = 'reduce_bodyfat' | 'build_muscle' | 'increase_frequency' | 'maintain_health';
type Timeframe = '6w' | '3m' | '6m' | '1y' | 'custom';

const TIMEFRAME_OPTIONS: { key: Timeframe; label: string; weeks: number }[] = [
  { key: '6w', label: '6 Weeks', weeks: 6 },
  { key: '3m', label: '3 Months', weeks: 13 },
  { key: '6m', label: '6 Months', weeks: 26 },
  { key: '1y', label: '1 Year', weeks: 52 },
  { key: 'custom', label: 'Custom', weeks: 0 },
];

const getBFCategory = (bf: number, gender: string) => {
  if (gender === 'male') {
    if (bf < 14) return 'Athletic';
    if (bf < 18) return 'Fitness';
    if (bf < 25) return 'Average';
    return 'Above Average';
  } else {
    if (bf < 21) return 'Athletic';
    if (bf < 25) return 'Fitness';
    if (bf < 32) return 'Average';
    return 'Above Average';
  }
};

const getFFMICategory = (ffmi: number) => {
  if (ffmi < 18) return 'Below Average';
  if (ffmi < 20) return 'Average';
  if (ffmi < 22) return 'Above Average';
  if (ffmi < 25) return 'Excellent';
  return 'Superior';
};

export default function GoalSetupScreen() {
  const { theme, accentColor, unitSystem } = useThemeStore();
  const { profile, gender } = useUserStore();
  const { setSecondaryGoal, setGeneratedPlan } = useGoalStore();
  const { workoutHistory } = useWorkoutStore();
  const { recoveryData } = useHealthStore();
  const router = useRouter();

  const bodyFat = profile?.bodyFat || 15;
  const weight = profile?.weight || 75;
  const height = profile?.height || 178;
  const primaryGoal = profile?.fitnessGoals?.[0] || 'Build Muscle';
  const frequency = profile?.trainingDaysPerWeek || 4;
  const ffmi = Math.round((weight * (1 - bodyFat / 100)) / ((height / 100) ** 2) * 10) / 10;

  // Determine best goal type
  const suggestedType: GoalType = useMemo(() => {
    const highBF = gender === 'male' ? 25 : 32;
    if (bodyFat > highBF) return 'reduce_bodyfat';
    if (ffmi < 18 && !primaryGoal.includes('Muscle')) return 'build_muscle';
    if (frequency < 3) return 'increase_frequency';
    return 'reduce_bodyfat';
  }, [bodyFat, ffmi, primaryGoal, frequency, gender]);

  const [goalType, setGoalType] = useState<GoalType>(suggestedType);
  const [targetBF, setTargetBF] = useState(Math.max(bodyFat - 5, 8));
  const [targetFFMI, setTargetFFMI] = useState(Math.min(ffmi + 2, 25));
  const [targetFrequency, setTargetFrequency] = useState(Math.min(frequency + 1, 7));
  const [targetWeight, setTargetWeight] = useState('');
  const [timeframe, setTimeframe] = useState<Timeframe>('3m');
  const [customWeeks, setCustomWeeks] = useState('12');
  const [generating, setGenerating] = useState(false);

  const timeframeWeeks = timeframe === 'custom'
    ? (parseInt(customWeeks) || 12)
    : (TIMEFRAME_OPTIONS.find(t => t.key === timeframe)?.weeks || 13);

  const isImperial = unitSystem === 'imperial';

  // Smart target weight suggestion (displays in user's preferred unit)
  useEffect(() => {
    if (goalType === 'reduce_bodyfat') {
      const leanMass = weight * (1 - bodyFat / 100);
      const targetWeightKg = Math.round(leanMass / (1 - targetBF / 100));
      setTargetWeight(String(isImperial ? Math.round(kgToLbs(targetWeightKg)) : targetWeightKg));
    } else if (goalType === 'build_muscle') {
      const targetWeightKg = Math.round(weight * 1.05);
      setTargetWeight(String(isImperial ? Math.round(kgToLbs(targetWeightKg)) : targetWeightKg));
    }
  }, [goalType, targetBF, weight, bodyFat, isImperial]);

  const goalTypeOptions: { key: GoalType; icon: string; label: string }[] = [
    { key: 'reduce_bodyfat', icon: 'trending-down', label: 'Reduce Body Fat' },
    { key: 'build_muscle', icon: 'barbell', label: 'Build Muscle Mass' },
    { key: 'increase_frequency', icon: 'calendar', label: 'Increase Frequency' },
  ];

  // Preview text
  const previewBullets = useMemo(() => {
    const bullets: string[] = [];
    if (goalType === 'reduce_bodyfat') {
      bullets.push(`Target body fat: ${Math.round(targetBF)}% (from ${bodyFat}%)`);
      bullets.push('Add HIIT and steady-state cardio sessions');
      bullets.push('Higher rep ranges (12-20) for metabolic effect');
      bullets.push('Shorter rest periods between sets');
    } else if (goalType === 'build_muscle') {
      bullets.push(`Target FFMI: ${Math.round(targetFFMI * 10) / 10} (from ${ffmi})`);
      bullets.push('Focus on progressive overload with moderate reps (8-12)');
      bullets.push('Prioritize compound movements');
      bullets.push('Adequate recovery between muscle groups');
    } else {
      bullets.push(`Increase to ${targetFrequency} training days per week`);
      bullets.push('Balanced split to avoid overtraining');
      bullets.push('Include active recovery sessions');
    }
    bullets.push(`Estimated timeline: ~${timeframeWeeks} weeks`);
    return bullets;
  }, [goalType, targetBF, targetFFMI, targetFrequency, timeframeWeeks, bodyFat, ffmi]);

  // Generate plan
  const handleActivate = async () => {
    setGenerating(true);

    const targetVal = goalType === 'reduce_bodyfat' ? Math.round(targetBF) :
      goalType === 'build_muscle' ? Math.round(targetFFMI * 10) / 10 : targetFrequency;
    const startVal = goalType === 'reduce_bodyfat' ? bodyFat :
      goalType === 'build_muscle' ? ffmi : frequency;

    const goal: SecondaryGoal = {
      type: goalType,
      targetValue: targetVal,
      startingValue: startVal,
      currentValue: startVal,
      timeframeWeeks,
      startDate: new Date().toISOString(),
      isActive: true,
    };

    // Build prompt for plan generation
    const prompt = `Generate a balanced weekly workout plan in JSON format. The user has:
- Primary goal: ${primaryGoal}
- Secondary goal: ${goalType === 'reduce_bodyfat' ? `Reduce body fat from ${bodyFat}% to ${Math.round(targetBF)}%` : goalType === 'build_muscle' ? `Build muscle (FFMI from ${ffmi} to ${Math.round(targetFFMI * 10) / 10})` : `Increase training from ${frequency} to ${targetFrequency} days/week`}
- Current stats: ${weight}kg, ${height}cm, ${bodyFat}% BF, FFMI ${ffmi}
- Experience: ${profile?.trainingExperience || 'intermediate'}
- Timeframe: ${timeframeWeeks} weeks
- Current frequency: ${frequency} days/week
- Recovery score: ${recoveryData?.score || 75}%

RESPOND ONLY WITH VALID JSON (no markdown, no explanation) in this exact format:
{
  "weeklySplit": [{"day": "Monday", "type": "training", "muscleGroups": ["chest", "triceps"], "repRange": "8-12", "duration": 50, "notes": "Focus on compound lifts"}, {"day": "Tuesday", "type": "recovery", "notes": "Active recovery / light cardio"}],
  "cardioRecommendations": {"type": "HIIT + Steady State", "durationMinutes": 25, "timesPerWeek": 3, "timing": "After strength training or on separate days"},
  "focusAreas": {"priorityMuscles": ["chest", "quads"], "recoveryMuscles": ["shoulders"]},
  "estimatedCompletionDate": "${new Date(Date.now() + timeframeWeeks * 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}",
  "summary": "A balanced plan targeting both goals simultaneously"
}
KEEP ALL ADVICE PURELY PHYSICAL TRAINING. NO NUTRITION OR DIET ADVICE. Respond ONLY with the JSON object.`;

    try {
      const response = await apiFetch('/api/coach/chat', {
        method: 'POST',
        body: JSON.stringify({ message: prompt }),
      });
      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }
      const data = await response.json();

      let plan: GeneratedPlan;
      try {
        // Try to parse JSON from response
        const responseText = data.response || '';
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        plan = JSON.parse(jsonMatch ? jsonMatch[0] : responseText);
      } catch {
        // Fallback plan
        plan = {
          weeklySplit: [
            { day: 'Monday', type: 'training', muscleGroups: ['chest', 'triceps'], repRange: '8-12', duration: 50, notes: 'Push day focus' },
            { day: 'Tuesday', type: 'training', muscleGroups: ['back', 'biceps'], repRange: '8-12', duration: 50, notes: 'Pull day focus' },
            { day: 'Wednesday', type: 'recovery', notes: 'Active recovery / light cardio' },
            { day: 'Thursday', type: 'training', muscleGroups: ['quads', 'hamstrings', 'glutes'], repRange: '6-10', duration: 55, notes: 'Leg day' },
            { day: 'Friday', type: 'training', muscleGroups: ['shoulders', 'arms'], repRange: '10-15', duration: 45, notes: 'Upper body accessories' },
            { day: 'Saturday', type: 'training', muscleGroups: ['full body'], repRange: '12-20', duration: 40, notes: 'Metabolic conditioning' },
            { day: 'Sunday', type: 'recovery', notes: 'Full rest day' },
          ],
          cardioRecommendations: { type: 'HIIT + Steady State', durationMinutes: 25, timesPerWeek: 3, timing: 'After strength training' },
          focusAreas: { priorityMuscles: ['chest', 'quads'], recoveryMuscles: ['shoulders'] },
          estimatedCompletionDate: new Date(Date.now() + timeframeWeeks * 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          summary: `Balanced plan targeting ${primaryGoal} and ${goalType.replace('_', ' ')}`,
        };
      }

      await setSecondaryGoal(goal);
      await setGeneratedPlan(plan);
      setGenerating(false);
      router.replace('/plan-display');
    } catch (e) {
      console.log('Plan generation error:', e);
      setGenerating(false);
    }
  };

  // Loading overlay
  if (generating) {
    return (
      <View style={[styles.loadingOverlay, { backgroundColor: '#000' }]}>
        <ActivityIndicator size="large" color={accentColor} />
        <Text style={[styles.loadingTitle, { color: theme.colors.textPrimary }]}>APEX is building your personalized plan...</Text>
        <Text style={[styles.loadingSubtitle, { color: theme.colors.textMuted }]}>
          Balancing {primaryGoal} + {goalType === 'reduce_bodyfat' ? 'Fat Loss' : goalType === 'build_muscle' ? 'Muscle Building' : 'Higher Frequency'}
        </Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={24} color={theme.colors.textPrimary} />
          </TouchableOpacity>
          <View>
            <Text style={[styles.headerTitle, { color: theme.colors.textPrimary }]}>Set Secondary Goal</Text>
            <Text style={[styles.headerSubtitle, { color: theme.colors.textMuted }]}>GOAL LAYERING</Text>
          </View>
        </View>

        {/* Primary Goal (locked) */}
        <MetallicCard style={styles.primaryGoalCard}>
          <View style={styles.primaryGoalRow}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.primaryLabel, { color: theme.colors.textMuted }]}>PRIMARY GOAL</Text>
              <Text style={[styles.primaryValue, { color: theme.colors.textPrimary }]}>{primaryGoal}</Text>
            </View>
            <Ionicons name="lock-closed" size={18} color={theme.colors.textMuted} />
          </View>
        </MetallicCard>

        {/* Goal Type Selector */}
        <Text style={[styles.sectionLabel, { color: theme.colors.textMuted }]}>SECONDARY GOAL TYPE</Text>
        <View style={styles.goalTypeRow}>
          {goalTypeOptions.map(opt => (
            <TouchableOpacity
              key={opt.key}
              style={[styles.goalTypeBtn, { borderColor: goalType === opt.key ? accentColor : theme.colors.cardBorder, backgroundColor: goalType === opt.key ? accentColor + '15' : theme.colors.card }]}
              onPress={() => setGoalType(opt.key)}
              activeOpacity={0.7}
            >
              <Ionicons name={opt.icon as any} size={20} color={goalType === opt.key ? accentColor : theme.colors.textMuted} />
              <Text style={[styles.goalTypeLabel, { color: goalType === opt.key ? accentColor : theme.colors.textSecondary }]}>{opt.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Goal Parameters */}
        <Text style={[styles.sectionLabel, { color: theme.colors.textMuted }]}>TARGET</Text>
        <MetallicCard style={styles.paramCard}>
          {goalType === 'reduce_bodyfat' && (
            <>
              <View style={styles.sliderHeader}>
                <Text style={[styles.sliderLabel, { color: theme.colors.textSecondary }]}>Target Body Fat</Text>
                <Text style={[styles.sliderValue, { color: accentColor }]}>{Math.round(targetBF)}%</Text>
              </View>
              <Text style={[styles.sliderCategory, { color: theme.colors.textMuted }]}>{getBFCategory(Math.round(targetBF), gender)}</Text>
              <Slider
                style={styles.slider}
                minimumValue={5}
                maximumValue={40}
                value={targetBF}
                onValueChange={setTargetBF}
                minimumTrackTintColor={accentColor}
                maximumTrackTintColor={theme.colors.cardSecondary}
                thumbTintColor={accentColor}
              />
              <View style={styles.sliderRange}>
                <Text style={[styles.rangeText, { color: theme.colors.textMuted }]}>5%</Text>
                <Text style={[styles.rangeText, { color: theme.colors.textMuted }]}>Current: {bodyFat}%</Text>
                <Text style={[styles.rangeText, { color: theme.colors.textMuted }]}>40%</Text>
              </View>
            </>
          )}
          {goalType === 'build_muscle' && (
            <>
              <View style={styles.sliderHeader}>
                <Text style={[styles.sliderLabel, { color: theme.colors.textSecondary }]}>Target FFMI</Text>
                <Text style={[styles.sliderValue, { color: accentColor }]}>{Math.round(targetFFMI * 10) / 10}</Text>
              </View>
              <Text style={[styles.sliderCategory, { color: theme.colors.textMuted }]}>{getFFMICategory(targetFFMI)}</Text>
              <Slider
                style={styles.slider}
                minimumValue={15}
                maximumValue={26}
                step={0.1}
                value={targetFFMI}
                onValueChange={setTargetFFMI}
                minimumTrackTintColor={accentColor}
                maximumTrackTintColor={theme.colors.cardSecondary}
                thumbTintColor={accentColor}
              />
              <View style={styles.sliderRange}>
                <Text style={[styles.rangeText, { color: theme.colors.textMuted }]}>15</Text>
                <Text style={[styles.rangeText, { color: theme.colors.textMuted }]}>Current: {ffmi}</Text>
                <Text style={[styles.rangeText, { color: theme.colors.textMuted }]}>26</Text>
              </View>
            </>
          )}
          {goalType === 'increase_frequency' && (
            <>
              <Text style={[styles.sliderLabel, { color: theme.colors.textSecondary }]}>Weekly Training Days</Text>
              <View style={styles.freqRow}>
                {[frequency, Math.min(frequency + 1, 7), Math.min(frequency + 2, 7)].filter((v, i, a) => a.indexOf(v) === i).map(days => (
                  <TouchableOpacity
                    key={days}
                    style={[styles.freqPill, { borderColor: targetFrequency === days ? accentColor : theme.colors.cardBorder, backgroundColor: targetFrequency === days ? accentColor + '15' : 'transparent' }]}
                    onPress={() => setTargetFrequency(days)}
                  >
                    <Text style={[styles.freqPillText, { color: targetFrequency === days ? accentColor : theme.colors.textSecondary }]}>
                      {days === frequency ? `Keep at ${days} days` : `${days} days`}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={[styles.freqNote, { color: theme.colors.textMuted }]}>More sessions accelerate progress but require adequate recovery</Text>
            </>
          )}
        </MetallicCard>

        {/* Timeframe */}
        <Text style={[styles.sectionLabel, { color: theme.colors.textMuted }]}>TIMEFRAME</Text>
        <View style={styles.timeframeRow}>
          {TIMEFRAME_OPTIONS.map(opt => (
            <TouchableOpacity
              key={opt.key}
              style={[styles.timeframePill, { borderColor: timeframe === opt.key ? accentColor : theme.colors.cardBorder, backgroundColor: timeframe === opt.key ? accentColor + '15' : theme.colors.card }]}
              onPress={() => setTimeframe(opt.key)}
            >
              <Text style={[styles.timeframePillText, { color: timeframe === opt.key ? accentColor : theme.colors.textSecondary }]}>{opt.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
        {timeframe === 'custom' && (
          <View style={styles.customWeeksRow}>
            <TextInput
              style={[styles.customWeeksInput, { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder, color: theme.colors.textPrimary }]}
              value={customWeeks}
              onChangeText={setCustomWeeks}
              keyboardType="numeric"
              placeholder="Weeks"
              placeholderTextColor={theme.colors.textMuted}
            />
            <Text style={[styles.customWeeksLabel, { color: theme.colors.textMuted }]}>weeks</Text>
          </View>
        )}

        {/* Target Weight */}
        {(goalType === 'reduce_bodyfat' || goalType === 'build_muscle') && (
          <>
            <Text style={[styles.sectionLabel, { color: theme.colors.textMuted }]}>TARGET WEIGHT ({isImperial ? 'lbs' : 'kg'})</Text>
            <MetallicCard style={styles.paramCard}>
              <TextInput
                style={[styles.targetWeightInput, { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder, color: theme.colors.textPrimary }]}
                value={targetWeight}
                onChangeText={setTargetWeight}
                keyboardType="numeric"
                placeholder={`Target weight in ${isImperial ? 'lbs' : 'kg'}`}
                placeholderTextColor={theme.colors.textMuted}
              />
            </MetallicCard>
          </>
        )}

        {/* Preview */}
        <Text style={[styles.sectionLabel, { color: theme.colors.textMuted }]}>TRAINING PREVIEW</Text>
        <MetallicCard style={styles.previewCard}>
          <Text style={[styles.previewTitle, { color: theme.colors.textPrimary }]}>Based on your targets, here is your adjusted training focus:</Text>
          {previewBullets.map((bullet, i) => (
            <View key={i} style={styles.previewBullet}>
              <Text style={[styles.bulletDot, { color: accentColor }]}>•</Text>
              <Text style={[styles.bulletText, { color: theme.colors.textSecondary }]}>{bullet}</Text>
            </View>
          ))}
          <Text style={[styles.disclaimer, { color: theme.colors.textMuted }]}>These are estimates based on consistent training. Individual results vary.</Text>
        </MetallicCard>

        {/* Activate Button */}
        <TouchableOpacity style={[styles.activateBtn, { backgroundColor: accentColor }]} onPress={handleActivate} activeOpacity={0.8}>
          <Text style={styles.activateBtnText}>Activate Goal Layering</Text>
          <Ionicons name="arrow-forward" size={20} color="#000" />
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
  // Primary goal
  primaryGoalCard: { marginBottom: 24 },
  primaryGoalRow: { flexDirection: 'row', alignItems: 'center' },
  primaryLabel: { fontSize: 11, fontWeight: '600', letterSpacing: 1 },
  primaryValue: { fontSize: 20, fontWeight: '700', marginTop: 2 },
  // Goal type
  sectionLabel: { fontSize: 12, fontWeight: '600', letterSpacing: 1.5, marginBottom: 12 },
  goalTypeRow: { gap: 10, marginBottom: 24 },
  goalTypeBtn: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 16, paddingHorizontal: 16, borderRadius: 14, borderWidth: 1 },
  goalTypeLabel: { fontSize: 15, fontWeight: '600' },
  // Params
  paramCard: { marginBottom: 24 },
  sliderHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  sliderLabel: { fontSize: 15, fontWeight: '600' },
  sliderValue: { fontSize: 28, fontWeight: '700', letterSpacing: -1 },
  sliderCategory: { fontSize: 13, fontWeight: '500', marginBottom: 8 },
  slider: { width: '100%', height: 44 },
  sliderRange: { flexDirection: 'row', justifyContent: 'space-between' },
  rangeText: { fontSize: 12 },
  // Frequency
  freqRow: { gap: 10, marginTop: 12 },
  freqPill: { paddingVertical: 14, paddingHorizontal: 16, borderRadius: 12, borderWidth: 1, alignItems: 'center' },
  freqPillText: { fontSize: 15, fontWeight: '600' },
  freqNote: { fontSize: 12, marginTop: 10, fontStyle: 'italic' },
  // Timeframe
  timeframeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 12 },
  timeframePill: { paddingVertical: 12, paddingHorizontal: 16, borderRadius: 12, borderWidth: 1 },
  timeframePillText: { fontSize: 14, fontWeight: '600' },
  customWeeksRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 24 },
  customWeeksInput: { borderWidth: 0.5, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, fontWeight: '600', width: 100 },
  customWeeksLabel: { fontSize: 15, fontWeight: '500' },
  targetWeightInput: { borderWidth: 0.5, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 18, fontWeight: '600', textAlign: 'center' },
  // Preview
  previewCard: { marginBottom: 24 },
  previewTitle: { fontSize: 14, fontWeight: '600', marginBottom: 12 },
  previewBullet: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  bulletDot: { fontSize: 16, fontWeight: '700' },
  bulletText: { fontSize: 14, lineHeight: 21, flex: 1 },
  disclaimer: { fontSize: 12, fontStyle: 'italic', marginTop: 12 },
  // Activate
  activateBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 18, borderRadius: 14, gap: 8 },
  activateBtnText: { color: '#000', fontSize: 17, fontWeight: '700' },
  // Loading
  loadingOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  loadingTitle: { fontSize: 18, fontWeight: '700', textAlign: 'center', marginTop: 24 },
  loadingSubtitle: { fontSize: 14, textAlign: 'center', marginTop: 8 },
  bottomSpacer: { height: 40 },
});
