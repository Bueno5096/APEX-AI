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
  ActivityLevel,
  UnitType,
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

const getBMICategory = (bmi: number) => {
  if (bmi < 18.5) return 'Underweight';
  if (bmi < 25) return 'Normal';
  if (bmi < 30) return 'Overweight';
  return 'Obese';
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
  const { theme, accentColor } = useThemeStore();
  const { profile, gender } = useUserStore();
  const { secondaryGoal, coachSuggestionDismissed, dismissCoachSuggestion, hasActiveGoalLayeringPlan } = useGoalStore();
  const { measurements, results, history, hasCalculated, setMeasurements, setResults, saveEntry, loadData } = useBodyCompStore();
  const router = useRouter();

  const [unit, setUnit] = useState<UnitType>(measurements.unit);
  const [weight, setWeight] = useState('');
  const [height, setHeight] = useState('');
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

  // Initialize inputs from stored measurements
  useEffect(() => {
    const m = measurements;
    const isImp = m.unit === 'imperial';
    setUnit(m.unit);
    setWeight(isImp ? String(kgToLbs(m.weight)) : String(m.weight));
    setHeight(isImp ? String(cmToIn(m.height)) : String(m.height));
    setAge(String(m.age));
    setNeck(isImp ? String(cmToIn(m.neck)) : String(m.neck));
    setWaist(isImp ? String(cmToIn(m.waist)) : String(m.waist));
    setHip(isImp ? String(cmToIn(m.hip)) : String(m.hip));
    setActivity(m.activityLevel);
    if (m.gender) {
      // already set from profile
    }
  }, [measurements]);

  // Toggle unit and convert
  const toggleUnit = (newUnit: UnitType) => {
    if (newUnit === unit) return;
    const w = parseFloat(weight) || 0;
    const h = parseFloat(height) || 0;
    const n = parseFloat(neck) || 0;
    const wa = parseFloat(waist) || 0;
    const hi = parseFloat(hip) || 0;

    if (newUnit === 'imperial') {
      setWeight(w ? String(kgToLbs(w)) : '');
      setHeight(h ? String(cmToIn(h)) : '');
      setNeck(n ? String(cmToIn(n)) : '');
      setWaist(wa ? String(cmToIn(wa)) : '');
      setHip(hi ? String(cmToIn(hi)) : '');
    } else {
      setWeight(w ? String(lbsToKg(w)) : '');
      setHeight(h ? String(inToCm(h)) : '');
      setNeck(n ? String(inToCm(n)) : '');
      setWaist(wa ? String(inToCm(wa)) : '');
      setHip(hi ? String(inToCm(hi)) : '');
    }
    setUnit(newUnit);
  };

  // Calculate
  const handleCalculate = () => {
    const w = parseFloat(weight) || 0;
    const h = parseFloat(height) || 0;
    const a = parseInt(age) || 0;
    const n = parseFloat(neck) || 0;
    const wa = parseFloat(waist) || 0;
    const hi = parseFloat(hip) || 0;

    if (!w || !h || !a || !n || !wa) {
      Alert.alert('Missing Info', 'Please fill in weight, height, age, neck, and waist measurements.');
      return;
    }
    if (isFemale && !hi) {
      Alert.alert('Missing Info', 'Please fill in hip measurement.');
      return;
    }

    const wKg = unit === 'imperial' ? lbsToKg(w) : w;
    const hCm = unit === 'imperial' ? inToCm(h) : h;
    const nCm = unit === 'imperial' ? inToCm(n) : n;
    const waCm = unit === 'imperial' ? inToCm(wa) : wa;
    const hiCm = unit === 'imperial' ? inToCm(hi) : hi;

    const m = {
      weight: wKg,
      height: hCm,
      age: a,
      gender: isFemale ? 'female' : 'male',
      neck: nCm,
      waist: waCm,
      hip: hiCm,
      activityLevel: activity,
      unit,
    };

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

  const displayWeight = (kg: number) => unit === 'imperial' ? `${kgToLbs(kg)} lbs` : `${kg} kg`;

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
              style={[styles.unitBtn, unit === 'imperial' && { backgroundColor: accentColor + '20', borderColor: accentColor }]}
              onPress={() => toggleUnit('imperial')}
            >
              <Text style={[styles.unitBtnText, { color: unit === 'imperial' ? accentColor : theme.colors.textMuted }]}>Imperial (lbs/in)</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.unitBtn, unit === 'metric' && { backgroundColor: accentColor + '20', borderColor: accentColor }]}
              onPress={() => toggleUnit('metric')}
            >
              <Text style={[styles.unitBtnText, { color: unit === 'metric' ? accentColor : theme.colors.textMuted }]}>Metric (kg/cm)</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.inputsGrid}>
            <InputField label={`Weight (${unit === 'imperial' ? 'lbs' : 'kg'})`} value={weight} onChangeText={setWeight} placeholder="0" theme={theme} tooltipField={tooltipField} setTooltipField={setTooltipField} />
            <InputField label={`Height (${unit === 'imperial' ? 'in' : 'cm'})`} value={height} onChangeText={setHeight} placeholder="0" theme={theme} tooltipField={tooltipField} setTooltipField={setTooltipField} />
          </View>
          <InputField label="Age" value={age} onChangeText={setAge} placeholder="0" theme={theme} tooltipField={tooltipField} setTooltipField={setTooltipField} />
          <View style={styles.inputsGrid}>
            <InputField label={`Neck (${unit === 'imperial' ? 'in' : 'cm'})`} value={neck} onChangeText={setNeck} placeholder="0" infoText="Measure around the narrowest part of your neck" theme={theme} tooltipField={tooltipField} setTooltipField={setTooltipField} />
            <InputField label={`Waist (${unit === 'imperial' ? 'in' : 'cm'})`} value={waist} onChangeText={setWaist} placeholder="0" infoText="Measure around your navel at its widest point" theme={theme} tooltipField={tooltipField} setTooltipField={setTooltipField} />
          </View>
          <InputField label={`Hip (${unit === 'imperial' ? 'in' : 'cm'})`} value={hip} onChangeText={setHip} placeholder="0" show={isFemale} infoText="Measure around the widest part of your hips" theme={theme} tooltipField={tooltipField} setTooltipField={setTooltipField} />

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
              </View>
              <Text style={[styles.bigValue, { color: theme.colors.textPrimary }]}>{results.bodyFatPercent}%</Text>
              <Text style={[styles.categoryLabel, { color: accentColor }]}>{getBFCategory(results.bodyFatPercent, gender)}</Text>
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

            {/* BMI Card */}
            <MetallicCard style={styles.resultCard} delay={160}>
              <View style={styles.resultHeader}>
                <Ionicons name="speedometer" size={22} color={accentColor} />
                <Text style={[styles.resultTitle, { color: theme.colors.textMuted }]}>BMI</Text>
              </View>
              <Text style={[styles.bigValue, { color: theme.colors.textPrimary }]}>{results.bmi}</Text>
              <Text style={[styles.categoryLabel, { color: accentColor }]}>{getBMICategory(results.bmi)}</Text>
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
              <Text style={[styles.resultTitle, { color: theme.colors.textMuted, marginBottom: 12 }]}>COMPOSITION BREAKDOWN</Text>
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
  input: { borderWidth: 0.5, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, fontWeight: '600' },
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
});
