import React, { useState, useEffect, useRef } from 'react';
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
import { useThemeStore } from '../src/store/themeStore';
import { useUserStore } from '../src/store/userStore';
import { useGoalStore } from '../src/store/goalStore';
import { MetallicCard } from '../src/components/MetallicCard';
import Constants from 'expo-constants';

const getBackendUrl = () => {
  const extra = Constants.expoConfig?.extra;
  if (extra?.EXPO_BACKEND_URL) return extra.EXPO_BACKEND_URL;
  return '';
};

// Body comp calculations
const calcBMI = (weightKg: number, heightCm: number) => {
  const heightM = heightCm / 100;
  return Math.round((weightKg / (heightM * heightM)) * 10) / 10;
};

const calcFFMI = (weightKg: number, heightCm: number, bodyFatPct: number) => {
  const leanMass = weightKg * (1 - bodyFatPct / 100);
  const heightM = heightCm / 100;
  return Math.round((leanMass / (heightM * heightM)) * 10) / 10;
};

const getBFCategory = (bf: number, gender: string) => {
  if (gender === 'male') {
    if (bf < 6) return 'Essential';
    if (bf < 14) return 'Athletic';
    if (bf < 18) return 'Fitness';
    if (bf < 25) return 'Average';
    return 'Above Average';
  } else {
    if (bf < 14) return 'Essential';
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

const getBMICategory = (bmi: number) => {
  if (bmi < 18.5) return 'Underweight';
  if (bmi < 25) return 'Normal';
  if (bmi < 30) return 'Overweight';
  return 'Obese';
};

export default function BodyCompositionScreen() {
  const { theme, accentColor } = useThemeStore();
  const { profile, gender } = useUserStore();
  const { secondaryGoal, coachSuggestionDismissed, dismissCoachSuggestion, hasActiveGoalLayeringPlan } = useGoalStore();
  const router = useRouter();

  const [coachMessage, setCoachMessage] = useState<string | null>(null);
  const [coachLoading, setCoachLoading] = useState(true);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  const weight = profile?.weight || 75;
  const height = profile?.height || 178;
  const bodyFat = profile?.bodyFat || 15;
  const age = profile?.age || 28;
  const primaryGoal = profile?.fitnessGoals?.[0] || 'Build Muscle';
  const frequency = profile?.trainingDaysPerWeek || 4;

  const bmi = calcBMI(weight, height);
  const ffmi = calcFFMI(weight, height, bodyFat);
  const leanMass = Math.round(weight * (1 - bodyFat / 100) * 10) / 10;
  const fatMass = Math.round(weight * (bodyFat / 100) * 10) / 10;

  const showSuggestion = !coachSuggestionDismissed && !hasActiveGoalLayeringPlan;

  // Generate coach suggestion
  useEffect(() => {
    if (!showSuggestion) {
      setCoachLoading(false);
      return;
    }
    const generateSuggestion = async () => {
      setCoachLoading(true);
      const highBFThreshold = gender === 'male' ? 25 : 32;
      const lowBFThreshold = gender === 'male' ? 10 : 17;

      let suggestionPrompt = '';
      if (bodyFat > highBFThreshold && (primaryGoal.includes('Muscle') || primaryGoal.includes('Strength') || primaryGoal.includes('Stronger'))) {
        suggestionPrompt = `The user's body fat is ${bodyFat}% (${gender}). Their primary goal is "${primaryGoal}". Suggest they add a secondary goal to reduce body fat to a healthier range while continuing their primary goal. Be concise (2-3 sentences). Mention their exact body fat percentage. Do NOT include action blocks.`;
      } else if (bodyFat < lowBFThreshold) {
        suggestionPrompt = `The user's body fat is very low at ${bodyFat}% (${gender}). Suggest adjusting their training to maintain healthy body composition while pursuing "${primaryGoal}". Be concise (2-3 sentences). Mention their exact body fat percentage. Do NOT include action blocks.`;
      } else if (ffmi < 18 && !primaryGoal.includes('Muscle')) {
        suggestionPrompt = `The user's FFMI is ${ffmi} which has room to grow. Their primary goal is "${primaryGoal}". Suggest adding a muscle building secondary target. Be concise (2-3 sentences). Mention their FFMI. Do NOT include action blocks.`;
      } else if (frequency < 3) {
        suggestionPrompt = `The user trains ${frequency} days per week. Their primary goal is "${primaryGoal}". Suggest increasing workout frequency to accelerate progress. Be concise (2-3 sentences). Do NOT include action blocks.`;
      } else {
        suggestionPrompt = `The user has ${bodyFat}% body fat, FFMI of ${ffmi}, trains ${frequency}x/week. Their goal is "${primaryGoal}". Based on their body composition data, suggest one specific secondary training goal that would complement their primary goal. Be concise (2-3 sentences). Do NOT include action blocks.`;
      }

      try {
        const response = await fetch(`${getBackendUrl()}/api/coach/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: suggestionPrompt }),
        });
        const data = await response.json();
        setCoachMessage(data.response || null);
      } catch {
        setCoachMessage('I can see opportunities to optimize your training. Tap below to explore secondary goal options.');
      } finally {
        setCoachLoading(false);
        // Animate in
        Animated.parallel([
          Animated.timing(fadeAnim, { toValue: 1, duration: 500, delay: 300, useNativeDriver: true }),
          Animated.timing(slideAnim, { toValue: 0, duration: 500, delay: 300, useNativeDriver: true }),
        ]).start();
      }
    };
    generateSuggestion();
  }, [showSuggestion]);

  const MetricCard = ({ icon, label, value, unit, category, categoryColor }: {
    icon: string; label: string; value: string; unit: string; category: string; categoryColor: string;
  }) => (
    <MetallicCard style={styles.metricCard} small>
      <Ionicons name={icon as any} size={22} color={accentColor} />
      <View style={styles.metricValues}>
        <Text style={[styles.metricValue, { color: theme.colors.textPrimary }]}>{value}</Text>
        <Text style={[styles.metricUnit, { color: theme.colors.textMuted }]}>{unit}</Text>
      </View>
      <Text style={[styles.metricLabel, { color: theme.colors.textMuted }]}>{label}</Text>
      <View style={[styles.categoryBadge, { backgroundColor: categoryColor + '20' }]}>
        <Text style={[styles.categoryText, { color: categoryColor }]}>{category}</Text>
      </View>
    </MetallicCard>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Header with back button */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <Ionicons name="chevron-back" size={24} color={theme.colors.textPrimary} />
          </TouchableOpacity>
          <View>
            <Text style={[styles.headerTitle, { color: theme.colors.textPrimary }]}>Body Composition</Text>
            <Text style={[styles.headerSubtitle, { color: theme.colors.textMuted }]}>ANALYSIS</Text>
          </View>
        </View>

        {/* Active Goal Banner */}
        {hasActiveGoalLayeringPlan && secondaryGoal?.isActive && (
          <MetallicCard style={styles.activeGoalBanner} intensity="medium">
            <View style={styles.activeGoalRow}>
              <View style={[styles.activeGoalDot, { backgroundColor: accentColor }]} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.activeGoalLabel, { color: theme.colors.textMuted }]}>ACTIVE SECONDARY GOAL</Text>
                <Text style={[styles.activeGoalValue, { color: theme.colors.textPrimary }]}>
                  {secondaryGoal.type === 'reduce_bodyfat' ? `Target ${secondaryGoal.targetValue}% Body Fat` :
                   secondaryGoal.type === 'build_muscle' ? `Target ${secondaryGoal.targetValue} FFMI` :
                   secondaryGoal.type === 'increase_frequency' ? `${secondaryGoal.targetValue} days/week` :
                   'Maintain healthy levels'}
                </Text>
              </View>
              <TouchableOpacity onPress={() => router.push('/plan-display')}>
                <Text style={[styles.viewPlanLink, { color: accentColor }]}>View Plan</Text>
              </TouchableOpacity>
            </View>
          </MetallicCard>
        )}

        {/* Metrics Grid */}
        <View style={styles.metricsGrid}>
          <MetricCard icon="body" label="Body Fat" value={`${bodyFat}`} unit="%" category={getBFCategory(bodyFat, gender)} categoryColor={bodyFat < (gender === 'male' ? 18 : 25) ? accentColor : theme.colors.warning} />
          <MetricCard icon="fitness" label="FFMI" value={`${ffmi}`} unit="" category={getFFMICategory(ffmi)} categoryColor={ffmi >= 20 ? accentColor : theme.colors.warning} />
          <MetricCard icon="speedometer" label="BMI" value={`${bmi}`} unit="" category={getBMICategory(bmi)} categoryColor={bmi >= 18.5 && bmi < 25 ? accentColor : theme.colors.warning} />
          <MetricCard icon="barbell" label="Lean Mass" value={`${leanMass}`} unit="kg" category={`${fatMass}kg fat`} categoryColor={theme.colors.textMuted} />
        </View>

        {/* Body Comp Breakdown */}
        <MetallicCard style={styles.breakdownCard}>
          <Text style={[styles.breakdownTitle, { color: theme.colors.textMuted }]}>COMPOSITION BREAKDOWN</Text>
          <View style={styles.breakdownBar}>
            <View style={[styles.breakdownLean, { width: `${100 - bodyFat}%`, backgroundColor: accentColor }]} />
            <View style={[styles.breakdownFat, { width: `${bodyFat}%`, backgroundColor: theme.colors.textMuted + '40' }]} />
          </View>
          <View style={styles.breakdownLegend}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: accentColor }]} />
              <Text style={[styles.legendText, { color: theme.colors.textSecondary }]}>Lean Mass {Math.round(100 - bodyFat)}%</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: theme.colors.textMuted + '40' }]} />
              <Text style={[styles.legendText, { color: theme.colors.textSecondary }]}>Fat Mass {bodyFat}%</Text>
            </View>
          </View>
        </MetallicCard>

        {/* Coach Suggestion Card */}
        {showSuggestion && (
          <Animated.View style={[styles.coachSection, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
            <MetallicCard style={styles.coachCard} intensity="medium">
              <View style={styles.coachHeader}>
                <View style={[styles.coachAvatar, { backgroundColor: accentColor + '20' }]}>
                  <Ionicons name="sparkles" size={18} color={accentColor} />
                </View>
                <Text style={[styles.coachName, { color: accentColor }]}>APEX Coach</Text>
              </View>

              {coachLoading ? (
                <View style={styles.coachLoadingWrap}>
                  {[1, 2, 3].map(i => (
                    <View key={i} style={[styles.skeletonLine, { backgroundColor: theme.colors.cardSecondary, width: i === 3 ? '60%' : '100%' }]} />
                  ))}
                  <ActivityIndicator size="small" color={accentColor} style={{ marginTop: 8 }} />
                </View>
              ) : (
                <Text style={[styles.coachText, { color: theme.colors.textSecondary }]}>
                  {coachMessage}
                </Text>
              )}

              <View style={styles.coachActions}>
                <TouchableOpacity
                  style={[styles.coachBtn, { backgroundColor: accentColor }]}
                  onPress={() => router.push('/goal-setup')}
                  activeOpacity={0.8}
                >
                  <Text style={styles.coachBtnText}>Set Secondary Goal</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.coachBtnSecondary, { borderColor: theme.colors.cardBorder }]}
                  onPress={dismissCoachSuggestion}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.coachBtnSecondaryText, { color: theme.colors.textMuted }]}>Maybe Later</Text>
                </TouchableOpacity>
              </View>
            </MetallicCard>
          </Animated.View>
        )}

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
  headerTitle: { fontSize: 24, fontWeight: '700', letterSpacing: -0.5 },
  headerSubtitle: { fontSize: 12, fontWeight: '600', letterSpacing: 1.5, marginTop: 2 },
  // Active goal
  activeGoalBanner: { marginBottom: 20 },
  activeGoalRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  activeGoalDot: { width: 10, height: 10, borderRadius: 5 },
  activeGoalLabel: { fontSize: 11, fontWeight: '600', letterSpacing: 1 },
  activeGoalValue: { fontSize: 16, fontWeight: '700', marginTop: 2 },
  viewPlanLink: { fontSize: 14, fontWeight: '600' },
  // Metrics
  metricsGrid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -5, marginBottom: 16 },
  metricCard: { width: '46%', marginHorizontal: '2%', marginBottom: 10, alignItems: 'center', paddingVertical: 18 },
  metricValues: { flexDirection: 'row', alignItems: 'baseline', marginTop: 8, gap: 2 },
  metricValue: { fontSize: 28, fontWeight: '700', letterSpacing: -1 },
  metricUnit: { fontSize: 14, fontWeight: '600' },
  metricLabel: { fontSize: 11, fontWeight: '600', letterSpacing: 0.5, marginTop: 4 },
  categoryBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, marginTop: 6 },
  categoryText: { fontSize: 11, fontWeight: '700' },
  // Breakdown
  breakdownCard: { marginBottom: 20 },
  breakdownTitle: { fontSize: 12, fontWeight: '600', letterSpacing: 1.5, marginBottom: 12 },
  breakdownBar: { flexDirection: 'row', height: 12, borderRadius: 6, overflow: 'hidden' },
  breakdownLean: { height: '100%', borderTopLeftRadius: 6, borderBottomLeftRadius: 6 },
  breakdownFat: { height: '100%', borderTopRightRadius: 6, borderBottomRightRadius: 6 },
  breakdownLegend: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 13, fontWeight: '500' },
  // Coach suggestion
  coachSection: { marginTop: 4 },
  coachCard: { marginBottom: 0 },
  coachHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  coachAvatar: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  coachName: { fontSize: 13, fontWeight: '700', letterSpacing: 1 },
  coachText: { fontSize: 15, lineHeight: 23 },
  coachLoadingWrap: { gap: 8 },
  skeletonLine: { height: 14, borderRadius: 7 },
  coachActions: { flexDirection: 'row', gap: 10, marginTop: 16 },
  coachBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  coachBtnText: { color: '#000', fontSize: 14, fontWeight: '700' },
  coachBtnSecondary: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center', borderWidth: 1 },
  coachBtnSecondaryText: { fontSize: 14, fontWeight: '600' },
  bottomSpacer: { height: 40 },
});
