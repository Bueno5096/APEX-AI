import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Pressable, Animated, Dimensions } from 'react-native';
import Svg, { Path, G, Defs, LinearGradient, Stop, Ellipse } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { useThemeStore } from '../store/themeStore';
import { useMuscleStore } from '../store/muscleStore';
import { MUSCLE_REGIONS, MuscleRegionId } from '../constants/exerciseData';
import { getReadinessColor, getReadinessLabel } from '../constants/theme';

interface ApexBodyMapProps {
  mode?: 'readiness' | 'workout';
  highlightMuscles?: string[];
  onMusclePress?: (muscleId: string) => void;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// SVG paths for FRONT view muscles - each region has a unique ID
const FRONT_MUSCLE_PATHS: { [key: string]: string } = {
  // Shoulders (deltoids) - front view
  shoulders: `
    M 32,52 C 28,54 24,58 22,65 L 22,78 C 24,80 28,81 32,80 L 38,75 L 40,62 C 40,56 36,52 32,52 Z
    M 68,52 C 72,54 76,58 78,65 L 78,78 C 76,80 72,81 68,80 L 62,75 L 60,62 C 60,56 64,52 68,52 Z
  `,
  
  // Chest (pectorals)
  chest: `
    M 38,55 L 50,52 L 62,55 L 62,80 C 62,88 56,92 50,92 C 44,92 38,88 38,80 Z
  `,
  
  // Left bicep
  biceps_left: `
    M 22,82 L 30,84 L 32,105 C 32,112 28,116 24,116 L 20,114 C 18,110 18,100 20,92 Z
  `,
  
  // Right bicep  
  biceps_right: `
    M 78,82 L 70,84 L 68,105 C 68,112 72,116 76,116 L 80,114 C 82,110 82,100 80,92 Z
  `,
  
  // Left forearm
  forearms_left: `
    M 20,118 L 26,120 L 28,148 C 28,154 24,158 20,158 L 16,154 C 14,148 16,135 18,125 Z
  `,
  
  // Right forearm
  forearms_right: `
    M 80,118 L 74,120 L 72,148 C 72,154 76,158 80,158 L 84,154 C 86,148 84,135 82,125 Z
  `,
  
  // Core (abs + obliques)
  core: `
    M 42,94 L 58,94 L 58,135 L 42,135 Z
  `,
  
  // Quadriceps
  quads: `
    M 40,138 L 48,136 L 50,185 L 42,188 C 38,182 38,160 40,145 Z
    M 60,138 L 52,136 L 50,185 L 58,188 C 62,182 62,160 60,145 Z
  `,
  
  // Calves (front - tibialis)
  calves: `
    M 42,192 L 48,190 L 48,225 C 48,230 46,234 44,234 L 42,232 C 40,228 40,210 42,198 Z
    M 58,192 L 52,190 L 52,225 C 52,230 54,234 56,234 L 58,232 C 60,228 60,210 58,198 Z
  `,
};

// SVG paths for BACK view muscles
const BACK_MUSCLE_PATHS: { [key: string]: string } = {
  // Trapezius
  traps: `
    M 40,48 L 50,45 L 60,48 L 60,65 L 50,62 L 40,65 Z
  `,
  
  // Shoulders (rear deltoids)
  shoulders: `
    M 32,52 C 28,54 24,58 22,65 L 22,78 C 24,80 28,81 32,80 L 38,75 L 40,62 C 40,56 36,52 32,52 Z
    M 68,52 C 72,54 76,58 78,65 L 78,78 C 76,80 72,81 68,80 L 62,75 L 60,62 C 60,56 64,52 68,52 Z
  `,
  
  // Left tricep
  triceps_left: `
    M 22,82 L 30,84 L 32,105 C 32,112 28,116 24,116 L 20,114 C 18,110 18,100 20,92 Z
  `,
  
  // Right tricep
  triceps_right: `
    M 78,82 L 70,84 L 68,105 C 68,112 72,116 76,116 L 80,114 C 82,110 82,100 80,92 Z
  `,
  
  // Left forearm
  forearms_left: `
    M 20,118 L 26,120 L 28,148 C 28,154 24,158 20,158 L 16,154 C 14,148 16,135 18,125 Z
  `,
  
  // Right forearm
  forearms_right: `
    M 80,118 L 74,120 L 72,148 C 72,154 76,158 80,158 L 84,154 C 86,148 84,135 82,125 Z
  `,
  
  // Back (lats + mid back)
  back: `
    M 38,65 L 50,62 L 62,65 L 62,110 C 62,120 56,125 50,125 C 44,125 38,120 38,110 Z
  `,
  
  // Glutes
  glutes: `
    M 40,128 L 50,126 L 60,128 L 60,150 C 60,158 56,162 50,162 C 44,162 40,158 40,150 Z
  `,
  
  // Hamstrings
  hamstrings: `
    M 40,165 L 48,163 L 50,200 L 42,202 C 38,196 38,178 40,168 Z
    M 60,165 L 52,163 L 50,200 L 58,202 C 62,196 62,178 60,168 Z
  `,
  
  // Calves (back)
  calves: `
    M 42,205 L 48,203 L 48,232 C 48,238 46,242 44,242 L 42,240 C 40,236 40,218 42,208 Z
    M 58,205 L 52,203 L 52,232 C 52,238 54,242 56,242 L 58,240 C 60,236 60,218 58,208 Z
  `,
};

// Body outline path
const BODY_OUTLINE = `
  M 50,8 
  C 58,8 64,14 64,24 
  L 64,38 
  C 64,42 62,46 58,48
  L 60,50
  C 72,52 82,62 84,80
  L 86,100
  C 86,108 84,116 80,120
  L 82,140
  C 84,150 82,158 78,160
  L 76,180
  L 72,210
  L 68,235
  C 68,242 64,248 58,248
  L 54,246
  L 52,240
  L 50,235
  L 48,240
  L 46,246
  L 42,248
  C 36,248 32,242 32,235
  L 28,210
  L 24,180
  L 22,160
  C 18,158 16,150 18,140
  L 20,120
  C 16,116 14,108 14,100
  L 16,80
  C 18,62 28,52 40,50
  L 42,48
  C 38,46 36,42 36,38
  L 36,24
  C 36,14 42,8 50,8
  Z
`;

export const ApexBodyMap: React.FC<ApexBodyMapProps> = ({
  mode = 'readiness',
  highlightMuscles = [],
  onMusclePress,
}) => {
  const { theme, accentColor } = useThemeStore();
  const { muscles, getMuscleReadiness } = useMuscleStore();
  const [view, setView] = useState<'front' | 'back'>('front');
  const [selectedMuscle, setSelectedMuscle] = useState<string | null>(null);
  const [flipAnim] = useState(new Animated.Value(0));

  const svgWidth = Math.min(SCREEN_WIDTH - 60, 280);
  const svgHeight = svgWidth * 1.1;

  // Animated flip between views
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

  // Get muscle color based on mode and readiness
  const getMuscleColor = (muscleId: string): string => {
    if (mode === 'workout') {
      if (highlightMuscles.includes(muscleId)) {
        return accentColor;
      }
      return theme.colors.bodyBase;
    }
    
    const readiness = getMuscleReadiness(muscleId);
    return getReadinessColor(readiness, accentColor, theme);
  };

  // Get muscle opacity
  const getMuscleOpacity = (muscleId: string): number => {
    if (mode === 'workout') {
      return highlightMuscles.includes(muscleId) ? 0.85 : 0.3;
    }
    return 0.8;
  };

  // Handle muscle tap
  const handleMusclePress = (muscleId: string) => {
    setSelectedMuscle(muscleId);
    onMusclePress?.(muscleId);
  };

  // Get muscle data for modal
  const selectedMuscleData = selectedMuscle ? muscles[selectedMuscle] : null;
  const selectedMuscleInfo = selectedMuscle ? MUSCLE_REGIONS[selectedMuscle as MuscleRegionId] : null;

  // Render muscle paths for current view
  const musclePaths = view === 'front' ? FRONT_MUSCLE_PATHS : BACK_MUSCLE_PATHS;

  const scaleX = flipAnim.interpolate({
    inputRange: [0, 0.5],
    outputRange: [1, 0],
  });

  return (
    <View style={styles.container}>
      {/* View Toggle - Sharp angular style */}
      <View style={[styles.toggleContainer, { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder }]}>
        <TouchableOpacity
          style={[
            styles.toggleButton,
            view === 'front' && { backgroundColor: accentColor + '25' },
          ]}
          onPress={() => handleViewChange('front')}
        >
          <Text
            style={[
              styles.toggleText,
              { color: view === 'front' ? accentColor : theme.colors.textSecondary },
            ]}
          >
            FRONT
          </Text>
        </TouchableOpacity>
        <View style={[styles.toggleDivider, { backgroundColor: theme.colors.cardBorder }]} />
        <TouchableOpacity
          style={[
            styles.toggleButton,
            view === 'back' && { backgroundColor: accentColor + '25' },
          ]}
          onPress={() => handleViewChange('back')}
        >
          <Text
            style={[
              styles.toggleText,
              { color: view === 'back' ? accentColor : theme.colors.textSecondary },
            ]}
          >
            BACK
          </Text>
        </TouchableOpacity>
      </View>

      {/* Body SVG */}
      <Animated.View style={[styles.bodyContainer, { transform: [{ scaleX }] }]}>
        <Svg width={svgWidth} height={svgHeight} viewBox="0 0 100 250">
          <Defs>
            {/* Metallic gradient for body base */}
            <LinearGradient id="bodyGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <Stop offset="0%" stopColor={theme.colors.bodyBase} stopOpacity={0.9} />
              <Stop offset="50%" stopColor={theme.colors.bodyOutline} stopOpacity={0.7} />
              <Stop offset="100%" stopColor={theme.colors.bodyBase} stopOpacity={0.9} />
            </LinearGradient>
            
            {/* Glow effect for muscles */}
            <LinearGradient id="muscleGlow" x1="0%" y1="0%" x2="0%" y2="100%">
              <Stop offset="0%" stopColor="#FFFFFF" stopOpacity={0.2} />
              <Stop offset="100%" stopColor="#000000" stopOpacity={0.1} />
            </LinearGradient>
          </Defs>

          {/* Body silhouette base */}
          <Path
            d={BODY_OUTLINE}
            fill="url(#bodyGradient)"
            stroke={theme.colors.bodyOutline}
            strokeWidth={0.8}
          />

          {/* Head */}
          <Ellipse
            cx={50}
            cy={23}
            rx={14}
            ry={16}
            fill={theme.colors.bodyBase}
            stroke={theme.colors.bodyOutline}
            strokeWidth={0.5}
          />

          {/* Muscle regions */}
          <G>
            {Object.entries(musclePaths).map(([muscleId, pathData]) => (
              <Path
                key={muscleId}
                d={pathData}
                fill={getMuscleColor(muscleId)}
                opacity={getMuscleOpacity(muscleId)}
                stroke={theme.colors.metallicDark}
                strokeWidth={0.5}
                onPress={() => handleMusclePress(muscleId)}
              />
            ))}
          </G>

          {/* Body outline overlay for definition */}
          <Path
            d={BODY_OUTLINE}
            fill="none"
            stroke={theme.colors.metallicShine}
            strokeWidth={0.3}
            opacity={0.3}
          />
        </Svg>
      </Animated.View>

      {/* Legend */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: accentColor }]} />
          <Text style={[styles.legendText, { color: theme.colors.textSecondary }]}>
            80-100%
          </Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: theme.colors.readinessGood }]} />
          <Text style={[styles.legendText, { color: theme.colors.textSecondary }]}>
            60-79%
          </Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: theme.colors.readinessModerate }]} />
          <Text style={[styles.legendText, { color: theme.colors.textSecondary }]}>
            40-59%
          </Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: theme.colors.readinessFatigued }]} />
          <Text style={[styles.legendText, { color: theme.colors.textSecondary }]}>
            0-39%
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

                {/* Readiness indicator */}
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

                {/* Details */}
                <View style={[styles.detailRow, { borderColor: theme.colors.cardBorder }]}>
                  <Text style={[styles.detailLabel, { color: theme.colors.textSecondary }]}>
                    Last Trained
                  </Text>
                  <Text style={[styles.detailValue, { color: theme.colors.textPrimary }]}>
                    {selectedMuscleData.lastTrained
                      ? `${Math.floor((Date.now() - new Date(selectedMuscleData.lastTrained).getTime()) / (1000 * 60 * 60))}h ago`
                      : 'Not recently'}
                  </Text>
                </View>

                <View style={[styles.detailRow, { borderColor: theme.colors.cardBorder }]}>
                  <Text style={[styles.detailLabel, { color: theme.colors.textSecondary }]}>
                    Est. Full Recovery
                  </Text>
                  <Text style={[styles.detailValue, { color: theme.colors.textPrimary }]}>
                    {selectedMuscleData.estimatedRecoveryHours > 0
                      ? `${selectedMuscleData.estimatedRecoveryHours}h`
                      : 'Recovered'}
                  </Text>
                </View>

                {selectedMuscleData.lastExercises.length > 0 && (
                  <View style={styles.exercisesSection}>
                    <Text style={[styles.exercisesTitle, { color: theme.colors.textSecondary }]}>
                      RECENT EXERCISES
                    </Text>
                    <View style={styles.exercisesTags}>
                      {selectedMuscleData.lastExercises.slice(0, 3).map((ex, i) => (
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
    marginRight: 6,
  },
  legendText: {
    fontSize: 11,
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    width: '100%',
    maxWidth: 360,
    borderWidth: 1,
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
