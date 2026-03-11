import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Pressable, Dimensions } from 'react-native';
import { useThemeStore } from '../store/themeStore';
import { MuscleReadiness } from '../store/healthStore';
import { Ionicons } from '@expo/vector-icons';

interface BodyMapProps {
  muscles: MuscleReadiness[];
  highlightMuscles?: string[];
  mode?: 'readiness' | 'workout';
  onMusclePress?: (muscle: MuscleReadiness) => void;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Muscle positions for front and back view (percentages)
const FRONT_MUSCLE_POSITIONS = {
  shoulders: { top: 12, left: 15, width: 70, height: 12, label: 'Shoulders' },
  chest: { top: 18, left: 25, width: 50, height: 14, label: 'Chest' },
  biceps: { top: 22, left: 8, width: 18, height: 18, label: 'Biceps' },
  bicepsR: { top: 22, left: 74, width: 18, height: 18, label: 'Biceps' },
  core: { top: 32, left: 32, width: 36, height: 22, label: 'Core' },
  forearms: { top: 40, left: 5, width: 16, height: 16, label: 'Forearms' },
  forearmsR: { top: 40, left: 79, width: 16, height: 16, label: 'Forearms' },
  quads: { top: 55, left: 25, width: 50, height: 22, label: 'Quads' },
  calves: { top: 78, left: 28, width: 44, height: 18, label: 'Calves' },
};

const BACK_MUSCLE_POSITIONS = {
  traps: { top: 10, left: 30, width: 40, height: 12, label: 'Traps' },
  shoulders: { top: 14, left: 15, width: 70, height: 10, label: 'Shoulders' },
  back: { top: 22, left: 25, width: 50, height: 20, label: 'Back' },
  triceps: { top: 22, left: 8, width: 18, height: 16, label: 'Triceps' },
  tricepsR: { top: 22, left: 74, width: 18, height: 16, label: 'Triceps' },
  forearms: { top: 38, left: 5, width: 16, height: 14, label: 'Forearms' },
  forearmsR: { top: 38, left: 79, width: 16, height: 14, label: 'Forearms' },
  glutes: { top: 42, left: 28, width: 44, height: 14, label: 'Glutes' },
  hamstrings: { top: 56, left: 25, width: 50, height: 20, label: 'Hamstrings' },
  calves: { top: 78, left: 28, width: 44, height: 18, label: 'Calves' },
};

export const BodyMapEnhanced: React.FC<BodyMapProps> = ({
  muscles,
  highlightMuscles = [],
  mode = 'readiness',
  onMusclePress,
}) => {
  const { theme, accentColor } = useThemeStore();
  const [view, setView] = useState<'front' | 'back'>('front');
  const [selectedMuscle, setSelectedMuscle] = useState<MuscleReadiness | null>(null);

  const bodyWidth = Math.min(SCREEN_WIDTH - 80, 240);
  const bodyHeight = bodyWidth * 1.8;

  // Get color based on readiness
  const getReadinessColor = (readiness: number): string => {
    if (readiness >= 80) return accentColor;
    if (readiness >= 65) return '#7AAABB';
    if (readiness >= 50) return '#CC9966';
    if (readiness >= 35) return '#DD8877';
    return '#EE8888';
  };

  const getMuscleColor = (muscleId: string): string => {
    // Handle left/right variants
    const baseMuscleId = muscleId.replace('R', '').replace('L', '');
    
    if (mode === 'workout') {
      return highlightMuscles.includes(baseMuscleId) ? accentColor : '#3A3A45';
    }
    const muscle = muscles.find((m) => m.id === baseMuscleId);
    if (!muscle) return '#3A3A45';
    return getReadinessColor(muscle.readiness);
  };

  const handleMusclePress = (muscleId: string) => {
    const baseMuscleId = muscleId.replace('R', '').replace('L', '');
    const muscle = muscles.find((m) => m.id === baseMuscleId);
    if (muscle) {
      setSelectedMuscle(muscle);
      onMusclePress?.(muscle);
    }
  };

  const positions = view === 'front' ? FRONT_MUSCLE_POSITIONS : BACK_MUSCLE_POSITIONS;

  return (
    <View style={styles.container}>
      {/* View Toggle */}
      <View style={[styles.toggleContainer, { backgroundColor: theme.colors.card }]}>
        <TouchableOpacity
          style={[
            styles.toggleButton,
            view === 'front' && { backgroundColor: accentColor + '30' },
          ]}
          onPress={() => setView('front')}
        >
          <Text
            style={[
              styles.toggleText,
              { color: view === 'front' ? accentColor : theme.colors.textSecondary },
            ]}
          >
            Front
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.toggleButton,
            view === 'back' && { backgroundColor: accentColor + '30' },
          ]}
          onPress={() => setView('back')}
        >
          <Text
            style={[
              styles.toggleText,
              { color: view === 'back' ? accentColor : theme.colors.textSecondary },
            ]}
          >
            Back
          </Text>
        </TouchableOpacity>
      </View>

