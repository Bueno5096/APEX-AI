import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useThemeStore } from '../src/store/themeStore';
import { useExerciseStore } from '../src/store/exerciseStore';

const MUSCLE_FILTERS = ['All', 'Chest', 'Back', 'Shoulders', 'Biceps', 'Triceps', 'Quads', 'Hamstrings', 'Glutes', 'Core', 'Calves', 'Full Body'];
const EQUIPMENT_FILTERS = ['All', 'Barbell', 'Dumbbell', 'Cable machine', 'Bodyweight', 'Kettlebell'];

export default function ExerciseBrowserScreen() {
  const router = useRouter();
  const theme = useThemeStore((s) => s.theme);
  const accentColor = useThemeStore((s) => s.accentColor);
  const { exercises } = useExerciseStore();
  
  const [search, setSearch] = useState('');
  const [muscleFilter, setMuscleFilter] = useState('All');
  const [equipmentFilter, setEquipmentFilter] = useState('All');
  const [selectedExercises, setSelectedExercises] = useState<string[]>([]);

  const filtered = useMemo(() => {
    return exercises.filter((ex) => {
      const matchSearch = !search || ex.name.toLowerCase().includes(search.toLowerCase());
      const matchMuscle = muscleFilter === 'All' || ex.primaryMuscle === muscleFilter;
      const matchEquip = equipmentFilter === 'All' || ex.equipment.toLowerCase().includes(equipmentFilter.toLowerCase());
      return matchSearch && matchMuscle && matchEquip;
    });
  }, [exercises, search, muscleFilter, equipmentFilter]);

  const toggleSelect = (id: string) => {
    setSelectedExercises((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleContinue = () => {
    // Pass selected exercise IDs to workout builder
    router.push({
      pathname: '/workout-builder',
      params: { exerciseIds: selectedExercises.join(',') },
    });
  };

  const getDifficultyColor = (d: string) => {
    if (d === 'beginner') return '#4CAF50';
    if (d === 'intermediate') return '#FF9800';
    return '#F44336';
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={theme.colors.textPrimary} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={[styles.headerTitle, { color: theme.colors.textPrimary }]}>EXERCISE LIBRARY</Text>
          <Text style={[styles.headerSub, { color: theme.colors.textMuted }]}>
            {selectedExercises.length > 0 ? `${selectedExercises.length} selected` : 'Tap exercises to add them'}
          </Text>
        </View>
      </View>

      {/* Search */}
      <View style={[styles.searchRow, { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder }]}>
        <Ionicons name="search" size={18} color={theme.colors.textMuted} />
        <TextInput
          style={[styles.searchInput, { color: theme.colors.textPrimary }]}
          value={search}
          onChangeText={setSearch}
          placeholder="Search exercises..."
          placeholderTextColor={theme.colors.textMuted}
        />
        {search ? (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={18} color={theme.colors.textMuted} />
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Muscle Filter */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow} contentContainerStyle={styles.filterContent}>
        {MUSCLE_FILTERS.map((m) => (
          <TouchableOpacity
            key={m}
            style={[
              styles.filterChip,
              { borderColor: theme.colors.cardBorder },
              muscleFilter === m && { backgroundColor: accentColor + '20', borderColor: accentColor },
            ]}
            onPress={() => setMuscleFilter(m)}
          >
            <Text style={[styles.filterChipText, { color: muscleFilter === m ? accentColor : theme.colors.textSecondary }]}>{m}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Equipment Filter */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow} contentContainerStyle={styles.filterContent}>
        {EQUIPMENT_FILTERS.map((e) => (
          <TouchableOpacity
            key={e}
            style={[
              styles.filterChip,
              { borderColor: theme.colors.cardBorder },
              equipmentFilter === e && { backgroundColor: accentColor + '20', borderColor: accentColor },
            ]}
            onPress={() => setEquipmentFilter(e)}
          >
            <Text style={[styles.filterChipText, { color: equipmentFilter === e ? accentColor : theme.colors.textSecondary }]}>{e}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Results Count */}
      <Text style={[styles.resultCount, { color: theme.colors.textMuted }]}>
        {filtered.length} exercises found
      </Text>

      {/* Exercise List */}
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => {
          const isSelected = selectedExercises.includes(item.id);
          return (
            <TouchableOpacity
              style={[
                styles.exerciseCard,
                { backgroundColor: theme.colors.card, borderColor: isSelected ? accentColor : theme.colors.cardBorder },
                isSelected && { borderLeftWidth: 3, borderLeftColor: accentColor },
              ]}
              onPress={() => toggleSelect(item.id)}
              activeOpacity={0.7}
            >
              <View style={styles.exRow}>
                <View style={[styles.exIcon, { backgroundColor: isSelected ? accentColor + '20' : theme.colors.backgroundSecondary }]}>
                  <Ionicons
                    name={isSelected ? 'checkmark' : 'barbell'}
                    size={18}
                    color={isSelected ? accentColor : theme.colors.textSecondary}
                  />
                </View>
                <View style={styles.exInfo}>
                  <Text style={[styles.exName, { color: theme.colors.textPrimary }]}>{item.name}</Text>
                  <View style={styles.exMeta}>
                    <Text style={[styles.exMuscle, { color: accentColor }]}>{item.primaryMuscle}</Text>
                    <Text style={[styles.exDot, { color: theme.colors.textMuted }]}> · </Text>
                    <Text style={[styles.exEquip, { color: theme.colors.textSecondary }]}>{item.equipment}</Text>
                  </View>
                  <View style={styles.exTags}>
                    <View style={[styles.diffTag, { backgroundColor: getDifficultyColor(item.difficulty) + '15' }]}>
                      <Text style={[styles.diffTagText, { color: getDifficultyColor(item.difficulty) }]}>{item.difficulty}</Text>
                    </View>
                    <Text style={[styles.exDefault, { color: theme.colors.textMuted }]}>
                      {item.defaultSets}×{item.defaultReps}
                    </Text>
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          );
        }}
      />

      {/* Continue Button */}
      {selectedExercises.length > 0 && (
        <View style={[styles.bottomBar, { backgroundColor: theme.colors.background, borderTopColor: theme.colors.cardBorder }]}>
          <TouchableOpacity
            style={[styles.continueBtn, { backgroundColor: accentColor }]}
            onPress={handleContinue}
          >
            <Text style={styles.continueBtnText}>Continue with {selectedExercises.length} exercises</Text>
            <Ionicons name="arrow-forward" size={18} color="#fff" />
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12, gap: 8 },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '800', letterSpacing: 1.5 },
  headerSub: { fontSize: 12, marginTop: 2 },
  searchRow: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 20, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, borderWidth: 0.5, gap: 8 },
  searchInput: { flex: 1, fontSize: 15, padding: 0 },
  filterRow: { maxHeight: 44, marginTop: 8 },
  filterContent: { paddingHorizontal: 20, gap: 8 },
  filterChip: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, borderWidth: 1 },
  filterChipText: { fontSize: 12, fontWeight: '600' },
  resultCount: { paddingHorizontal: 20, paddingVertical: 8, fontSize: 12 },
  listContent: { paddingHorizontal: 20, paddingBottom: 100 },
  exerciseCard: { padding: 14, borderRadius: 12, borderWidth: 0.5, marginBottom: 8 },
  exRow: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  exIcon: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  exInfo: { flex: 1 },
  exName: { fontSize: 15, fontWeight: '600', marginBottom: 2 },
  exMeta: { flexDirection: 'row', alignItems: 'center' },
  exMuscle: { fontSize: 12, fontWeight: '600' },
  exDot: { fontSize: 12 },
  exEquip: { fontSize: 12 },
  exTags: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  diffTag: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  diffTagText: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },
  exDefault: { fontSize: 11 },
  bottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 20, borderTopWidth: 0.5 },
  continueBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16, borderRadius: 14 },
  continueBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
