import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useThemeStore } from '../src/store/themeStore';
import { useUserStore } from '../src/store/userStore';
import { FREQUENCY_SPLIT_COMPAT } from '../src/utils/trainingHelpers';

const DAY_OPTIONS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const DAY_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const FREQUENCY_OPTIONS = [
  { freq: 2, label: '2 Days / Week', desc: 'Minimum effective dose — great for maintenance', splits: 'Full Body only', restDays: 5 },
  { freq: 3, label: '3 Days / Week', desc: 'Solid foundation for building strength and muscle', splits: 'Full Body, Push Pull Legs', restDays: 4 },
  { freq: 4, label: '4 Days / Week', desc: 'Optimal balance of training and recovery', splits: 'Upper Lower, Push Pull Legs', restDays: 3 },
  { freq: 5, label: '5 Days / Week', desc: 'High volume training for serious progress', splits: 'Bro Split, Push Pull Legs, Upper Lower', restDays: 2 },
  { freq: 6, label: '6 Days / Week', desc: 'Maximum frequency — requires excellent recovery', splits: 'Arnold Split, Push Pull Legs twice', restDays: 1 },
  { freq: 7, label: '7 Days / Week', desc: 'Every day training — active recovery days included', splits: 'Arnold Split with active recovery days', restDays: 0 },
];