      {/* Body Silhouette with Muscle Regions */}
      <View style={[styles.bodyContainer, { width: bodyWidth, height: bodyHeight }]}>
        {/* Body silhouette background */}
        <View style={[styles.bodySilhouette, { backgroundColor: '#2A2A35' }]}>
          {/* Head */}
          <View style={[styles.head, { backgroundColor: '#3A3A45' }]} />
          
          {/* Neck */}
          <View style={[styles.neck, { backgroundColor: '#353540' }]} />
          
          {/* Torso */}
          <View style={[styles.torso, { backgroundColor: '#303038' }]} />
          
          {/* Arms */}
          <View style={[styles.leftArm, { backgroundColor: '#323240' }]} />
          <View style={[styles.rightArm, { backgroundColor: '#323240' }]} />
          
          {/* Legs */}
          <View style={[styles.leftLeg, { backgroundColor: '#303038' }]} />
          <View style={[styles.rightLeg, { backgroundColor: '#303038' }]} />
        </View>

        {/* Muscle regions overlay */}
        {Object.entries(positions).map(([muscleId, pos]) => (
          <TouchableOpacity
            key={muscleId}
            style={[
              styles.muscleRegion,
              {
                top: `${pos.top}%`,
                left: `${pos.left}%`,
                width: `${pos.width}%`,
                height: `${pos.height}%`,
                backgroundColor: getMuscleColor(muscleId),
                borderColor: theme.colors.metallicDark,
              },
            ]}
            onPress={() => handleMusclePress(muscleId)}
            activeOpacity={0.7}
          >
            <Text style={styles.muscleLabel} numberOfLines={1}>
              {pos.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Legend */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: accentColor }]} />
          <Text style={[styles.legendText, { color: theme.colors.textSecondary }]}>
            Recovered
          </Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#7AAABB' }]} />
          <Text style={[styles.legendText, { color: theme.colors.textSecondary }]}>
            Good
          </Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#CC9966' }]} />
          <Text style={[styles.legendText, { color: theme.colors.textSecondary }]}>
            Moderate
          </Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#EE8888' }]} />
          <Text style={[styles.legendText, { color: theme.colors.textSecondary }]}>
            Fatigued
          </Text>
        </View>
      </View>

      {/* Muscle Detail Modal */}
      <Modal
        visible={selectedMuscle !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedMuscle(null)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setSelectedMuscle(null)}
        >
          <View style={[styles.modalContent, { backgroundColor: theme.colors.card }]}>
            {selectedMuscle && (
              <>
                <View style={styles.modalHeader}>
                  <Text style={[styles.modalTitle, { color: theme.colors.textPrimary }]}>
                    {selectedMuscle.name}
                  </Text>
                  <TouchableOpacity onPress={() => setSelectedMuscle(null)}>
                    <Ionicons name="close" size={24} color={theme.colors.textSecondary} />
                  </TouchableOpacity>
                </View>

                {/* Readiness Bar */}
                <View style={styles.readinessBarContainer}>
                  <View style={[styles.readinessBarBg, { backgroundColor: theme.colors.metallic }]}>
                    <View
                      style={[
                        styles.readinessBarFill,
                        {
                          width: `${selectedMuscle.readiness}%`,
                          backgroundColor: getReadinessColor(selectedMuscle.readiness),
                        },
                      ]}
                    />
                  </View>
                  <Text style={[styles.readinessValue, { color: getReadinessColor(selectedMuscle.readiness) }]}>
                    {selectedMuscle.readiness}% Ready
                  </Text>
                </View>

                <View style={styles.modalRow}>
                  <Text style={[styles.modalLabel, { color: theme.colors.textSecondary }]}>
                    Status
                  </Text>
                  <Text style={[styles.modalValue, { color: getReadinessColor(selectedMuscle.readiness) }]}>
                    {selectedMuscle.readiness >= 80 ? 'Fully Recovered' :
                     selectedMuscle.readiness >= 65 ? 'Good to Train' :
                     selectedMuscle.readiness >= 50 ? 'Moderate Fatigue' :
                     selectedMuscle.readiness >= 35 ? 'Fatigued' : 'Very Fatigued'}
                  </Text>
                </View>

                <View style={styles.modalRow}>
                  <Text style={[styles.modalLabel, { color: theme.colors.textSecondary }]}>
                    Last Trained
                  </Text>
                  <Text style={[styles.modalValue, { color: theme.colors.textPrimary }]}>
                    {selectedMuscle.lastTrained
                      ? `${Math.floor((Date.now() - selectedMuscle.lastTrained.getTime()) / (24 * 60 * 60 * 1000))} days ago`
                      : 'Not recently'}
                  </Text>
                </View>

                <View style={styles.modalRow}>
                  <Text style={[styles.modalLabel, { color: theme.colors.textSecondary }]}>
                    Est. Recovery
                  </Text>
                  <Text style={[styles.modalValue, { color: theme.colors.textPrimary }]}>
                    {selectedMuscle.estimatedRecovery > 0
                      ? `${selectedMuscle.estimatedRecovery}h remaining`
                      : 'Recovered'}
                  </Text>
                </View>

                <View style={styles.exercisesList}>
                  <Text style={[styles.exercisesTitle, { color: theme.colors.textSecondary }]}>
                    Affected Exercises
                  </Text>
                  <View style={styles.exerciseTags}>
                    {selectedMuscle.affectedExercises.map((ex, i) => (
                      <View
                        key={i}
                        style={[styles.exerciseTag, { backgroundColor: theme.colors.backgroundSecondary }]}
                      >
                        <Text style={[styles.exerciseTagText, { color: theme.colors.textPrimary }]}>
                          {ex}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
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
    paddingVertical: 10,
  },
  toggleContainer: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
  },
  toggleButton: {
    paddingHorizontal: 28,
    paddingVertical: 10,
    borderRadius: 8,
  },
  toggleText: {
    fontSize: 14,
    fontWeight: '600',
  },
  bodyContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bodySilhouette: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    alignItems: 'center',
    borderRadius: 8,
  },
  head: {
    position: 'absolute',
    top: '2%',
    width: '22%',
    height: '10%',
    borderRadius: 100,
  },
  neck: {
    position: 'absolute',
    top: '10%',
    width: '12%',
    height: '4%',
    borderRadius: 4,
  },
  torso: {
    position: 'absolute',
    top: '14%',
    width: '50%',
    height: '38%',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
  },
  leftArm: {
    position: 'absolute',
    top: '14%',
    left: '8%',
    width: '16%',
    height: '42%',
    borderRadius: 8,
    transform: [{ rotate: '-5deg' }],
  },
  rightArm: {
    position: 'absolute',
    top: '14%',
    right: '8%',
    width: '16%',
    height: '42%',
    borderRadius: 8,
    transform: [{ rotate: '5deg' }],
  },
  leftLeg: {
    position: 'absolute',
    top: '52%',
    left: '26%',
    width: '20%',
    height: '46%',
    borderRadius: 8,
    transform: [{ rotate: '-2deg' }],
  },
  rightLeg: {
    position: 'absolute',
    top: '52%',
    right: '26%',
    width: '20%',
    height: '46%',
    borderRadius: 8,
    transform: [{ rotate: '2deg' }],
  },
  muscleRegion: {
    position: 'absolute',
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.9,
  },
  muscleLabel: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '600',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    marginTop: 20,
    gap: 14,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 6,
  },
  legendText: {
    fontSize: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 340,
    borderRadius: 20,
    padding: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '700',
  },
  readinessBarContainer: {
    marginBottom: 20,
  },
  readinessBarBg: {
    height: 10,
    borderRadius: 5,
    overflow: 'hidden',
    marginBottom: 10,
  },
  readinessBarFill: {
    height: '100%',
    borderRadius: 5,
  },
  readinessValue: {
    fontSize: 32,
    fontWeight: '700',
    textAlign: 'center',
  },
  modalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  modalLabel: {
    fontSize: 15,
  },
  modalValue: {
    fontSize: 15,
    fontWeight: '600',
  },
  exercisesList: {
    marginTop: 18,
  },
  exercisesTitle: {
    fontSize: 14,
    marginBottom: 12,
  },
  exerciseTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  exerciseTag: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 18,
  },
  exerciseTagText: {
    fontSize: 13,
  },
});

export default BodyMapEnhanced;
