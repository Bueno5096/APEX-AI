import React, { useState } from 'react';
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
import { useUserStore, TrainingSplit } from '../src/store/userStore';
import { TRAINING_SPLITS, TrainingSplitInfo } from '../src/store/exerciseStore';

const SPLIT_ICONS: Record<string, string> = {
  full_body: 'body',
  upper_lower: 'swap-vertical',
  push_pull_legs: 'git-branch',
  fresh_muscle: 'sparkles',
  bro_split: 'fitness',
  arnold_split: 'trophy',
  athletic: 'flash',
  bodyweight_only: 'hand-left',
};

export default function TrainingSplitScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const isOnboarding = params.fromOnboarding === 'true';
  const theme = useThemeStore((s) => s.theme);
  const accentColor = useThemeStore((s) => s.accentColor);
  const { profile, setProfile } = useUserStore();

  const [selected, setSelected] = useState<string>(profile?.trainingSplit || '');
  const [expandedKey, setExpandedKey] = useState<string | null>(null);

  // Calculate recommendation based on user profile
  const getRecommendation = (): string | null => {
    if (!profile) return 'full_body';
    const days = profile.trainingDaysPerWeek || 3;
    const exp = profile.trainingExperience || 'beginner';

    if (exp === 'beginner') return 'full_body';
    if (days <= 3 && exp === 'intermediate') return 'full_body';
    if (days === 4) return 'upper_lower';
    if (days >= 5 && exp === 'advanced') return 'push_pull_legs';
    return 'upper_lower';
  };

  const recommendation = getRecommendation();

  const handleSelect = () => {
    if (!selected || !profile) return;
    setProfile({
      ...profile,
      trainingSplit: selected as TrainingSplit,
    });

    if (isOnboarding) {
      // Go back to onboarding completion flow
      router.replace('/profile-creation');
    } else {
      router.back();
    }
  };

  const getDaysMatchIndicator = (split: TrainingSplitInfo) => {
    if (!profile?.trainingDaysPerWeek) return null;
    const userDays = profile.trainingDaysPerWeek;
    const diff = Math.abs(userDays - split.daysPerWeek);
    if (diff === 0) return { label: 'Perfect match', color: '#4CAF50' };
    if (diff === 1) return { label: 'Good match', color: '#FF9800' };
    return { label: 'May need adjustment', color: '#F44336' };
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={theme.colors.textPrimary} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={[styles.headerTitle, { color: theme.colors.textPrimary }]}>TRAINING SPLIT</Text>
          <Text style={[styles.headerSub, { color: theme.colors.textMuted }]}>How to organize your week</Text>
        </View>
        {isOnboarding && (
          <Text style={[styles.stepIndicator, { color: accentColor }]}>Step 2/2</Text>
        )}
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Info Card */}
        <View style={[styles.infoCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder }]}>
          <Ionicons name="calendar-outline" size={18} color={accentColor} />
          <Text style={[styles.infoText, { color: theme.colors.textMuted }]}>
            Your training split determines how exercises are distributed across the week.
            {profile?.trainingDaysPerWeek ? ` Based on your ${profile.trainingDaysPerWeek} training days/week.` : ''}
          </Text>
        </View>

        {/* Split Cards */}
        {TRAINING_SPLITS.map((split) => {
          const isSelected = selected === split.key;
          const isExpanded = expandedKey === split.key;
          const isRecommended = split.key === recommendation;
          const daysMatch = getDaysMatchIndicator(split);
          const iconName = SPLIT_ICONS[split.key] || 'grid';

          return (
            <TouchableOpacity
              key={split.key}
              style={[
                styles.splitCard,
                {
                  backgroundColor: theme.colors.card,
                  borderColor: isSelected ? accentColor : theme.colors.cardBorder,
                },
                isSelected && { borderLeftWidth: 3, borderLeftColor: accentColor },
              ]}
              onPress={() => setSelected(split.key)}
              activeOpacity={0.7}
            >
              <View style={styles.splitContent}>
                {/* Tags Row */}
                {(split.tag || isRecommended) && (
                  <View style={styles.tagsRow}>
                    {split.tag && (
                      <View style={[styles.tagBadge, { backgroundColor: split.tag.includes('AI') ? '#7C3AED20' : accentColor + '20' }]}>
                        <Text style={[styles.tagText, { color: split.tag.includes('AI') ? '#7C3AED' : accentColor }]}>
                          {split.tag}
                        </Text>
                      </View>
                    )}
                    {isRecommended && (
                      <View style={[styles.tagBadge, { backgroundColor: '#4CAF5020' }]}>
                        <Ionicons name="star" size={10} color="#4CAF50" />
                        <Text style={[styles.tagText, { color: '#4CAF50' }]}>RECOMMENDED FOR YOU</Text>
                      </View>
                    )}
                  </View>
                )}

                <View style={styles.splitHeader}>
                  <View style={[styles.iconCircle, { backgroundColor: isSelected ? accentColor + '20' : theme.colors.backgroundSecondary }]}>
                    <Ionicons name={iconName as any} size={20} color={isSelected ? accentColor : theme.colors.textSecondary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.splitName, { color: theme.colors.textPrimary }]}>{split.name}</Text>
                    <Text style={[styles.splitDays, { color: theme.colors.textSecondary }]}>
                      {split.daysPerWeek} days/week
                    </Text>
                  </View>

                  {/* Days Match Indicator */}
                  {daysMatch && (
                    <View style={[styles.matchBadge, { backgroundColor: daysMatch.color + '15' }]}>
                      <View style={[styles.matchDot, { backgroundColor: daysMatch.color }]} />
                      <Text style={[styles.matchText, { color: daysMatch.color }]}>{daysMatch.label}</Text>
                    </View>
                  )}

                  <View style={[styles.radio, { borderColor: isSelected ? accentColor : theme.colors.textMuted }]}>
                    {isSelected && <View style={[styles.radioInner, { backgroundColor: accentColor }]} />}
                  </View>
                </View>

                <Text style={[styles.splitDesc, { color: theme.colors.textMuted }]}>{split.description}</Text>
                <Text style={[styles.splitBest, { color: theme.colors.textMuted }]}>Best for: {split.bestFor}</Text>

                {/* Expand details */}
                <TouchableOpacity
                  style={styles.detailsToggle}
                  onPress={() => setExpandedKey(isExpanded ? null : split.key)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Text style={[styles.detailsToggleText, { color: accentColor }]}>
                    {isExpanded ? 'Hide schedule' : 'View schedule'}
                  </Text>
                  <Ionicons name={isExpanded ? 'chevron-up' : 'chevron-down'} size={14} color={accentColor} />
                </TouchableOpacity>

                {isExpanded && (
                  <View style={[styles.scheduleBox, { backgroundColor: theme.colors.backgroundSecondary, borderColor: theme.colors.cardBorder }]}>
                    <Text style={[styles.scheduleTitle, { color: theme.colors.textSecondary }]}>WEEKLY SCHEDULE</Text>
                    <Text style={[styles.scheduleText, { color: theme.colors.textPrimary }]}>{split.schedule}</Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          );
        })}

        {/* Save Button */}
        <TouchableOpacity
          style={[styles.selectBtn, { backgroundColor: selected ? accentColor : theme.colors.metallic }]}
          onPress={handleSelect}
          activeOpacity={0.8}
          disabled={!selected}
        >
          <Text style={[styles.selectBtnText, { opacity: selected ? 1 : 0.5 }]}>
            {isOnboarding ? 'Complete Setup' : 'Save Training Split'}
          </Text>
          <Ionicons name={isOnboarding ? 'checkmark-circle' : 'arrow-forward'} size={18} color="#fff" style={{ opacity: selected ? 1 : 0.5 }} />
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
  infoCard: { flexDirection: 'row', gap: 10, padding: 14, borderRadius: 14, borderWidth: 0.5, marginBottom: 16, alignItems: 'flex-start' },
  infoText: { fontSize: 13, lineHeight: 20, flex: 1 },
  splitCard: { padding: 16, borderRadius: 14, borderWidth: 0.5, marginBottom: 10 },
  splitContent: { flex: 1 },
  tagsRow: { flexDirection: 'row', gap: 8, marginBottom: 8, flexWrap: 'wrap' },
  tagBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  tagText: { fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },
  splitHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 },
  iconCircle: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  splitName: { fontSize: 16, fontWeight: '700' },
  splitDays: { fontSize: 12, marginTop: 2 },
  splitDesc: { fontSize: 13, lineHeight: 19, marginBottom: 4, marginLeft: 52 },
  splitBest: { fontSize: 11, fontStyle: 'italic', marginLeft: 52, marginBottom: 4 },
  matchBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  matchDot: { width: 6, height: 6, borderRadius: 3 },
  matchText: { fontSize: 9, fontWeight: '700' },
  radio: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  radioInner: { width: 12, height: 12, borderRadius: 6 },
  detailsToggle: { flexDirection: 'row', alignItems: 'center', gap: 4, marginLeft: 52, paddingVertical: 4 },
  detailsToggleText: { fontSize: 12, fontWeight: '600' },
  scheduleBox: { marginTop: 8, marginLeft: 52, padding: 12, borderRadius: 10, borderWidth: 0.5 },
  scheduleTitle: { fontSize: 10, fontWeight: '700', letterSpacing: 1, marginBottom: 6 },
  scheduleText: { fontSize: 13, lineHeight: 20 },
  selectBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16, borderRadius: 14, marginTop: 12 },
  selectBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
