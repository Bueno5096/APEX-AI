import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Pressable } from 'react-native';
import Svg, { Path, G } from 'react-native-svg';
import { useThemeStore } from '../store/themeStore';
import { MuscleReadiness } from '../store/healthStore';
import { MetallicCard } from './MetallicCard';
import { Ionicons } from '@expo/vector-icons';

interface BodyMapProps {
  muscles: MuscleReadiness[];
  highlightMuscles?: string[];
  mode?: 'readiness' | 'workout';
  onMusclePress?: (muscle: MuscleReadiness) => void;
}

// Simplified body paths for front and back view
const BODY_PATHS = {
  front: {
    outline: 'M50,10 C60,10 70,15 70,25 L70,35 C70,40 65,45 60,45 L60,50 C75,55 85,70 85,90 L85,120 C85,130 80,140 75,145 L75,180 C75,190 70,200 65,200 L55,200 L55,180 L45,180 L45,200 L35,200 C30,200 25,190 25,180 L25,145 C20,140 15,130 15,120 L15,90 C15,70 25,55 40,50 L40,45 C35,45 30,40 30,35 L30,25 C30,15 40,10 50,10 Z',
    chest: 'M35,55 C35,55 45,50 50,50 C55,50 65,55 65,55 L65,75 C65,80 55,85 50,85 C45,85 35,80 35,75 Z',
    shoulders: 'M25,55 L35,50 L35,70 L25,75 Z M75,55 L65,50 L65,70 L75,75 Z',
    biceps: 'M20,75 L30,70 L32,95 L22,100 Z M80,75 L70,70 L68,95 L78,100 Z',
    forearms: 'M22,100 L32,95 L35,130 L25,135 Z M78,100 L68,95 L65,130 L75,135 Z',
    core: 'M40,85 L60,85 L60,120 L40,120 Z',
    quads: 'M38,125 L48,120 L50,165 L40,170 Z M62,125 L52,120 L50,165 L60,170 Z',
    calves: 'M40,175 L48,170 L50,200 L42,200 Z M60,175 L52,170 L50,200 L58,200 Z',
  },
  back: {
    outline: 'M50,10 C60,10 70,15 70,25 L70,35 C70,40 65,45 60,45 L60,50 C75,55 85,70 85,90 L85,120 C85,130 80,140 75,145 L75,180 C75,190 70,200 65,200 L55,200 L55,180 L45,180 L45,200 L35,200 C30,200 25,190 25,180 L25,145 C20,140 15,130 15,120 L15,90 C15,70 25,55 40,50 L40,45 C35,45 30,40 30,35 L30,25 C30,15 40,10 50,10 Z',
    traps: 'M35,45 L50,40 L65,45 L65,60 L50,55 L35,60 Z',
    back: 'M35,60 L65,60 L65,95 L35,95 Z',
    shoulders: 'M25,55 L35,50 L35,70 L25,75 Z M75,55 L65,50 L65,70 L75,75 Z',
    triceps: 'M20,75 L30,70 L32,95 L22,100 Z M80,75 L70,70 L68,95 L78,100 Z',
    forearms: 'M22,100 L32,95 L35,130 L25,135 Z M78,100 L68,95 L65,130 L75,135 Z',
    glutes: 'M38,95 L62,95 L62,125 L38,125 Z',
    hamstrings: 'M38,130 L48,125 L50,165 L40,170 Z M62,130 L52,125 L50,165 L60,170 Z',
    calves: 'M40,175 L48,170 L50,200 L42,200 Z M60,175 L52,170 L50,200 L58,200 Z',
  },
};

const MUSCLE_MAPPING: { [key: string]: { front?: string; back?: string } } = {
  chest: { front: 'chest' },
  back: { back: 'back' },
  shoulders: { front: 'shoulders', back: 'shoulders' },
  biceps: { front: 'biceps' },
  triceps: { back: 'triceps' },
  forearms: { front: 'forearms', back: 'forearms' },
  core: { front: 'core' },
  quads: { front: 'quads' },
  hamstrings: { back: 'hamstrings' },
  glutes: { back: 'glutes' },
  calves: { front: 'calves', back: 'calves' },
  traps: { back: 'traps' },
};

