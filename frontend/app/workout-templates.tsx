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
import { useRouter } from 'expo-router';
import { useThemeStore } from '../src/store/themeStore';
import { WORKOUT_TEMPLATES } from '../src/store/exerciseStore';
import { useUserStore } from '../src/store/userStore';
import { STYLE_TEMPLATE_COMPAT } from '../src/utils/trainingHelpers';

const CATEGORIES = ['All', 'Push', 'Pull', 'Legs', 'Upper', 'Full Body', 'Bodyweight', 'Strength', 'HIIT', 'Dumbbell'];

export default function WorkoutTemplatesScreen() {
  const router = useRouter();
  const theme = useThemeStore((s) => s.theme);
  const accentColor = useThemeStore((s) => s.accentColor);
  const { profile } = useUserStore();
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const userStyle = profile?.trainingStyle;
  const styleCompat = userStyle ? STYLE_TEMPLATE_COMPAT[userStyle] : null;

  const getStyleStatus = (tpl: typeof WORKOUT_TEMPLATES[0]): 'match' | 'conflict' | 'neutral' => {
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

  const getDifficultyColor = (d: string) => {
    if (d === 'beginner') return '#4CAF50';
    if (d === 'intermediate') return '#FF9800';
    return '#F44336';
  };

  const handleUseTemplate = (template: typeof WORKOUT_TEMPLATES[0]) => {
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

      {/* Category Filter */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow} contentContainerStyle={styles.filterContent}>
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
                          <Text style={[styles.exerciseSets, { color: theme.colors.textMuted }]}>{ex.sets} × {ex.reps} · {ex.restSeconds}s rest</Text>
                        </View>
                      </View>
                    ))}
                  </View>

                  {/* Use Template Button */}
                  <TouchableOpacity
                    style={[styles.useBtn, { backgroundColor: accentColor }]}
                    onPress={() => handleUseTemplate(template)}
                  >
                    <Ionicons name="copy-outline" size={18} color="#fff" />
                    <Text style={styles.useBtnText}>Use This Template</Text>
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
  filterRow: { maxHeight: 44, marginBottom: 8 },
  filterContent: { paddingHorizontal: 20, gap: 8 },
  filterChip: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, borderWidth: 1 },
  filterChipText: { fontSize: 12, fontWeight: '600' },
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
  exerciseList: { borderRadius: 12, borderWidth: 0.5, overflow: 'hidden', marginBottom: 12 },
  exerciseRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10, gap: 10 },
  exerciseNum: { fontSize: 14, fontWeight: '700', width: 20, textAlign: 'center' },
  exerciseName: { fontSize: 14, fontWeight: '600' },
  exerciseSets: { fontSize: 12, marginTop: 2 },
  useBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 12 },
  useBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  emptyState: { alignItems: 'center', paddingVertical: 60 },
  emptyText: { fontSize: 14 },
});
