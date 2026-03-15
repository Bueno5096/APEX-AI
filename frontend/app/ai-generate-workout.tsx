import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { apiFetch } from '../src/utils/api';
import { useThemeStore } from '../src/store/themeStore';
import { useUserStore } from '../src/store/userStore';
import { getTodaySplitDay } from '../src/utils/trainingHelpers';

const MUSCLE_OPTIONS = ['Chest', 'Back', 'Shoulders', 'Biceps', 'Triceps', 'Quads', 'Hamstrings', 'Glutes', 'Core', 'Full Body'];
const EQUIPMENT_OPTIONS = [
  { key: 'full_gym', label: 'Full Gym', icon: 'fitness' },
  { key: 'dumbbells_only', label: 'Dumbbells Only', icon: 'barbell' },
  { key: 'bodyweight', label: 'Bodyweight', icon: 'body' },
  { key: 'home_gym', label: 'Home Gym', icon: 'home' },
];
const DURATION_OPTIONS = [20, 30, 45, 60, 75, 90];
const INTENSITY_OPTIONS = ['low', 'moderate', 'high', 'brutal'];

export default function AIGenerateWorkoutScreen() {
  const router = useRouter();
  const theme = useThemeStore((s) => s.theme);
  const accentColor = useThemeStore((s) => s.accentColor);
  const { profile } = useUserStore();

  // Get today's split day to pre-fill focus muscles
  const todaySplit = getTodaySplitDay(profile?.trainingSplit, profile?.trainingDays, profile?.trainingFrequency);
  const defaultMuscles = todaySplit.isTrainingDay && todaySplit.targetMuscles.length > 0 && todaySplit.targetMuscles[0] !== 'AI Selected'
    ? todaySplit.targetMuscles.filter(m => MUSCLE_OPTIONS.includes(m))
    : [];

  const [focusMuscles, setFocusMuscles] = useState<string[]>(defaultMuscles);
  const [equipment, setEquipment] = useState('full_gym');
  const [duration, setDuration] = useState(45);
  const [intensity, setIntensity] = useState('moderate');
  const [isGenerating, setIsGenerating] = useState(false);
  const [loadingPhase, setLoadingPhase] = useState('');
  const [showCancel, setShowCancel] = useState(false);

  const toggleMuscle = (m: string) => {
    if (m === 'Full Body') {
      setFocusMuscles(focusMuscles.includes('Full Body') ? [] : ['Full Body']);
      return;
    }
    setFocusMuscles((prev) => {
      const without = prev.filter((x) => x !== 'Full Body');
      return without.includes(m) ? without.filter((x) => x !== m) : [...without, m];
    });
  };

  const handleGenerate = async () => {
    if (focusMuscles.length === 0) {
      Alert.alert('Select Focus', 'Pick at least one muscle group to focus on');
      return;
    }

    setIsGenerating(true);
    setShowCancel(false);
    const phases = [
      'Analyzing your fitness profile...',
      'Checking muscle recovery status...',
      'Selecting optimal exercises...',
      'Calculating sets and reps...',
      'Building your perfect workout...',
    ];
    let phaseIdx = 0;
    setLoadingPhase(phases[0]);
    const interval = setInterval(() => {
      phaseIdx = (phaseIdx + 1) % phases.length;
      setLoadingPhase(phases[phaseIdx]);
    }, 1500);
    
    // Show cancel button after 10 seconds
    const cancelTimer = setTimeout(() => setShowCancel(true), 10000);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    try {
      const genParams = {
        focusMuscles,
        equipment,
        duration,
        intensity,
        trainingStyle: profile?.trainingStyle || null,
        trainingSplit: profile?.trainingSplit || null,
        sport: profile?.sport || null,
        userProfile: profile ? {
          name: profile.name,
          trainingExperience: profile.trainingExperience,
          injuries: profile.injuries,
        } : null,
      };

      const res = await apiFetch('/api/generate-workout', {
        method: 'POST',
        body: JSON.stringify(genParams),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      clearInterval(interval);
      clearTimeout(cancelTimer);

      if (!res.ok) throw new Error('Failed to generate workout');
      const data = await res.json();
      setIsGenerating(false);

      if (!data.exercises || data.exercises.length === 0) {
        Alert.alert('Generation Error', 'No exercises were generated. Please try again.');
        return;
      }

      // Navigate to AI Workout Preview screen
      router.push({
        pathname: '/ai-workout-preview',
        params: {
          workoutData: JSON.stringify(data),
          genParams: JSON.stringify(genParams),
        },
      });
    } catch (err) {
      clearTimeout(timeoutId);
      clearInterval(interval);
      clearTimeout(cancelTimer);
      setIsGenerating(false);
      if (err.name === 'AbortError') {
        Alert.alert('Timeout', 'Generation is taking longer than expected. Please try again.');
      } else {
        Alert.alert('Generation Failed', 'Could not generate workout. Please try again.');
      }
    }
  };

  const getIntensityColor = (i: string) => {
    if (i === 'low') return '#4CAF50';
    if (i === 'moderate') return '#FF9800';
    if (i === 'high') return '#F44336';
    return '#9C27B0';
  };

  if (isGenerating) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={styles.loadingContainer}>
          <View style={[styles.loadingPulse, { backgroundColor: accentColor + '20' }]}>
            <Ionicons name="sparkles" size={48} color={accentColor} />
          </View>
          <Text style={[styles.loadingTitle, { color: theme.colors.textPrimary }]}>GENERATING YOUR WORKOUT</Text>
          <Text style={[styles.loadingPhase, { color: accentColor }]}>{loadingPhase}</Text>
          <ActivityIndicator size="large" color={accentColor} style={{ marginTop: 20 }} />
          {showCancel && (
            <TouchableOpacity
              style={[styles.cancelBtn, { borderColor: theme.colors.cardBorder }]}
              onPress={() => { setIsGenerating(false); setShowCancel(false); }}
            >
              <Text style={[styles.cancelBtnText, { color: theme.colors.textSecondary }]}>Cancel</Text>
            </TouchableOpacity>
          )}
          <View style={[styles.loadingInfo, { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder }]}>
            <Text style={[styles.loadingInfoText, { color: theme.colors.textMuted }]}>
              APEX is creating a personalized workout based on your profile, training style, and preferences...
            </Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={theme.colors.textPrimary} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={[styles.headerTitle, { color: theme.colors.textPrimary }]}>AI GENERATE</Text>
          <Text style={[styles.headerSub, { color: theme.colors.textMuted }]}>Tell APEX what you want</Text>
        </View>
        <Ionicons name="sparkles" size={22} color={accentColor} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Split Day Context */}
        {todaySplit.isTrainingDay && todaySplit.targetMuscles.length > 0 && profile?.trainingSplit && (
          <View style={[styles.contextCard, { backgroundColor: theme.colors.card, borderColor: accentColor }]}>
            <Ionicons name="calendar" size={16} color={accentColor} />
            <Text style={[styles.contextText, { color: theme.colors.textPrimary }]}>
              Today is <Text style={{ fontWeight: '700', color: accentColor }}>{todaySplit.splitDayLabel}</Text> — focus muscles pre-selected based on your split
            </Text>
          </View>
        )}
        {todaySplit.isRestDay && profile?.trainingSplit && (
          <View style={[styles.contextCard, { backgroundColor: theme.colors.card, borderColor: '#FF9800' }]}>
            <Ionicons name="bed" size={16} color="#FF9800" />
            <Text style={[styles.contextText, { color: theme.colors.textPrimary }]}>
              Today is a <Text style={{ fontWeight: '700', color: '#FF9800' }}>Rest Day</Text> — consider active recovery or light work
            </Text>
          </View>
        )}

        {/* Focus Muscles */}
        <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>Focus Muscles</Text>
        <View style={styles.muscleGrid}>
          {MUSCLE_OPTIONS.map((m) => {
            const isSelected = focusMuscles.includes(m);
            return (
              <TouchableOpacity
                key={m}
                style={[
                  styles.muscleChip,
                  { borderColor: theme.colors.cardBorder },
                  isSelected && { backgroundColor: accentColor + '20', borderColor: accentColor },
                ]}
                onPress={() => toggleMuscle(m)}
              >
                <Text style={[styles.muscleChipText, { color: isSelected ? accentColor : theme.colors.textSecondary }]}>{m}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Equipment */}
        <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>Equipment Available</Text>
        <View style={styles.equipGrid}>
          {EQUIPMENT_OPTIONS.map((eq) => {
            const isSelected = equipment === eq.key;
            return (
              <TouchableOpacity
                key={eq.key}
                style={[
                  styles.equipCard,
                  { backgroundColor: theme.colors.card, borderColor: isSelected ? accentColor : theme.colors.cardBorder },
                  isSelected && { borderWidth: 1.5 },
                ]}
                onPress={() => setEquipment(eq.key)}
              >
                <Ionicons name={eq.icon as any} size={22} color={isSelected ? accentColor : theme.colors.textSecondary} />
                <Text style={[styles.equipLabel, { color: isSelected ? accentColor : theme.colors.textSecondary }]}>{eq.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Duration */}
        <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>Duration (minutes)</Text>
        <View style={styles.durationRow}>
          {DURATION_OPTIONS.map((d) => {
            const isSelected = duration === d;
            return (
              <TouchableOpacity
                key={d}
                style={[
                  styles.durationBtn,
                  { borderColor: theme.colors.cardBorder },
                  isSelected && { backgroundColor: accentColor + '20', borderColor: accentColor },
                ]}
                onPress={() => setDuration(d)}
              >
                <Text style={[styles.durationText, { color: isSelected ? accentColor : theme.colors.textSecondary }]}>{d}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Intensity */}
        <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>Intensity</Text>
        <View style={styles.intensityRow}>
          {INTENSITY_OPTIONS.map((i) => {
            const isSelected = intensity === i;
            const color = getIntensityColor(i);
            return (
              <TouchableOpacity
                key={i}
                style={[
                  styles.intensityBtn,
                  { borderColor: theme.colors.cardBorder },
                  isSelected && { backgroundColor: color + '15', borderColor: color },
                ]}
                onPress={() => setIntensity(i)}
              >
                <Text style={[styles.intensityText, { color: isSelected ? color : theme.colors.textSecondary }]}>
                  {i.charAt(0).toUpperCase() + i.slice(1)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Context Info */}
        {profile?.trainingStyle && (
          <View style={[styles.contextCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder }]}>
            <Ionicons name="information-circle-outline" size={16} color={accentColor} />
            <Text style={[styles.contextText, { color: theme.colors.textMuted }]}>
              APEX will generate this workout using your {profile.trainingStyle.replace('_', ' ')} training style
              {profile.trainingSplit ? ` and ${profile.trainingSplit.replace(/_/g, ' ')} split` : ''}.
            </Text>
          </View>
        )}

        {/* Talk to Coach First */}
        <TouchableOpacity
          style={[styles.talkToCoachBtn, { borderColor: '#7C3AED', backgroundColor: '#7C3AED10' }]}
          onPress={() => router.push('/(tabs)/coach')}
          activeOpacity={0.7}
        >
          <Ionicons name="chatbubbles" size={18} color="#7C3AED" />
          <Text style={styles.talkToCoachText}>Talk to Coach First 💬</Text>
        </TouchableOpacity>

        {/* Generate Button */}
        <TouchableOpacity
          style={[
            styles.generateBtn,
            { backgroundColor: focusMuscles.length > 0 ? '#7C3AED' : theme.colors.metallic },
          ]}
          onPress={handleGenerate}
          disabled={focusMuscles.length === 0}
          activeOpacity={0.8}
        >
          <Ionicons name="sparkles" size={20} color="#fff" />
          <Text style={[styles.generateBtnText, { opacity: focusMuscles.length > 0 ? 1 : 0.5 }]}>Generate Workout</Text>
        </TouchableOpacity>

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
  scrollContent: { paddingHorizontal: 20, paddingBottom: 40 },
  sectionTitle: { fontSize: 15, fontWeight: '700', marginTop: 20, marginBottom: 10 },
  muscleGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  muscleChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  muscleChipText: { fontSize: 13, fontWeight: '600' },
  equipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  equipCard: { width: '47%', paddingVertical: 16, paddingHorizontal: 12, borderRadius: 14, borderWidth: 0.5, alignItems: 'center', gap: 6 },
  equipLabel: { fontSize: 13, fontWeight: '600' },
  durationRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  durationBtn: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12, borderWidth: 1 },
  durationText: { fontSize: 16, fontWeight: '700' },
  intensityRow: { flexDirection: 'row', gap: 10 },
  intensityBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, borderWidth: 1, alignItems: 'center' },
  intensityText: { fontSize: 13, fontWeight: '700' },
  contextCard: { flexDirection: 'row', gap: 8, padding: 14, borderRadius: 12, borderWidth: 0.5, marginTop: 20, alignItems: 'flex-start' },
  contextText: { fontSize: 13, lineHeight: 18, flex: 1 },
  generateBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16, borderRadius: 14, marginTop: 12 },
  generateBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  talkToCoachBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 14, borderWidth: 1.5, marginTop: 24 },
  talkToCoachText: { color: '#7C3AED', fontSize: 15, fontWeight: '700' },
  cancelBtn: { marginTop: 20, paddingVertical: 12, paddingHorizontal: 32, borderRadius: 12, borderWidth: 1 },
  cancelBtnText: { fontSize: 14, fontWeight: '600' },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 },
  loadingPulse: { width: 100, height: 100, borderRadius: 50, alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
  loadingTitle: { fontSize: 18, fontWeight: '800', letterSpacing: 1.5, marginBottom: 8 },
  loadingPhase: { fontSize: 15, fontWeight: '600' },
  loadingInfo: { marginTop: 30, padding: 16, borderRadius: 14, borderWidth: 0.5 },
  loadingInfoText: { fontSize: 13, lineHeight: 20, textAlign: 'center' },
});