export const BodyMap: React.FC<BodyMapProps> = ({
  muscles,
  highlightMuscles = [],
  mode = 'readiness',
  onMusclePress,
}) => {
  const { theme, accentColor } = useThemeStore();
  const [view, setView] = useState<'front' | 'back'>('front');
  const [selectedMuscle, setSelectedMuscle] = useState<MuscleReadiness | null>(null);
  
  const getMuscleColor = (muscleId: string): string => {
    if (mode === 'workout') {
      return highlightMuscles.includes(muscleId) ? accentColor : theme.colors.muscleNeutral;
    }
    
    const muscle = muscles.find((m) => m.id === muscleId);
    if (!muscle) return theme.colors.muscleNeutral;
    
    if (muscle.readiness >= 80) return accentColor;
    if (muscle.readiness >= 60) return theme.colors.muscleFatigueMild;
    if (muscle.readiness >= 40) return theme.colors.muscleFatigueModerate;
    return theme.colors.muscleOverworked;
  };
  
  const getMuscleOpacity = (muscleId: string): number => {
    if (mode === 'workout') {
      return highlightMuscles.includes(muscleId) ? 0.8 : 0.3;
    }
    const muscle = muscles.find((m) => m.id === muscleId);
    return muscle ? 0.7 : 0.3;
  };
  
  const handleMusclePress = (muscleId: string) => {
    const muscle = muscles.find((m) => m.id === muscleId);
    if (muscle) {
      setSelectedMuscle(muscle);
      onMusclePress?.(muscle);
    }
  };
  
  const paths = view === 'front' ? BODY_PATHS.front : BODY_PATHS.back;
  
  const renderMuscle = (muscleId: string, pathKey: string) => {
    const mapping = MUSCLE_MAPPING[muscleId];
    if (!mapping) return null;
    
    const pathName = view === 'front' ? mapping.front : mapping.back;
    if (!pathName || !paths[pathName as keyof typeof paths]) return null;
    
    return (
      <Path
        key={`${muscleId}-${view}`}
        d={paths[pathName as keyof typeof paths]}
        fill={getMuscleColor(muscleId)}
        opacity={getMuscleOpacity(muscleId)}
        onPress={() => handleMusclePress(muscleId)}
      />
    );
  };
  
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
      
      {/* Body SVG */}
      <View style={styles.bodyContainer}>
        <Svg width={200} height={280} viewBox="0 0 100 210">
          {/* Body outline */}
          <Path
            d={paths.outline}
            fill={theme.colors.metallic}
            opacity={0.4}
          />
          
          {/* Muscle groups */}
          <G>
            {Object.keys(MUSCLE_MAPPING).map((muscleId) =>
              renderMuscle(muscleId, muscleId)
            )}
          </G>
        </Svg>
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
                
                <View style={styles.modalRow}>
                  <Text style={[styles.modalLabel, { color: theme.colors.textSecondary }]}>
                    Readiness
                  </Text>
                  <Text style={[styles.modalValue, { color: accentColor }]}>
                    {selectedMuscle.readiness}%
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
                  <Text style={[styles.modalLabel, { color: theme.colors.textSecondary }]}>
                    Affected Exercises
                  </Text>
                  {selectedMuscle.affectedExercises.map((ex, i) => (
                    <Text
                      key={i}
                      style={[styles.exerciseItem, { color: theme.colors.textPrimary }]}
                    >
                      • {ex}
                    </Text>
                  ))}
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
  },
  toggleContainer: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
  },
  toggleButton: {
    paddingHorizontal: 24,
    paddingVertical: 8,
    borderRadius: 8,
  },
  toggleText: {
    fontSize: 14,
    fontWeight: '600',
  },
  bodyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 320,
    borderRadius: 16,
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  modalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  modalLabel: {
    fontSize: 14,
  },
  modalValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  exercisesList: {
    marginTop: 12,
  },
  exerciseItem: {
    fontSize: 13,
    marginTop: 6,
  },
});
