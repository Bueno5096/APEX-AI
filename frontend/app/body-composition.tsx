import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Animated,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useThemeStore } from '../src/store/themeStore';
import { useUserStore } from '../src/store/userStore';
import { useGoalStore } from '../src/store/goalStore';
import {
  useBodyCompStore,
  calcAllResults,
  kgToLbs,
  lbsToKg,
  cmToIn,
  inToCm,
  cmToFtIn,
  ftInToCm,
  ActivityLevel,
} from '../src/store/bodyCompositionStore';
import { MetallicCard } from '../src/components/MetallicCard';
import Constants from 'expo-constants';

const getBackendUrl = () => {
  const extra = Constants.expoConfig?.extra;
  if (extra?.EXPO_BACKEND_URL) return extra.EXPO_BACKEND_URL;
  return '';
};

// ─── Input Field Component (MUST be outside main component to prevent keyboard dismissal) ───
const InputField = React.memo(({ label, value, onChangeText, placeholder, infoText, show = true, tooltipField, setTooltipField, theme }: {
  label: string; value: string; onChangeText: (t: string) => void; placeholder: string;
  infoText?: string; show?: boolean; tooltipField: string | null; setTooltipField: (f: string | null) => void; theme: any;
}) => {
  if (!show) return null;
  return (
    <View style={styles.inputGroup}>
      <View style={styles.inputLabelRow}>
        <Text style={[styles.inputLabel, { color: theme.colors.textSecondary }]}>{label}</Text>
        {infoText && (
          <TouchableOpacity onPress={() => setTooltipField(tooltipField === label ? null : label)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="information-circle-outline" size={16} color={theme.colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>
      {tooltipField === label && infoText && (
        <View style={[styles.tooltip, { backgroundColor: theme.colors.cardSecondary, borderColor: theme.colors.cardBorder }]}>
          <Text style={[styles.tooltipText, { color: theme.colors.textSecondary }]}>{infoText}</Text>
        </View>
      )}
      <TextInput
        style={[styles.input, { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder, color: theme.colors.textPrimary }]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.colors.textMuted}
        keyboardType="numeric"
      />
    </View>
  );
});

// ─── Height Imperial Input (ft + in) ───
const HeightImperialInput = React.memo(({ ftValue, inValue, onChangeFt, onChangeIn, theme }: {
  ftValue: string; inValue: string; onChangeFt: (t: string) => void; onChangeIn: (t: string) => void; theme: any;
}) => {
  return (
    <View style={styles.inputGroup}>
      <View style={styles.inputLabelRow}>
        <Text style={[styles.inputLabel, { color: theme.colors.textSecondary }]}>Height (ft / in)</Text>
      </View>
      <View style={styles.ftInRow}>
        <View style={styles.ftInField}>
          <TextInput
            style={[styles.input, { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder, color: theme.colors.textPrimary }]}
            value={ftValue}
            onChangeText={onChangeFt}
            placeholder="5"
            placeholderTextColor={theme.colors.textMuted}
            keyboardType="numeric"
          />
          <Text style={[styles.ftInUnit, { color: theme.colors.textMuted }]}>ft</Text>
        </View>
        <View style={styles.ftInField}>
          <TextInput
            style={[styles.input, { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder, color: theme.colors.textPrimary }]}
            value={inValue}
            onChangeText={onChangeIn}
            placeholder="10"
            placeholderTextColor={theme.colors.textMuted}
            keyboardType="numeric"
          />
          <Text style={[styles.ftInUnit, { color: theme.colors.textMuted }]}>in</Text>
        </View>
      </View>
    </View>
  );
});

const ACTIVITY_OPTIONS: { key: ActivityLevel; label: string }[] = [
  { key: 'sedentary', label: 'Sedentary' },
  { key: 'lightly_active', label: 'Lightly Active' },
  { key: 'moderately_active', label: 'Moderate' },
  { key: 'very_active', label: 'Very Active' },
  { key: 'athlete', label: 'Athlete' },
];

const getBFCategory = (bf: number, gender: string) => {
  if (gender === 'male') {
    if (bf < 6) return 'Essential';
    if (bf < 14) return 'Athletic';
    if (bf < 18) return 'Fitness';
    if (bf < 25) return 'Average';
    return 'Obese';
  }
  if (bf < 14) return 'Essential';
  if (bf < 21) return 'Athletic';
  if (bf < 25) return 'Fitness';
  if (bf < 32) return 'Average';
  return 'Obese';
};

const getFFMICategory = (ffmi: number) => {
  if (ffmi < 17) return 'Below Average';
  if (ffmi < 18) return 'Average';
  if (ffmi < 20) return 'Above Average';
  if (ffmi < 22) return 'Excellent';
  if (ffmi < 23) return 'Superior';
  if (ffmi < 26) return 'Suspiciously High';
  return 'Exceeds Natural';
};

// Lean Mass Adjusted BMI categories
const getBMICategory = (bmi: number) => {
  if (bmi < 14) return 'Significantly Undermuscled';
  if (bmi < 17) return 'Undermuscled';
  if (bmi < 20) return 'Normal';
  if (bmi < 23) return 'Athletic';
  if (bmi < 26) return 'Very Athletic';
  return 'Elite Athletic';
};

const getMFRCategory = (r: number) => {
  if (r < 2) return 'Needs Improvement';
  if (r < 3) return 'Good';
  if (r < 4) return 'Athletic';
  return 'Elite';
};

// BF zone positions for gradient bar
const getBFPosition = (bf: number, gender: string) => {
  const max = gender === 'male' ? 40 : 45;
  return Math.min(Math.max((bf / max) * 100, 2), 98);
};

export default function BodyCompositionScreen() {
  const { theme, accentColor, unitSystem, setUnitSystem } = useThemeStore();
  const { profile, gender } = useUserStore();
  const { secondaryGoal, coachSuggestionDismissed, dismissCoachSuggestion, hasActiveGoalLayeringPlan } = useGoalStore();
  const { measurements, results, history, hasCalculated, setMeasurements, setResults, saveEntry, loadData } = useBodyCompStore();
  const router = useRouter();

  const isImperial = unitSystem === 'imperial';
  const [weight, setWeight] = useState('');
  const [height, setHeight] = useState('');
  const [heightFt, setHeightFt] = useState('');
  const [heightIn, setHeightIn] = useState('');
  const [age, setAge] = useState('');
  const [neck, setNeck] = useState('');
  const [waist, setWaist] = useState('');
  const [hip, setHip] = useState('');
  const [activity, setActivity] = useState<ActivityLevel>(measurements.activityLevel);
  const [showResults, setShowResults] = useState(hasCalculated);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [tooltipField, setTooltipField] = useState<string | null>(null);

  const [coachMessage, setCoachMessage] = useState<string | null>(null);
  const [coachLoading, setCoachLoading] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const resultsFade = useRef(new Animated.Value(hasCalculated ? 1 : 0)).current;

  const isFemale = gender === 'female' || measurements.gender === 'female';
  const showSuggestion = !coachSuggestionDismissed && !hasActiveGoalLayeringPlan;

  // Load data on mount
  useEffect(() => {
    loadData();
  }, []);

  // Pre-fill from profile if no existing measurements
  useEffect(() => {
    if (profile && !measurements.weight) {
      const prefillM = { ...measurements };
      let changed = false;
      if (profile.weight && !measurements.weight) { prefillM.weight = profile.weight; changed = true; }
      if (profile.height && !measurements.height) { prefillM.height = profile.height; changed = true; }
      if (profile.age && !measurements.age) { prefillM.age = profile.age; changed = true; }
      if (profile.gender && !measurements.gender) { prefillM.gender = profile.gender; changed = true; }
      if (changed) setMeasurements(prefillM);
    }
  }, [profile]);

  const [prefilled, setPrefilled] = useState(false);
  useEffect(() => {
    if (profile && (profile.weight || profile.height || profile.age)) {
      setPrefilled(true);
    }
  }, [profile]);

  // Info modal state
  const [infoModalVisible, setInfoModalVisible] = useState(false);
  const [infoModalData, setInfoModalData] = useState<{ title: string; description: string; ranges?: string; whyItMatters?: string; howToUse?: string; scale?: string; note?: string } | null>(null);

  const showInfoModal = (key: string) => {
    const METRIC_INFO: Record<string, typeof infoModalData> = {
      bodyFat: { title: 'What is Body Fat %?', description: 'Body fat percentage is how much of your total body weight is fat. It is calculated using the U.S. Navy method which measures specific body circumferences for a much more accurate result than traditional BMI. Lower is generally better for performance but going too low has health risks.', ranges: 'Healthy ranges: Men 6-24% / Women 14-31%' },
      leanBMI: { title: 'What is Lean BMI?', description: 'Traditional BMI is notoriously inaccurate for people who exercise because it cannot tell the difference between fat and muscle. Lean BMI fixes this by calculating BMI using only your lean body mass — the muscle, bone, and organ weight — excluding fat entirely. This gives a far more accurate picture of your true body composition.', whyItMatters: 'A muscular athlete might have a traditional BMI of 28 which incorrectly labels them overweight. Their Lean BMI of 21 correctly shows they are in the healthy range.' },
      ffmi: { title: 'What is FFMI?', description: 'FFMI measures how muscular you are relative to your height. It is the gold standard metric for tracking muscle building progress over time. Unlike the scale or BMI, FFMI only goes up when you actually build muscle.', scale: '17-18 is average. 20-22 is excellent for a natural athlete. 22-23 is superior. Above 26 is considered to exceed what is typically achievable naturally.', whyItMatters: 'Track this number over months — if it is going up you are building real muscle regardless of what the scale says.' },
      tdee: { title: 'What is TDEE?', description: 'TDEE is the total number of calories your body burns in a day including exercise. It is calculated from your basal metabolic rate (the calories you burn just existing) multiplied by your activity level.', howToUse: 'Use this as a reference point. APEX uses this to understand your energy demands and structure your training accordingly. Note: APEX is a training app — nutrition planning is outside our scope.' },
      idealWeight: { title: 'What is Ideal Weight Range?', description: 'This is the weight range where your body tends to perform best based on your height, frame size, and muscle mass. Unlike traditional ideal weight charts this range is adjusted upward for people with higher muscle mass so athletes are never told they are overweight.', note: 'This is a general guideline. How you feel and perform matters more than a number on the scale.' },
      muscleToFat: { title: 'What is Muscle to Fat Ratio?', description: 'This ratio compares your lean muscle mass to your fat mass. A ratio of 3:1 means you have 3 times more lean mass than fat mass. Higher ratios indicate better body composition regardless of total body weight.', ranges: 'Below 2:1 needs improvement. 2-3:1 is good. 3-4:1 is athletic. Above 4:1 is elite.' },
      compositionBar: { title: 'What does this bar show?', description: 'This bar visually splits your total body weight into lean mass (muscle, bone, organs, water) on the left and fat mass on the right. The goal over time is to see the lean mass side grow larger as you build muscle and reduce body fat through training.' },
    };
    const data = METRIC_INFO[key];
    if (data) {
      setInfoModalData(data);
      setInfoModalVisible(true);
    }
  };

  // Initialize inputs from stored measurements (always metric internally)
  // Re-converts whenever unitSystem changes globally
  useEffect(() => {
    const m = measurements;
    if (isImperial) {
      setWeight(m.weight ? String(kgToLbs(m.weight)) : '');
      const { ft, inches } = cmToFtIn(m.height);
      setHeightFt(String(ft));
      setHeightIn(String(inches));
      setHeight('');
      setNeck(m.neck ? String(cmToIn(m.neck)) : '');
      setWaist(m.waist ? String(cmToIn(m.waist)) : '');
      setHip(m.hip ? String(cmToIn(m.hip)) : '');
    } else {
      setWeight(m.weight ? String(m.weight) : '');
      setHeight(m.height ? String(m.height) : '');
      setHeightFt('');
      setHeightIn('');
      setNeck(m.neck ? String(m.neck) : '');
      setWaist(m.waist ? String(m.waist) : '');
      setHip(m.hip ? String(m.hip) : '');
    }
    setAge(m.age ? String(m.age) : '');
    setActivity(m.activityLevel);
  }, [measurements, unitSystem]);

  // Toggle unit — updates global store, useEffect above re-converts display values
  const toggleUnit = (newUnit: 'metric' | 'imperial') => {
    if (newUnit === unitSystem) return;
    // Save current inputs to metric in store before switching
    const currentMetric = inputsToMetric();
    if (currentMetric) setMeasurements(currentMetric);
    setUnitSystem(newUnit);
  };

  // Helper: convert current display inputs to metric measurements object
  const inputsToMetric = () => {
    const w = parseFloat(weight) || 0;
    const a = parseInt(age) || 0;
    const n = parseFloat(neck) || 0;
    const wa = parseFloat(waist) || 0;
    const hi = parseFloat(hip) || 0;
    let hCm: number;
    if (isImperial) {
      const ft = parseInt(heightFt) || 0;
      const inches = parseInt(heightIn) || 0;
      hCm = inToCm((ft * 12) + inches);
    } else {
      hCm = parseFloat(height) || 0;
    }
    return {
      weight: isImperial ? lbsToKg(w) : w,
      height: hCm,
      age: a,
      gender: isFemale ? 'female' : 'male',
      neck: isImperial ? inToCm(n) : n,
      waist: isImperial ? inToCm(wa) : wa,
      hip: isImperial ? inToCm(hi) : hi,
      activityLevel: activity,
    };
  };

  // Calculate — always converts inputs to metric before running Navy formula
  const handleCalculate = () => {
    const m = inputsToMetric();
    if (!m.weight || !m.height || !m.age || !m.neck || !m.waist) {
      Alert.alert('Missing Info', 'Please fill in weight, height, age, neck, and waist measurements.');
      return;
    }
    if (isFemale && !m.hip) {
      Alert.alert('Missing Info', 'Please fill in hip measurement.');
      return;
    }

    setMeasurements(m);
    const r = calcAllResults(m);
    setResults(r);
    setShowResults(true);

    // Animate results in
    resultsFade.setValue(0);
    Animated.timing(resultsFade, { toValue: 1, duration: 600, useNativeDriver: true }).start();

    // Generate coach suggestion
    if (showSuggestion) fetchCoachSuggestion(r);
  };

  // Coach suggestion
  const fetchCoachSuggestion = async (r: any) => {
    setCoachLoading(true);
    const primaryGoal = profile?.fitnessGoals?.[0] || 'Build Muscle';
    const prompt = `The user just calculated their body composition. Results: ${r.bodyFatPercent}% body fat (${gender}), FFMI ${r.ffmi}, BMI ${r.bmi}. Their primary goal is "${primaryGoal}". Based on these results, suggest ONE specific secondary training goal that would complement their primary goal. Be concise (2-3 sentences). Do NOT include action blocks. Keep advice purely physical training only — no nutrition or diet advice.`;
    try {
      const resp = await fetch(`${getBackendUrl()}/api/coach/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: prompt }),
      });
      const data = await resp.json();
      setCoachMessage(data.response || null);
    } catch {
      setCoachMessage('I can see opportunities to optimize your training. Tap below to explore secondary goal options.');
    } finally {
      setCoachLoading(false);
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 500, delay: 300, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 0, duration: 500, delay: 300, useNativeDriver: true }),
      ]).start();
    }
  };

  // Save
  const handleSave = async () => {
    if (!results) return;
    setSaving(true);
    await saveEntry();
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const displayWeight = (kg: number) => isImperial ? `${kgToLbs(kg)} lbs` : `${kg} kg`;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {/* Header */}
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
          <MetallicCard style={styles.goalBanner} intensity="medium">
            <View style={styles.goalBannerRow}>
              <View style={[styles.goalDot, { backgroundColor: accentColor }]} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.goalBannerLabel, { color: theme.colors.textMuted }]}>ACTIVE SECONDARY GOAL</Text>
                <Text style={[styles.goalBannerValue, { color: theme.colors.textPrimary }]}>
                  {secondaryGoal.type === 'reduce_bodyfat' ? `Target ${secondaryGoal.targetValue}% Body Fat` :
                   secondaryGoal.type === 'build_muscle' ? `Target ${secondaryGoal.targetValue} FFMI` :
                   `${secondaryGoal.targetValue} days/week`}
                </Text>
              </View>
              <TouchableOpacity onPress={() => router.push('/plan-display')}>
                <Text style={[styles.viewPlanLink, { color: accentColor }]}>View Plan</Text>
              </TouchableOpacity>
            </View>
          </MetallicCard>
        )}

        {/* ═══ SECTION 1: Measurements Input ═══ */}
        <MetallicCard style={styles.inputCard}>
          {/* Unit Toggle */}
          <View style={[styles.unitToggle, { backgroundColor: theme.colors.cardSecondary }]}>
            <TouchableOpacity
              style={[styles.unitBtn, isImperial && { backgroundColor: accentColor + '20', borderColor: accentColor }]}
              onPress={() => toggleUnit('imperial')}
            >
              <Text style={[styles.unitBtnText, { color: isImperial ? accentColor : theme.colors.textMuted }]}>Imperial (lbs/ft)</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.unitBtn, !isImperial && { backgroundColor: accentColor + '20', borderColor: accentColor }]}
              onPress={() => toggleUnit('metric')}
            >
              <Text style={[styles.unitBtnText, { color: !isImperial ? accentColor : theme.colors.textMuted }]}>Metric (kg/cm)</Text>
            </TouchableOpacity>
          </View>

          {/* Weight row */}
          <InputField label={`Weight (${isImperial ? 'lbs' : 'kg'})`} value={weight} onChangeText={setWeight} placeholder="0" theme={theme} tooltipField={tooltipField} setTooltipField={setTooltipField} />

          {prefilled && weight && (
            <Text style={[styles.prefilledNote, { color: theme.colors.textMuted }]}>Pre-filled from your profile — tap to edit</Text>
          )}

          {/* Height: ft/in in imperial, cm in metric */}
          {isImperial ? (
            <HeightImperialInput ftValue={heightFt} inValue={heightIn} onChangeFt={setHeightFt} onChangeIn={setHeightIn} theme={theme} />
          ) : (
            <InputField label="Height (cm)" value={height} onChangeText={setHeight} placeholder="0" theme={theme} tooltipField={tooltipField} setTooltipField={setTooltipField} />
          )}

          <InputField label="Age" value={age} onChangeText={setAge} placeholder="0" theme={theme} tooltipField={tooltipField} setTooltipField={setTooltipField} />
          <View style={styles.inputsGrid}>
            <InputField label={`Neck (${isImperial ? 'in' : 'cm'})`} value={neck} onChangeText={setNeck} placeholder="0" infoText="Measure around the narrowest part of your neck" theme={theme} tooltipField={tooltipField} setTooltipField={setTooltipField} />
            <InputField label={`Waist (${isImperial ? 'in' : 'cm'})`} value={waist} onChangeText={setWaist} placeholder="0" infoText="Measure around your navel at its widest point" theme={theme} tooltipField={tooltipField} setTooltipField={setTooltipField} />
          </View>
          <InputField label={`Hip (${isImperial ? 'in' : 'cm'})`} value={hip} onChangeText={setHip} placeholder="0" show={isFemale} infoText="Measure around the widest part of your hips" theme={theme} tooltipField={tooltipField} setTooltipField={setTooltipField} />

          {/* Activity Level */}
          <Text style={[styles.inputLabel, { color: theme.colors.textSecondary, marginTop: 12 }]}>Activity Level</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.activityScroll}>
            <View style={styles.activityRow}>
              {ACTIVITY_OPTIONS.map(opt => (
                <TouchableOpacity
                  key={opt.key}
                  style={[styles.activityPill, { borderColor: activity === opt.key ? accentColor : theme.colors.cardBorder, backgroundColor: activity === opt.key ? accentColor + '15' : 'transparent' }]}
                  onPress={() => setActivity(opt.key)}
                >
                  <Text style={[styles.activityPillText, { color: activity === opt.key ? accentColor : theme.colors.textMuted }]}>{opt.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          {/* Calculate Button */}
          <TouchableOpacity style={[styles.calcBtn, { backgroundColor: accentColor }]} onPress={handleCalculate} activeOpacity={0.8}>
            <Text style={styles.calcBtnText}>Calculate</Text>
          </TouchableOpacity>
        </MetallicCard>

        {/* ═══ RESULTS (shown after calculate) ═══ */}
        {showResults && results && (
          <Animated.View style={{ opacity: resultsFade }}>
            {/* ═══ SECTION 2: Enhanced Body Fat Card ═══ */}
            <MetallicCard style={styles.resultCard} delay={0}>
              <View style={styles.resultHeader}>
                <Ionicons name="body" size={22} color={accentColor} />
                <Text style={[styles.resultTitle, { color: theme.colors.textMuted }]}>BODY FAT</Text>
                <TouchableOpacity onPress={() => showInfoModal('bodyFat')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Text style={[styles.infoIcon, { color: theme.colors.textMuted }]}>ⓘ</Text>
                </TouchableOpacity>
              </View>
              <Text style={[styles.bigValue, { color: theme.colors.textPrimary }]}>{results.bodyFatPercent}%</Text>
              <Text style={[styles.categoryLabel, { color: accentColor }]}>{getBFCategory(results.bodyFatPercent, gender)}</Text>
              {/* Warning for extreme values */}
              {results.bodyFatWarning && (
                <View style={[styles.warningBanner, { backgroundColor: '#F4433620', borderColor: '#F44336' }]}>
                  <Ionicons name="warning" size={16} color="#F44336" />
                  <Text style={[styles.warningText, { color: '#F44336' }]}>{results.bodyFatWarning}</Text>
                </View>
              )}
              {/* Gradient zone bar */}
              <View style={styles.zoneBar}>
                <View style={[styles.zone, { flex: 1, backgroundColor: '#4A90D9' }]} />
                <View style={[styles.zone, { flex: 1.2, backgroundColor: '#4CAF50' }]} />
                <View style={[styles.zone, { flex: 1, backgroundColor: '#8BC34A' }]} />
                <View style={[styles.zone, { flex: 1.5, backgroundColor: '#FFC107' }]} />
                <View style={[styles.zone, { flex: 1, backgroundColor: '#F44336' }]} />
                {/* Marker */}
                <View style={[styles.zoneMarker, { left: `${getBFPosition(results.bodyFatPercent, gender)}%`, borderColor: theme.colors.textPrimary }]} />
              </View>
              <View style={styles.zoneLabels}>
                <Text style={[styles.zoneLabelText, { color: theme.colors.textMuted }]}>Essential</Text>
                <Text style={[styles.zoneLabelText, { color: theme.colors.textMuted }]}>Athletic</Text>
                <Text style={[styles.zoneLabelText, { color: theme.colors.textMuted }]}>Fitness</Text>
                <Text style={[styles.zoneLabelText, { color: theme.colors.textMuted }]}>Average</Text>
                <Text style={[styles.zoneLabelText, { color: theme.colors.textMuted }]}>Obese</Text>
              </View>
            </MetallicCard>

            {/* ═══ Enhanced FFMI Card ═══ */}
            <MetallicCard style={styles.resultCard} delay={80}>
              <View style={styles.resultHeader}>
                <Ionicons name="fitness" size={22} color={accentColor} />
                <Text style={[styles.resultTitle, { color: theme.colors.textMuted }]}>FFMI</Text>
                <TouchableOpacity onPress={() => showInfoModal('ffmi')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Text style={[styles.infoIcon, { color: theme.colors.textMuted }]}>ⓘ</Text>
                </TouchableOpacity>
              </View>
              <Text style={[styles.bigValue, { color: theme.colors.textPrimary }]}>{results.ffmi}</Text>
              <Text style={[styles.categoryLabel, { color: accentColor }]}>{getFFMICategory(results.ffmi)}</Text>
              {/* Category breakdown */}
              <View style={styles.ffmiBreakdown}>
                {[
                  { label: '< 17', cat: 'Below Avg', min: 0, max: 17 },
                  { label: '17-18', cat: 'Average', min: 17, max: 18 },
                  { label: '18-20', cat: 'Above Avg', min: 18, max: 20 },
                  { label: '20-22', cat: 'Excellent', min: 20, max: 22 },
                  { label: '22-23', cat: 'Superior', min: 22, max: 23 },
                  { label: '23-26', cat: 'Suspicious', min: 23, max: 26 },
                  { label: '26+', cat: 'Exceeds', min: 26, max: 99 },
                ].map((item, i) => {
                  const isActive = results.ffmi >= item.min && results.ffmi < item.max;
                  return (
                    <View key={i} style={[styles.ffmiItem, isActive && { backgroundColor: accentColor + '15', borderColor: accentColor }]}>
                      <Text style={[styles.ffmiRange, { color: isActive ? accentColor : theme.colors.textMuted }]}>{item.label}</Text>
                      <Text style={[styles.ffmiCat, { color: isActive ? accentColor : theme.colors.textMuted }]}>{item.cat}</Text>
                    </View>
                  );
                })}
              </View>
              <Text style={[styles.ffmiNote, { color: theme.colors.textMuted }]}>Most natural athletes peak around 22-25</Text>
            </MetallicCard>

            {/* Lean BMI Card */}
            <MetallicCard style={styles.resultCard} delay={160}>
              <View style={styles.resultHeader}>
                <Ionicons name="speedometer" size={22} color={accentColor} />
                <Text style={[styles.resultTitle, { color: theme.colors.textMuted }]}>LEAN BMI</Text>
                <TouchableOpacity onPress={() => showInfoModal('leanBMI')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Text style={[styles.infoIcon, { color: theme.colors.textMuted }]}>ⓘ</Text>
                </TouchableOpacity>
              </View>
              <Text style={[styles.bigValue, { color: theme.colors.textPrimary }]}>{results.bmi}</Text>
              <Text style={[styles.categoryLabel, { color: accentColor }]}>{getBMICategory(results.bmi)}</Text>
              <Text style={[styles.leanBmiNote, { color: theme.colors.textMuted }]}>
                Unlike traditional BMI, this calculation is adjusted for your actual muscle mass — giving a far more accurate assessment of your body composition
              </Text>
            </MetallicCard>

            {/* Lean Mass Card */}
            <MetallicCard style={styles.resultCard} delay={240}>
              <View style={styles.resultHeader}>
                <Ionicons name="barbell" size={22} color={accentColor} />
                <Text style={[styles.resultTitle, { color: theme.colors.textMuted }]}>LEAN MASS</Text>
              </View>
              <Text style={[styles.bigValue, { color: theme.colors.textPrimary }]}>{displayWeight(results.leanMassKg)}</Text>
              <Text style={[styles.categoryLabel, { color: theme.colors.textMuted }]}>{displayWeight(results.fatMassKg)} fat</Text>
            </MetallicCard>

            {/* Composition Breakdown Bar */}
            <MetallicCard style={styles.resultCard} delay={320}>
              <View style={styles.resultHeader}>
                <Text style={[styles.resultTitle, { color: theme.colors.textMuted }]}>COMPOSITION BREAKDOWN</Text>
                <TouchableOpacity onPress={() => showInfoModal('compositionBar')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Text style={[styles.infoIcon, { color: theme.colors.textMuted }]}>ⓘ</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.breakdownBar}>
                <View style={[styles.breakdownLean, { width: `${100 - results.bodyFatPercent}%`, backgroundColor: accentColor }]} />
                <View style={[styles.breakdownFat, { width: `${results.bodyFatPercent}%`, backgroundColor: theme.colors.textMuted + '40' }]} />
              </View>
              <View style={styles.breakdownLegend}>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: accentColor }]} />
                  <Text style={[styles.legendText, { color: theme.colors.textSecondary }]}>Lean {Math.round(100 - results.bodyFatPercent)}%</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: theme.colors.textMuted + '40' }]} />
                  <Text style={[styles.legendText, { color: theme.colors.textSecondary }]}>Fat {results.bodyFatPercent}%</Text>
                </View>
              </View>
            </MetallicCard>

            {/* ═══ SECTION 3: TDEE Card ═══ */}
            <MetallicCard style={styles.resultCard} delay={400}>
              <View style={styles.resultHeader}>
                <Ionicons name="flame" size={22} color={accentColor} />
                <Text style={[styles.resultTitle, { color: theme.colors.textMuted }]}>DAILY CALORIES</Text>
                <TouchableOpacity onPress={() => showInfoModal('tdee')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Text style={[styles.infoIcon, { color: theme.colors.textMuted }]}>ⓘ</Text>
                </TouchableOpacity>
              </View>
              <Text style={[styles.tdeeSubtitle, { color: theme.colors.textMuted }]}>Estimated calories burned per day</Text>
              <Text style={[styles.bigValue, { color: theme.colors.textPrimary }]}>{results.tdee}</Text>
              <Text style={[styles.categoryLabel, { color: theme.colors.textMuted }]}>kcal/day</Text>
              <View style={styles.tdeeRow}>
                <View style={[styles.tdeeCard, { backgroundColor: theme.colors.cardSecondary }]}>
                  <Text style={[styles.tdeeLabel, { color: theme.colors.textMuted }]}>Cut</Text>
                  <Text style={[styles.tdeeVal, { color: theme.colors.textPrimary }]}>{results.tdee - 500}</Text>
                </View>
                <View style={[styles.tdeeCard, { backgroundColor: accentColor + '15', borderColor: accentColor, borderWidth: 1 }]}>
                  <Text style={[styles.tdeeLabel, { color: accentColor }]}>Maintain</Text>
                  <Text style={[styles.tdeeVal, { color: accentColor }]}>{results.tdee}</Text>
                </View>
                <View style={[styles.tdeeCard, { backgroundColor: theme.colors.cardSecondary }]}>
                  <Text style={[styles.tdeeLabel, { color: theme.colors.textMuted }]}>Bulk</Text>
                  <Text style={[styles.tdeeVal, { color: theme.colors.textPrimary }]}>{results.tdee + 300}</Text>
                </View>
              </View>
            </MetallicCard>

            {/* ═══ Ideal Weight Card ═══ */}
            <MetallicCard style={styles.resultCard} delay={480}>
              <View style={styles.resultHeader}>
                <Ionicons name="scale" size={22} color={accentColor} />
                <Text style={[styles.resultTitle, { color: theme.colors.textMuted }]}>IDEAL WEIGHT</Text>
                <TouchableOpacity onPress={() => showInfoModal('idealWeight')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Text style={[styles.infoIcon, { color: theme.colors.textMuted }]}>ⓘ</Text>
                </TouchableOpacity>
              </View>
              <Text style={[styles.tdeeSubtitle, { color: theme.colors.textMuted }]}>Based on your height and frame</Text>
              <Text style={[styles.bigValue, { color: theme.colors.textPrimary }]}>
                {displayWeight(results.idealWeightMinKg)} - {displayWeight(results.idealWeightMaxKg)}
              </Text>
              <Text style={[styles.idealNote, { color: theme.colors.textMuted }]}>
                This range accounts for natural variation in bone density and muscle mass
              </Text>
            </MetallicCard>

            {/* ═══ Muscle to Fat Ratio Card ═══ */}
            <MetallicCard style={styles.resultCard} delay={560}>
              <View style={styles.resultHeader}>
                <Ionicons name="analytics" size={22} color={accentColor} />
                <Text style={[styles.resultTitle, { color: theme.colors.textMuted }]}>MUSCLE TO FAT RATIO</Text>
                <TouchableOpacity onPress={() => showInfoModal('muscleToFat')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Text style={[styles.infoIcon, { color: theme.colors.textMuted }]}>ⓘ</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.mfrBarContainer}>
                <View style={[styles.mfrLean, { width: `${100 - results.bodyFatPercent}%`, backgroundColor: accentColor }]}>
                  <Text style={[styles.mfrBarText, { color: '#000' }]}>Lean</Text>
                </View>
                <View style={[styles.mfrFat, { width: `${results.bodyFatPercent}%`, backgroundColor: theme.colors.textMuted + '40' }]}>
                  <Text style={[styles.mfrBarText, { color: theme.colors.textSecondary }]}>Fat</Text>
                </View>
              </View>
              <Text style={[styles.bigValue, { color: theme.colors.textPrimary }]}>{results.muscleToFatRatio} : 1</Text>
              <Text style={[styles.categoryLabel, { color: accentColor }]}>{getMFRCategory(results.muscleToFatRatio)}</Text>
            </MetallicCard>

            {/* ═══ Coach Suggestion ═══ */}
            {showSuggestion && coachMessage && (
              <Animated.View style={[styles.coachSection, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
                <MetallicCard style={styles.coachCard} intensity="medium">
                  <View style={styles.coachHeader}>
                    <View style={[styles.coachAvatar, { backgroundColor: accentColor + '20' }]}>
                      <Ionicons name="sparkles" size={18} color={accentColor} />
                    </View>
                    <Text style={[styles.coachName, { color: accentColor }]}>APEX Coach</Text>
                  </View>
                  {coachLoading ? (
                    <View style={styles.skeletonWrap}>
                      {[1, 2, 3].map(i => (
                        <View key={i} style={[styles.skeletonLine, { backgroundColor: theme.colors.cardSecondary, width: i === 3 ? '60%' : '100%' }]} />
                      ))}
                      <ActivityIndicator size="small" color={accentColor} style={{ marginTop: 8 }} />
                    </View>
                  ) : (
                    <Text style={[styles.coachText, { color: theme.colors.textSecondary }]}>{coachMessage}</Text>
                  )}
                  <View style={styles.coachActions}>
                    <TouchableOpacity style={[styles.coachBtn, { backgroundColor: accentColor }]} onPress={() => router.push('/goal-setup')} activeOpacity={0.8}>
                      <Text style={styles.coachBtnText}>Set Secondary Goal</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.coachBtnSec, { borderColor: theme.colors.cardBorder }]} onPress={dismissCoachSuggestion} activeOpacity={0.7}>
                      <Text style={[styles.coachBtnSecText, { color: theme.colors.textMuted }]}>Maybe Later</Text>
                    </TouchableOpacity>
                  </View>
                </MetallicCard>
              </Animated.View>
            )}

            {/* ═══ SECTION 4: Composition History ═══ */}
            <Text style={[styles.sectionTitle, { color: theme.colors.textMuted }]}>COMPOSITION HISTORY</Text>
            {history.length === 0 ? (
              <MetallicCard style={styles.emptyHistoryCard}>
                <Text style={[styles.emptyHistoryText, { color: theme.colors.textMuted }]}>
                  Save your measurements to start tracking your progress over time
                </Text>
              </MetallicCard>
            ) : (
              history.slice(0, 6).map((entry, index) => {
                const prevEntry = history[index + 1];
                const trend = prevEntry ? (entry.results.bodyFatPercent < prevEntry.results.bodyFatPercent ? 'down' : entry.results.bodyFatPercent > prevEntry.results.bodyFatPercent ? 'up' : 'same') : 'same';
                return (
                  <MetallicCard key={index} style={styles.historyCard} delay={60 * index} small>
                    <View style={styles.historyRow}>
                      <Text style={[styles.historyDate, { color: theme.colors.textSecondary }]}>{formatDate(entry.date)}</Text>
                      <Text style={[styles.historyVal, { color: theme.colors.textPrimary }]}>{entry.results.bodyFatPercent}%</Text>
                      <Text style={[styles.historyVal, { color: theme.colors.textPrimary }]}>{displayWeight(entry.measurements.weight)}</Text>
                      <Text style={[styles.historyVal, { color: theme.colors.textPrimary }]}>{entry.results.ffmi}</Text>
                      <Ionicons
                        name={trend === 'down' ? 'arrow-down' : trend === 'up' ? 'arrow-up' : 'remove'}
                        size={16}
                        color={trend === 'down' ? '#4CAF50' : trend === 'up' ? '#F44336' : theme.colors.textMuted}
                      />
                    </View>
                  </MetallicCard>
                );
              })
            )}

            {/* ═══ SECTION 5: Save Button ═══ */}
            <TouchableOpacity
              style={[styles.saveBtn, { backgroundColor: saved ? '#4CAF50' : accentColor }]}
              onPress={handleSave}
              activeOpacity={0.8}
              disabled={saving || saved}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#000" />
              ) : saved ? (
                <>
                  <Ionicons name="checkmark" size={20} color="#000" />
                  <Text style={styles.saveBtnText}>Saved!</Text>
                </>
              ) : (
                <Text style={styles.saveBtnText}>Save Measurements</Text>
              )}
            </TouchableOpacity>
          </Animated.View>
        )}

        <View style={styles.bottomSpacer} />
      </ScrollView>
      </KeyboardAvoidingView>
      
      {/* Info Modal */}
      {infoModalVisible && infoModalData && (
        <TouchableOpacity 
          style={styles.infoModalOverlay}
          activeOpacity={1}
          onPress={() => setInfoModalVisible(false)}
        >
          <View style={[styles.infoModalContent, { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder }]}>
            <Text style={[styles.infoModalTitle, { color: accentColor }]}>{infoModalData.title}</Text>
            <Text style={[styles.infoModalDesc, { color: theme.colors.textPrimary }]}>{infoModalData.description}</Text>
            {infoModalData.ranges && (
              <View style={[styles.infoModalSection, { backgroundColor: theme.colors.backgroundSecondary }]}>
                <Text style={[styles.infoModalSectionText, { color: theme.colors.textSecondary }]}>{infoModalData.ranges}</Text>
              </View>
            )}
            {infoModalData.scale && (
              <View style={[styles.infoModalSection, { backgroundColor: theme.colors.backgroundSecondary }]}>
                <Text style={[styles.infoModalSectionLabel, { color: theme.colors.textMuted }]}>Scale</Text>
                <Text style={[styles.infoModalSectionText, { color: theme.colors.textSecondary }]}>{infoModalData.scale}</Text>
              </View>
            )}
            {infoModalData.whyItMatters && (
              <View style={[styles.infoModalSection, { backgroundColor: theme.colors.backgroundSecondary }]}>
                <Text style={[styles.infoModalSectionLabel, { color: theme.colors.textMuted }]}>Why It Matters</Text>
                <Text style={[styles.infoModalSectionText, { color: theme.colors.textSecondary }]}>{infoModalData.whyItMatters}</Text>
              </View>
            )}
            {infoModalData.howToUse && (
              <View style={[styles.infoModalSection, { backgroundColor: theme.colors.backgroundSecondary }]}>
                <Text style={[styles.infoModalSectionLabel, { color: theme.colors.textMuted }]}>How To Use</Text>
                <Text style={[styles.infoModalSectionText, { color: theme.colors.textSecondary }]}>{infoModalData.howToUse}</Text>
              </View>
            )}
            {infoModalData.note && (
              <Text style={[styles.infoModalNote, { color: theme.colors.textMuted }]}>{infoModalData.note}</Text>
            )}
            <TouchableOpacity 
              style={[styles.infoModalCloseBtn, { backgroundColor: accentColor }]} 
              onPress={() => setInfoModalVisible(false)}
            >
              <Text style={styles.infoModalCloseBtnText}>Got it</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      )}
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
  // Goal banner
  goalBanner: { marginBottom: 20 },
  goalBannerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  goalDot: { width: 10, height: 10, borderRadius: 5 },
  goalBannerLabel: { fontSize: 11, fontWeight: '600', letterSpacing: 1 },
  goalBannerValue: { fontSize: 16, fontWeight: '700', marginTop: 2 },
  viewPlanLink: { fontSize: 14, fontWeight: '600' },
  // Input card
  inputCard: { marginBottom: 20 },
  unitToggle: { flexDirection: 'row', borderRadius: 12, padding: 3, marginBottom: 16 },
  unitBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10, borderWidth: 1, borderColor: 'transparent' },
  unitBtnText: { fontSize: 13, fontWeight: '600' },
  inputsGrid: { flexDirection: 'row', gap: 12 },
  inputGroup: { flex: 1, marginBottom: 12 },
  inputLabelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  inputLabel: { fontSize: 13, fontWeight: '600' },
  tooltip: { padding: 10, borderRadius: 8, borderWidth: 0.5, marginBottom: 6 },
  tooltipText: { fontSize: 12, lineHeight: 18 },
  input: { borderWidth: 0.5, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 14, fontSize: 18, fontWeight: '600', minHeight: 52, textAlign: 'center' },
  // Feet / inches row
  ftInRow: { flexDirection: 'row', gap: 10 },
  ftInField: { flex: 1, position: 'relative' },
  ftInUnit: { position: 'absolute', right: 12, top: 16, fontSize: 14, fontWeight: '600' },
  activityScroll: { marginBottom: 16 },
  activityRow: { flexDirection: 'row', gap: 8 },
  activityPill: { paddingVertical: 10, paddingHorizontal: 14, borderRadius: 10, borderWidth: 1 },
  activityPillText: { fontSize: 13, fontWeight: '600' },
  calcBtn: { paddingVertical: 16, borderRadius: 14, alignItems: 'center' },
  calcBtnText: { color: '#000', fontSize: 17, fontWeight: '700' },
  // Results
  resultCard: { marginBottom: 12 },
  resultHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  resultTitle: { fontSize: 12, fontWeight: '600', letterSpacing: 1.5 },
  bigValue: { fontSize: 36, fontWeight: '700', letterSpacing: -1, textAlign: 'center' },
  categoryLabel: { fontSize: 14, fontWeight: '600', textAlign: 'center', marginTop: 2 },
  // Warning banner for extreme BF values
  warningBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10, borderRadius: 10, borderWidth: 1, marginTop: 10 },
  warningText: { fontSize: 12, fontWeight: '500', flex: 1, lineHeight: 18 },
  // Lean BMI note
  leanBmiNote: { fontSize: 12, textAlign: 'center', marginTop: 10, fontStyle: 'italic', lineHeight: 18, paddingHorizontal: 8 },
  // BF gradient bar
  zoneBar: { flexDirection: 'row', height: 10, borderRadius: 5, overflow: 'hidden', marginTop: 16, position: 'relative' },
  zone: { height: '100%' },
  zoneMarker: { position: 'absolute', top: -3, width: 4, height: 16, backgroundColor: '#FFF', borderWidth: 1, borderRadius: 2, marginLeft: -2 },
  zoneLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  zoneLabelText: { fontSize: 9, fontWeight: '600' },
  // FFMI breakdown
  ffmiBreakdown: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 12, justifyContent: 'center' },
  ffmiItem: { paddingHorizontal: 8, paddingVertical: 5, borderRadius: 8, borderWidth: 1, borderColor: 'transparent' },
  ffmiRange: { fontSize: 11, fontWeight: '700', textAlign: 'center' },
  ffmiCat: { fontSize: 9, textAlign: 'center', marginTop: 1 },
  ffmiNote: { fontSize: 12, textAlign: 'center', marginTop: 10, fontStyle: 'italic' },
  // Breakdown bar
  breakdownBar: { flexDirection: 'row', height: 12, borderRadius: 6, overflow: 'hidden' },
  breakdownLean: { height: '100%' },
  breakdownFat: { height: '100%' },
  breakdownLegend: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 13, fontWeight: '500' },
  // TDEE
  tdeeSubtitle: { fontSize: 12, textAlign: 'center', marginBottom: 4 },
  tdeeRow: { flexDirection: 'row', gap: 8, marginTop: 14 },
  tdeeCard: { flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  tdeeLabel: { fontSize: 12, fontWeight: '600' },
  tdeeVal: { fontSize: 18, fontWeight: '700', marginTop: 2 },
  // Ideal weight
  idealNote: { fontSize: 12, textAlign: 'center', marginTop: 8, fontStyle: 'italic', lineHeight: 18 },
  // Muscle to fat
  mfrBarContainer: { flexDirection: 'row', height: 28, borderRadius: 8, overflow: 'hidden', marginBottom: 8 },
  mfrLean: { height: '100%', justifyContent: 'center', alignItems: 'center' },
  mfrFat: { height: '100%', justifyContent: 'center', alignItems: 'center' },
  mfrBarText: { fontSize: 11, fontWeight: '700' },
  // Section titles
  sectionTitle: { fontSize: 12, fontWeight: '600', letterSpacing: 1.5, marginTop: 20, marginBottom: 12 },
  // Coach
  coachSection: { marginTop: 4 },
  coachCard: { marginBottom: 0 },
  coachHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  coachAvatar: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  coachName: { fontSize: 13, fontWeight: '700', letterSpacing: 1 },
  coachText: { fontSize: 15, lineHeight: 23 },
  skeletonWrap: { gap: 8 },
  skeletonLine: { height: 14, borderRadius: 7 },
  coachActions: { flexDirection: 'row', gap: 10, marginTop: 16 },
  coachBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  coachBtnText: { color: '#000', fontSize: 14, fontWeight: '700' },
  coachBtnSec: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center', borderWidth: 1 },
  coachBtnSecText: { fontSize: 14, fontWeight: '600' },
  // History
  emptyHistoryCard: { marginBottom: 12 },
  emptyHistoryText: { fontSize: 14, textAlign: 'center', paddingVertical: 20, lineHeight: 22 },
  historyCard: { marginBottom: 6 },
  historyRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  historyDate: { width: 55, fontSize: 13, fontWeight: '500' },
  historyVal: { fontSize: 14, fontWeight: '600' },
  // Save
  saveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 18, borderRadius: 14, gap: 8, marginTop: 16 },
  saveBtnText: { color: '#000', fontSize: 17, fontWeight: '700' },
  bottomSpacer: { height: 40 },
  // Pre-filled note
  prefilledNote: { fontSize: 11, fontStyle: 'italic', marginTop: -4, marginBottom: 8, paddingHorizontal: 4 },
  // Info icon
  infoIcon: { fontSize: 16, marginLeft: 'auto' },
  // Info modal
  infoModalOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  infoModalContent: { padding: 24, borderTopLeftRadius: 20, borderTopRightRadius: 20, borderWidth: 0.5, maxHeight: '60%' },
  infoModalTitle: { fontSize: 18, fontWeight: '700', marginBottom: 12 },
  infoModalDesc: { fontSize: 14, lineHeight: 22, marginBottom: 12 },
  infoModalSection: { padding: 12, borderRadius: 12, marginBottom: 10 },
  infoModalSectionLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5, marginBottom: 4 },
  infoModalSectionText: { fontSize: 13, lineHeight: 20 },
  infoModalNote: { fontSize: 12, fontStyle: 'italic', marginBottom: 12, lineHeight: 18 },
  infoModalCloseBtn: { paddingVertical: 14, borderRadius: 12, alignItems: 'center', marginTop: 8 },
  infoModalCloseBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
