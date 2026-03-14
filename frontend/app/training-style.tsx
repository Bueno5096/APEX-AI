import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useThemeStore } from '../src/store/themeStore';
import { useUserStore, TrainingStyle } from '../src/store/userStore';
import { TRAINING_STYLES } from '../src/store/exerciseStore';

export default function TrainingStyleScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const isOnboarding = params.fromOnboarding === 'true';
  const theme = useThemeStore((s) => s.theme);
  const accentColor = useThemeStore((s) => s.accentColor);
  const { profile, setProfile } = useUserStore();

  const [selected, setSelected] = useState<string>(profile?.trainingStyle || '');
  const [hybridSelections, setHybridSelections] = useState<string[]>(
    profile?.hybridStyles?.map(s => s) || []
  );
  const [sportName, setSportName] = useState(profile?.sport || '');
  const [expandedKey, setExpandedKey] = useState<string | null>(null);

  const isHybrid = selected === 'hybrid';
  const isSportSpecific = selected === 'sport_specific';

  const toggleHybridStyle = (key: string) => {
    if (key === 'hybrid') return;
    setHybridSelections((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : prev.length < 3 ? [...prev, key] : prev
    );
  };

  const canProceed = () => {
    if (!selected) return false;
    if (isHybrid && hybridSelections.length < 2) return false;
    if (isSportSpecific && !sportName.trim()) return false;
    return true;
  };

  const handleSelect = () => {
    if (!canProceed() || !profile) return;
    const updates: any = {
      ...profile,
      trainingStyle: selected as TrainingStyle,
    };
    if (isSportSpecific) {
      updates.sport = sportName.trim();
    }
    if (isHybrid) {
      updates.hybridStyles = hybridSelections as TrainingStyle[];
    }
    setProfile(updates);

    if (isOnboarding) {
      router.push('/training-split?fromOnboarding=true');
    } else {
      router.back();
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={24} color={theme.colors.textPrimary} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={[styles.headerTitle, { color: theme.colors.textPrimary }]}>TRAINING STYLE</Text>
            <Text style={[styles.headerSub, { color: theme.colors.textMuted }]}>How do you want to train?</Text>
          </View>
          {isOnboarding && (
            <Text style={[styles.stepIndicator, { color: accentColor }]}>Step 1/2</Text>
          )}
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Info Card */}
          <View style={[styles.infoCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder }]}>
            <Ionicons name="information-circle-outline" size={18} color={accentColor} />
            <Text style={[styles.infoText, { color: theme.colors.textMuted }]}>
              {isHybrid
                ? 'Select 2-3 training styles to combine. APEX will rotate between them for a balanced program.'
                : 'Your training style determines the philosophy behind your workouts. APEX will use this to select exercises, rep ranges, and coaching cues.'}
            </Text>
          </View>

          {/* Style Cards */}
          {TRAINING_STYLES.map((style) => {
            const isSelected = isHybrid
              ? hybridSelections.includes(style.key)
              : selected === style.key;
            const isExpanded = expandedKey === style.key;
            const isDisabledInHybrid = isHybrid && style.key === 'hybrid';

            return (
              <TouchableOpacity
                key={style.key}
                style={[
                  styles.styleCard,
                  {
                    backgroundColor: theme.colors.card,
                    borderColor: isSelected ? accentColor : theme.colors.cardBorder,
                  },
                  isSelected && { borderLeftWidth: 3, borderLeftColor: accentColor },
                  isDisabledInHybrid && { opacity: 0.3 },
                ]}
                onPress={() => {
                  if (isDisabledInHybrid) return;
                  if (isHybrid) {
                    toggleHybridStyle(style.key);
                  } else {
                    setSelected(style.key);
                  }
                }}
                activeOpacity={0.7}
              >
                <View style={styles.styleContent}>
                  <View style={styles.styleHeader}>
                    <View style={[styles.iconCircle, { backgroundColor: isSelected ? accentColor + '20' : theme.colors.backgroundSecondary }]}>
                      <Ionicons
                        name={style.icon as any}
                        size={20}
                        color={isSelected ? accentColor : theme.colors.textSecondary}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.styleName, { color: theme.colors.textPrimary }]}>
                        {style.name}
                      </Text>
                      {style.key === 'hybrid' && (
                        <Text style={[styles.hybridBadge, { color: accentColor }]}>MULTI-SELECT</Text>
                      )}
                    </View>

                    {/* Radio or Checkbox */}
                    {isHybrid && style.key !== 'hybrid' ? (
                      <View style={[styles.checkbox, { borderColor: isSelected ? accentColor : theme.colors.textMuted }]}>
                        {isSelected && (
                          <Ionicons name="checkmark" size={14} color={accentColor} />
                        )}
                      </View>
                    ) : (
                      <View style={[styles.radio, { borderColor: isSelected ? accentColor : theme.colors.textMuted }]}>
                        {isSelected && <View style={[styles.radioInner, { backgroundColor: accentColor }]} />}
                      </View>
                    )}
                  </View>

                  <Text style={[styles.styleDesc, { color: theme.colors.textMuted }]}>
                    {style.description}
                  </Text>

                  {/* Expand/collapse details */}
                  <TouchableOpacity
                    style={styles.detailsToggle}
                    onPress={() => setExpandedKey(isExpanded ? null : style.key)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Text style={[styles.detailsToggleText, { color: accentColor }]}>
                      {isExpanded ? 'Less details' : 'More details'}
                    </Text>
                    <Ionicons
                      name={isExpanded ? 'chevron-up' : 'chevron-down'}
                      size={14}
                      color={accentColor}
                    />
                  </TouchableOpacity>

                  {isExpanded && (
                    <View style={[styles.detailsContainer, { backgroundColor: theme.colors.backgroundSecondary, borderColor: theme.colors.cardBorder }]}>
                      <View style={styles.detailRow}>
                        <Text style={[styles.detailLabel, { color: theme.colors.textSecondary }]}>Rep Ranges</Text>
                        <Text style={[styles.detailValue, { color: theme.colors.textPrimary }]}>{style.repRanges}</Text>
                      </View>
                      <View style={[styles.detailDivider, { backgroundColor: theme.colors.cardBorder }]} />
                      <View style={styles.detailRow}>
                        <Text style={[styles.detailLabel, { color: theme.colors.textSecondary }]}>Focus</Text>
                        <Text style={[styles.detailValue, { color: theme.colors.textPrimary }]}>{style.focus}</Text>
                      </View>
                      <View style={[styles.detailDivider, { backgroundColor: theme.colors.cardBorder }]} />
                      <View style={styles.detailRow}>
                        <Text style={[styles.detailLabel, { color: theme.colors.textSecondary }]}>Coach Behavior</Text>
                        <Text style={[styles.detailValue, { color: theme.colors.textPrimary }]}>{style.coachBehavior}</Text>
                      </View>
                      <View style={[styles.detailDivider, { backgroundColor: theme.colors.cardBorder }]} />
                      <View style={styles.detailRow}>
                        <Text style={[styles.detailLabel, { color: theme.colors.textSecondary }]}>Best For</Text>
                        <Text style={[styles.detailValue, { color: theme.colors.textPrimary }]}>{style.bestFor}</Text>
                      </View>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            );
          })}

          {/* Sport Specific Input */}
          {isSportSpecific && (
            <View style={[styles.sportInputCard, { backgroundColor: theme.colors.card, borderColor: accentColor }]}>
              <Text style={[styles.sportInputLabel, { color: theme.colors.textPrimary }]}>
                What sport do you play?
              </Text>
              <TextInput
                style={[styles.sportInput, { backgroundColor: theme.colors.backgroundSecondary, color: theme.colors.textPrimary, borderColor: theme.colors.cardBorder }]}
                value={sportName}
                onChangeText={setSportName}
                placeholder="e.g. Basketball, Soccer, Tennis..."
                placeholderTextColor={theme.colors.textMuted}
                autoFocus
              />
              <Text style={[styles.sportInputHint, { color: theme.colors.textMuted }]}>
                APEX will tailor your training to improve performance in this sport
              </Text>
            </View>
          )}

          {/* Hybrid Status */}
          {isHybrid && (
            <View style={[styles.hybridStatus, { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder }]}>
              <Text style={[styles.hybridStatusLabel, { color: theme.colors.textSecondary }]}>
                Selected ({hybridSelections.length}/3):
              </Text>
              <View style={styles.hybridChips}>
                {hybridSelections.map((key) => {
                  const s = TRAINING_STYLES.find((t) => t.key === key);
                  return (
                    <View key={key} style={[styles.hybridChip, { backgroundColor: accentColor + '20', borderColor: accentColor }]}>
                      <Text style={[styles.hybridChipText, { color: accentColor }]}>{s?.name || key}</Text>
                      <TouchableOpacity onPress={() => toggleHybridStyle(key)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                        <Ionicons name="close-circle" size={16} color={accentColor} />
                      </TouchableOpacity>
                    </View>
                  );
                })}
                {hybridSelections.length < 2 && (
                  <Text style={[styles.hybridHint, { color: theme.colors.danger }]}>Select at least 2 styles</Text>
                )}
              </View>
            </View>
          )}

          {/* Save Button */}
          <TouchableOpacity
            style={[styles.selectBtn, { backgroundColor: canProceed() ? accentColor : theme.colors.metallic }]}
            onPress={handleSelect}
            activeOpacity={0.8}
            disabled={!canProceed()}
          >
            <Text style={[styles.selectBtnText, { opacity: canProceed() ? 1 : 0.5 }]}>
              {isOnboarding ? 'Continue to Training Split' : 'Save Training Style'}
            </Text>
            <Ionicons name="arrow-forward" size={18} color="#fff" style={{ opacity: canProceed() ? 1 : 0.5 }} />
          </TouchableOpacity>

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
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
  styleCard: { padding: 16, borderRadius: 14, borderWidth: 0.5, marginBottom: 10 },
  styleContent: { flex: 1 },
  styleHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 },
  iconCircle: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  styleName: { fontSize: 16, fontWeight: '700' },
  hybridBadge: { fontSize: 10, fontWeight: '700', letterSpacing: 1, marginTop: 2 },
  styleDesc: { fontSize: 13, lineHeight: 19, marginBottom: 4, marginLeft: 52 },
  detailsToggle: { flexDirection: 'row', alignItems: 'center', gap: 4, marginLeft: 52, paddingVertical: 4 },
  detailsToggleText: { fontSize: 12, fontWeight: '600' },
  detailsContainer: { marginTop: 8, padding: 12, borderRadius: 10, borderWidth: 0.5, marginLeft: 52 },
  detailRow: { paddingVertical: 6 },
  detailLabel: { fontSize: 11, fontWeight: '600', letterSpacing: 0.5, marginBottom: 2 },
  detailValue: { fontSize: 13, lineHeight: 18 },
  detailDivider: { height: 0.5, marginVertical: 2 },
  radio: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  radioInner: { width: 12, height: 12, borderRadius: 6 },
  checkbox: { width: 24, height: 24, borderRadius: 6, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  sportInputCard: { padding: 16, borderRadius: 14, borderWidth: 1, marginBottom: 10 },
  sportInputLabel: { fontSize: 15, fontWeight: '600', marginBottom: 10 },
  sportInput: { padding: 14, borderRadius: 12, fontSize: 16, borderWidth: 0.5 },
  sportInputHint: { fontSize: 12, marginTop: 8, lineHeight: 18 },
  hybridStatus: { padding: 14, borderRadius: 14, borderWidth: 0.5, marginBottom: 10 },
  hybridStatusLabel: { fontSize: 12, fontWeight: '600', marginBottom: 8 },
  hybridChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  hybridChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 0.5 },
  hybridChipText: { fontSize: 13, fontWeight: '600' },
  hybridHint: { fontSize: 12, fontWeight: '500', marginTop: 4 },
  selectBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16, borderRadius: 14, marginTop: 12 },
  selectBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
