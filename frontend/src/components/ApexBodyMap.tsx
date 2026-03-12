import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Pressable, Animated, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Body from 'react-native-body-highlighter';
import { useThemeStore } from '../store/themeStore';
import { useMuscleStore } from '../store/muscleStore';
import { useUserStore } from '../store/userStore';
import { MUSCLE_REGIONS, MuscleRegionId } from '../constants/exerciseData';
import { getReadinessColor, getReadinessLabel } from '../constants/theme';

interface ApexBodyMapProps {
  mode?: 'readiness' | 'workout';
  highlightMuscles?: string[];
  onMusclePress?: (muscleId: string) => void;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Mapping from body-highlighter slugs back to our internal muscle IDs (for tap handling)
const SLUG_TO_MUSCLE_ID: { [slug: string]: string } = {
  'chest': 'chest',
  'biceps': 'biceps_left',
  'triceps': 'triceps_left',
  'deltoids': 'shoulders',
  'abs': 'core',
  'obliques': 'obliques_left',
  'quadriceps': 'quads',
  'hamstring': 'hamstrings',
  'gluteal': 'glutes',
  'calves': 'calves',
  'upper-back': 'back',
  'lower-back': 'lower_back',
  'trapezius': 'traps',
};

export const ApexBodyMap: React.FC<ApexBodyMapProps> = ({
  mode = 'readiness',
  highlightMuscles = [],
  onMusclePress,
}) => {
  const { theme, accentColor } = useThemeStore();
  const { muscles, getMuscleReadiness } = useMuscleStore();
  const { gender } = useUserStore();
  const [view, setView] = useState<'front' | 'back'>('front');
  const [selectedMuscle, setSelectedMuscle] = useState<string | null>(null);
  const [flipAnim] = useState(new Animated.Value(0));

  const handleViewChange = (newView: 'front' | 'back') => {
    Animated.sequence([
      Animated.timing(flipAnim, {
        toValue: 0.5,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(flipAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start();
    setTimeout(() => setView(newView), 150);
  };

  const handleMusclePress = (muscleId: string) => {
    setSelectedMuscle(muscleId);
    onMusclePress?.(muscleId);
  };

  const handleBodyPress = (data: { slug: string; intensity: number }) => {
    const internalId = SLUG_TO_MUSCLE_ID[data.slug];
    if (internalId) {
      handleMusclePress(internalId);
    }
  };

  const selectedMuscleData = selectedMuscle ? muscles[selectedMuscle] : null;
  const selectedMuscleInfo = selectedMuscle ? MUSCLE_REGIONS[selectedMuscle as MuscleRegionId] : null;

  const scaleX = flipAnim.interpolate({
    inputRange: [0, 0.5],
    outputRange: [1, 0],
  });

  // Build muscle data for Body component
  let muscleData: { slug: string; intensity: number }[];

  if (mode === 'workout') {
    // Workout mode: highlighted muscles get intensity 2, others get 0
    const allSlugs = [
      'chest', 'biceps', 'triceps', 'deltoids', 'abs', 'obliques',
      'quadriceps', 'hamstring', 'gluteal', 'calves', 'upper-back',
      'lower-back', 'trapezius',
    ];
    muscleData = allSlugs.map(slug => ({
      slug,
      intensity: highlightMuscles.includes(slug) || 
        highlightMuscles.includes(SLUG_TO_MUSCLE_ID[slug] || '') ? 2 : 0,
    }));
  } else {
    // Readiness mode: color based on readiness score
    muscleData = [
      { slug: 'chest', intensity: getMuscleReadiness('chest') > 60 ? 2 : 1 },
      { slug: 'biceps', intensity: getMuscleReadiness('biceps_left') > 60 ? 2 : 1 },
      { slug: 'triceps', intensity: getMuscleReadiness('triceps_left') > 60 ? 2 : 1 },
      { slug: 'deltoids', intensity: getMuscleReadiness('shoulders') > 60 ? 2 : 1 },
      { slug: 'abs', intensity: getMuscleReadiness('core') > 60 ? 2 : 1 },
      { slug: 'obliques', intensity: getMuscleReadiness('obliques_left') > 60 ? 2 : 1 },
      { slug: 'quadriceps', intensity: getMuscleReadiness('quads') > 60 ? 2 : 1 },
      { slug: 'hamstring', intensity: getMuscleReadiness('hamstrings') > 60 ? 2 : 1 },
      { slug: 'gluteal', intensity: getMuscleReadiness('glutes') > 60 ? 2 : 1 },
      { slug: 'calves', intensity: getMuscleReadiness('calves') > 60 ? 2 : 1 },
      { slug: 'upper-back', intensity: getMuscleReadiness('back') > 60 ? 2 : 1 },
      { slug: 'lower-back', intensity: getMuscleReadiness('lower_back') > 60 ? 2 : 1 },
      { slug: 'trapezius', intensity: getMuscleReadiness('traps') > 60 ? 2 : 1 },
    ];
  }

  return (
    <View style={styles.container}>
      {/* Toggle */}
      <View style={[styles.toggleContainer, { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder }]}>
        <TouchableOpacity
          style={[styles.toggleButton, view === 'front' && { backgroundColor: accentColor + '25' }]}
          onPress={() => handleViewChange('front')}
        >
          <Text style={[styles.toggleText, { color: view === 'front' ? accentColor : theme.colors.textSecondary }]}>
            FRONT
          </Text>
        </TouchableOpacity>
        <View style={[styles.toggleDivider, { backgroundColor: theme.colors.cardBorder }]} />
        <TouchableOpacity
          style={[styles.toggleButton, view === 'back' && { backgroundColor: accentColor + '25' }]}
          onPress={() => handleViewChange('back')}
        >
          <Text style={[styles.toggleText, { color: view === 'back' ? accentColor : theme.colors.textSecondary }]}>
            BACK
          </Text>
        </TouchableOpacity>
      </View>

      {/* Body Map */}
      <Animated.View style={[styles.bodyContainer, { transform: [{ scaleX }] }]}>
        <Body
          data={muscleData}
          side={view}
          gender={gender}
          scale={1.4}
          colors={['#8B0000', accentColor]}
          onMusclePress={handleBodyPress}
        />
      </Animated.View>

      {/* Legend */}
      <View style={styles.legend}>
        {mode === 'readiness' ? (
          <>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: accentColor }]} />
              <Text style={[styles.legendText, { color: theme.colors.textSecondary }]}>Recovered</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: theme.colors.readinessGood }]} />
              <Text style={[styles.legendText, { color: theme.colors.textSecondary }]}>Good</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: theme.colors.readinessModerate }]} />
              <Text style={[styles.legendText, { color: theme.colors.textSecondary }]}>Moderate</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: theme.colors.readinessFatigued }]} />
              <Text style={[styles.legendText, { color: theme.colors.textSecondary }]}>Fatigued</Text>
            </View>
          </>
        ) : (
          <>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: accentColor }]} />
              <Text style={[styles.legendText, { color: theme.colors.textSecondary }]}>Target</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#3d4260' }]} />
              <Text style={[styles.legendText, { color: theme.colors.textSecondary }]}>Inactive</Text>
            </View>
          </>
        )}
      </View>

      {/* Muscle Detail Modal */}
      <Modal
        visible={selectedMuscle !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedMuscle(null)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setSelectedMuscle(null)}>
          <View style={[styles.modalContent, { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder }]}>
            {selectedMuscleData && selectedMuscleInfo && (
              <>
                <View style={styles.modalHeader}>
                  <Text style={[styles.modalTitle, { color: theme.colors.textPrimary }]}>
                    {selectedMuscleInfo.name}
                  </Text>
                  <TouchableOpacity onPress={() => setSelectedMuscle(null)}>
                    <Ionicons name="close" size={24} color={theme.colors.textSecondary} />
                  </TouchableOpacity>
                </View>

                <View style={styles.readinessSection}>
                  <View style={[styles.readinessBarBg, { backgroundColor: theme.colors.metallic }]}>
                    <View
                      style={[
                        styles.readinessBarFill,
                        {
                          width: `${selectedMuscleData.readiness}%`,
                          backgroundColor: getReadinessColor(selectedMuscleData.readiness, accentColor, theme),
                        },
                      ]}
                    />
                  </View>
                  <View style={styles.readinessLabels}>
                    <Text style={[styles.readinessValue, { color: getReadinessColor(selectedMuscleData.readiness, accentColor, theme) }]}>
                      {Math.round(selectedMuscleData.readiness)}%
                    </Text>
                    <Text style={[styles.readinessStatus, { color: theme.colors.textSecondary }]}>
                      {getReadinessLabel(selectedMuscleData.readiness)}
                    </Text>
                  </View>
                </View>

                <View style={[styles.detailRow, { borderColor: theme.colors.cardBorder }]}>
                  <Text style={[styles.detailLabel, { color: theme.colors.textSecondary }]}>Last Trained</Text>
                  <Text style={[styles.detailValue, { color: theme.colors.textPrimary }]}>
                    {selectedMuscleData.lastTrained
                      ? `${Math.floor((Date.now() - new Date(selectedMuscleData.lastTrained).getTime()) / (1000 * 60 * 60))}h ago`
                      : 'Not recently'}
                  </Text>
                </View>

                <View style={[styles.detailRow, { borderColor: theme.colors.cardBorder }]}>
                  <Text style={[styles.detailLabel, { color: theme.colors.textSecondary }]}>Est. Full Recovery</Text>
                  <Text style={[styles.detailValue, { color: theme.colors.textPrimary }]}>
                    {selectedMuscleData.estimatedRecoveryHours > 0
                      ? `${selectedMuscleData.estimatedRecoveryHours}h`
                      : 'Recovered'}
                  </Text>
                </View>

                {selectedMuscleData.lastExercises.length > 0 && (
                  <View style={styles.exercisesSection}>
                    <Text style={[styles.exercisesTitle, { color: theme.colors.textSecondary }]}>RECENT EXERCISES</Text>
                    <View style={styles.exercisesTags}>
                      {selectedMuscleData.lastExercises.slice(0, 3).map((ex, i) => (
                        <View key={i} style={[styles.exerciseTag, { backgroundColor: theme.colors.backgroundSecondary }]}>
                          <Text style={[styles.exerciseTagText, { color: theme.colors.textPrimary }]}>{ex}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}
              </>
            )}
          </View>
        </Pressable>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  toggleContainer: {
    flexDirection: 'row',
    borderWidth: 1,
    marginBottom: 20,
    overflow: 'hidden',
  },
  toggleButton: {
    paddingHorizontal: 32,
    paddingVertical: 12,
  },
  toggleDivider: {
    width: 1,
  },
  toggleText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 2,
  },
  bodyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    marginTop: 20,
    gap: 16,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 6,
  },
  legendText: {
    fontSize: 11,
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    width: '100%',
    maxWidth: 360,
    borderWidth: 0.5,
    borderRadius: 20,
    padding: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  readinessSection: {
    marginBottom: 24,
  },
  readinessBarBg: {
    height: 8,
    marginBottom: 12,
  },
  readinessBarFill: {
    height: '100%',
  },
  readinessLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  readinessValue: {
    fontSize: 36,
    fontWeight: '700',
  },
  readinessStatus: {
    fontSize: 14,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  detailLabel: {
    fontSize: 14,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  exercisesSection: {
    marginTop: 20,
  },
  exercisesTitle: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1,
    marginBottom: 12,
  },
  exercisesTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  exerciseTag: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  exerciseTagText: {
    fontSize: 12,
    fontWeight: '500',
  },
});

export default ApexBodyMap;