export default function TrainingFrequencyScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const isOnboarding = params.fromOnboarding === 'true';
  const theme = useThemeStore((s) => s.theme);
  const accentColor = useThemeStore((s) => s.accentColor);
  const { profile, setProfile } = useUserStore();

  const [selectedFreq, setSelectedFreq] = useState(profile?.trainingFrequency || 0);
  const [selectedDays, setSelectedDays] = useState(profile?.trainingDays || []);
  const [showDayPicker, setShowDayPicker] = useState(!!profile?.trainingFrequency);

  // Sync state if profile loads asynchronously after mount
  useEffect(() => {
    if (profile?.trainingFrequency && selectedFreq === 0) {
      setSelectedFreq(profile.trainingFrequency);
      if (profile.trainingDays?.length) setSelectedDays(profile.trainingDays);
      setShowDayPicker(true);
    }
  }, [profile?.trainingFrequency]);

  const toggleDay = (day: string) => {
    setSelectedDays((prev) => {
      if (prev.includes(day)) return prev.filter((d) => d !== day);
      if (prev.length >= selectedFreq) return prev;
      return [...prev, day];
    });
  };

  const handleFreqSelect = (freq: number) => {
    setSelectedFreq(freq);
    setShowDayPicker(true);
    // Pre-select days based on frequency
    const presets: Record<number, string[]> = {
      2: ['Monday', 'Thursday'],
      3: ['Monday', 'Wednesday', 'Friday'],
      4: ['Monday', 'Tuesday', 'Thursday', 'Friday'],
      5: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
      6: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
      7: DAY_OPTIONS,
    };
    setSelectedDays(presets[freq] || []);
  };

  const handleSave = () => {
    if (!profile || selectedFreq === 0) return;
    setProfile({
      ...profile,
      trainingFrequency: selectedFreq,
      trainingDays: selectedDays,
      trainingDaysPerWeek: selectedFreq,
    });
    if (isOnboarding) {
      router.push('/training-style?fromOnboarding=true');
    } else {
      router.back();
    }
  };

  const canProceed = selectedFreq > 0 && selectedDays.length === selectedFreq;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={theme.colors.textPrimary} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={[styles.headerTitle, { color: theme.colors.textPrimary }]}>TRAINING FREQUENCY</Text>
          <Text style={[styles.headerSub, { color: theme.colors.textMuted }]}>How often do you want to train?</Text>
        </View>
        {isOnboarding && (
          <Text style={[styles.stepIndicator, { color: accentColor }]}>Frequency</Text>
        )}
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {isOnboarding && (
          <View style={[styles.coachBubble, { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder }]}>
            <Ionicons name="sparkles" size={16} color={accentColor} />
            <Text style={[styles.coachText, { color: theme.colors.textPrimary }]}>
              How often do you want to train each week? I will build your entire program around this.
            </Text>
          </View>
        )}

        {/* Frequency Cards */}
        {FREQUENCY_OPTIONS.map((opt) => {
          const isSelected = selectedFreq === opt.freq;
          return (
            <TouchableOpacity
              key={opt.freq}
              style={[
                styles.freqCard,
                { backgroundColor: theme.colors.card, borderColor: isSelected ? accentColor : theme.colors.cardBorder },
                isSelected && { borderLeftWidth: 3, borderLeftColor: accentColor },
              ]}
              onPress={() => handleFreqSelect(opt.freq)}
              activeOpacity={0.7}
            >
              <View style={styles.freqHeader}>
                <View style={[styles.freqNum, { backgroundColor: isSelected ? accentColor + '20' : theme.colors.backgroundSecondary }]}>
                  <Text style={[styles.freqNumText, { color: isSelected ? accentColor : theme.colors.textSecondary }]}>{opt.freq}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.freqLabel, { color: theme.colors.textPrimary }]}>{opt.label}</Text>
                  <Text style={[styles.freqDesc, { color: theme.colors.textMuted }]}>{opt.desc}</Text>
                </View>
                <View style={[styles.radio, { borderColor: isSelected ? accentColor : theme.colors.textMuted }]}>
                  {isSelected && <View style={[styles.radioInner, { backgroundColor: accentColor }]} />}
                </View>
              </View>
              <View style={styles.freqMeta}>
                <View style={[styles.metaTag, { backgroundColor: theme.colors.backgroundSecondary }]}>
                  <Text style={[styles.metaTagText, { color: theme.colors.textSecondary }]}>{opt.restDays} rest days</Text>
                </View>
                <View style={[styles.metaTag, { backgroundColor: theme.colors.backgroundSecondary }]}>
                  <Text style={[styles.metaTagText, { color: theme.colors.textSecondary }]}>Splits: {opt.splits}</Text>
                </View>
              </View>
            </TouchableOpacity>
          );
        })}

        {/* Day Picker */}
        {showDayPicker && selectedFreq > 0 && (
          <View style={[styles.dayPickerCard, { backgroundColor: theme.colors.card, borderColor: accentColor }]}>
            <Text style={[styles.dayPickerTitle, { color: theme.colors.textPrimary }]}>
              Which days will you train?
            </Text>
            <Text style={[styles.dayPickerSub, { color: theme.colors.textMuted }]}>
              Select {selectedFreq} days ({selectedDays.length}/{selectedFreq})
            </Text>
            <View style={styles.dayPills}>
              {DAY_OPTIONS.map((day, i) => {
                const isDay = selectedDays.includes(day);
                const isFull = selectedDays.length >= selectedFreq && !isDay;
                return (
                  <TouchableOpacity
                    key={day}
                    style={[
                      styles.dayPill,
                      { borderColor: theme.colors.cardBorder },
                      isDay && { backgroundColor: accentColor + '20', borderColor: accentColor },
                      isFull && { opacity: 0.3 },
                    ]}
                    onPress={() => toggleDay(day)}
                    disabled={isFull}
                  >
                    <Text style={[styles.dayPillText, { color: isDay ? accentColor : theme.colors.textSecondary }]}>{DAY_SHORT[i]}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {/* Save Button */}
        <TouchableOpacity
          style={[styles.saveBtn, { backgroundColor: canProceed ? accentColor : theme.colors.metallic }]}
          onPress={handleSave}
          activeOpacity={0.8}
          disabled={!canProceed}
        >
          <Text style={[styles.saveBtnText, { opacity: canProceed ? 1 : 0.5 }]}>
            {isOnboarding ? 'Continue to Training Style' : 'Save Frequency'}
          </Text>
          <Ionicons name="arrow-forward" size={18} color="#fff" style={{ opacity: canProceed ? 1 : 0.5 }} />
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
  stepIndicator: { fontSize: 12, fontWeight: '700' },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 40 },
  coachBubble: { flexDirection: 'row', gap: 10, padding: 14, borderRadius: 14, borderWidth: 0.5, marginBottom: 16, alignItems: 'flex-start' },
  coachText: { fontSize: 14, lineHeight: 20, flex: 1 },
  freqCard: { padding: 16, borderRadius: 14, borderWidth: 0.5, marginBottom: 10 },
  freqHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 },
  freqNum: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  freqNumText: { fontSize: 18, fontWeight: '800' },
  freqLabel: { fontSize: 16, fontWeight: '700' },
  freqDesc: { fontSize: 13, marginTop: 2, lineHeight: 18 },
  freqMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginLeft: 52 },
  metaTag: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  metaTagText: { fontSize: 11 },
  radio: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  radioInner: { width: 12, height: 12, borderRadius: 6 },
  dayPickerCard: { padding: 16, borderRadius: 14, borderWidth: 1, marginBottom: 10, marginTop: 8 },
  dayPickerTitle: { fontSize: 15, fontWeight: '600', marginBottom: 4 },
  dayPickerSub: { fontSize: 12, marginBottom: 12 },
  dayPills: { flexDirection: 'row', gap: 8, justifyContent: 'space-between' },
  dayPill: { flex: 1, paddingVertical: 12, borderRadius: 12, borderWidth: 1, alignItems: 'center' },
  dayPillText: { fontSize: 12, fontWeight: '700' },
  saveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16, borderRadius: 14, marginTop: 12 },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
