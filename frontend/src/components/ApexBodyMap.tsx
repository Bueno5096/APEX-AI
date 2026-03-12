import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Pressable, Animated, Dimensions } from 'react-native';
import Svg, { Path, G, Defs, LinearGradient, Stop, Ellipse, Circle } from 'react-native-svg';
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

// ─────────────────────────────────────────────
// FRONT MUSCLE PATHS  (viewBox 0 0 100 260)
// Modelled after the reference screenshot:
// silvery anatomical figure, dark background,
// individual muscle groups with definition lines
// ─────────────────────────────────────────────
const FRONT_MUSCLE_PATHS: { [key: string]: { d: string; label: string } } = {

  // ── CHEST (pectorals) ──────────────────────
  // Two teardrop lobes that meet at the sternum
  chest: {
    label: 'Chest',
    d: `
      M 50,56
      C 46,54 38,54 34,58
      C 30,62 30,70 32,76
      C 34,82 40,86 46,87
      C 48,87 50,86 50,85
      C 50,86 52,87 54,87
      C 60,86 66,82 68,76
      C 70,70 70,62 66,58
      C 62,54 54,54 50,56 Z
    `,
  },

  // ── SHOULDERS (anterior deltoids) ──────────
  shoulders: {
    label: 'Shoulders',
    d: `
      M 30,52 C 24,52 18,56 16,63 L 15,74 C 16,80 20,83 25,82
      L 32,79 C 35,75 36,68 35,60 C 34,55 32,52 30,52 Z
      M 70,52 C 76,52 82,56 84,63 L 85,74 C 84,80 80,83 75,82
      L 68,79 C 65,75 64,68 65,60 C 66,55 68,52 70,52 Z
    `,
  },

  // ── BICEPS ─────────────────────────────────
  biceps_left: {
    label: 'Left Bicep',
    d: `
      M 15,84 C 12,88 11,96 12,106
      C 13,113 17,117 21,116
      L 27,113 C 30,108 30,100 28,92
      C 26,85 22,82 18,83 Z
    `,
  },
  biceps_right: {
    label: 'Right Bicep',
    d: `
      M 85,84 C 88,88 89,96 88,106
      C 87,113 83,117 79,116
      L 73,113 C 70,108 70,100 72,92
      C 74,85 78,82 82,83 Z
    `,
  },

  // ── FOREARMS ───────────────────────────────
  forearms_left: {
    label: 'Left Forearm',
    d: `
      M 11,118 C 9,126 9,138 10,148
      C 11,155 14,159 18,159
      L 23,157 C 26,153 27,145 26,135
      C 25,125 22,118 18,117 Z
    `,
  },
  forearms_right: {
    label: 'Right Forearm',
    d: `
      M 89,118 C 91,126 91,138 90,148
      C 89,155 86,159 82,159
      L 77,157 C 74,153 73,145 74,135
      C 75,125 78,118 82,117 Z
    `,
  },

  // ── ABS (6-pack segments) ──────────────────
  // Upper pair
  core: {
    label: 'Abs',
    d: `
      M 43,88 C 41,90 40,96 41,102 C 42,107 45,109 50,109
      C 55,109 58,107 59,102 C 60,96 59,90 57,88
      C 54,86 46,86 43,88 Z

      M 42,111 C 41,113 40,119 41,125 C 42,130 45,132 50,132
      C 55,132 58,130 59,125 C 60,119 59,113 58,111
      C 55,109 45,109 42,111 Z

      M 43,134 C 41,136 40,141 41,146 C 42,150 45,152 50,152
      C 55,152 58,150 59,146 C 60,141 59,136 57,134
      C 54,132 46,132 43,134 Z
    `,
  },

  // ── OBLIQUES ───────────────────────────────
  obliques_left: {
    label: 'Left Oblique',
    d: `
      M 33,88 C 30,92 29,100 30,110
      C 31,118 34,124 38,126
      L 41,128 C 41,120 41,110 42,102
      C 42,94 42,88 42,88
      C 39,87 36,87 33,88 Z
    `,
  },
  obliques_right: {
    label: 'Right Oblique',
    d: `
      M 67,88 C 70,92 71,100 70,110
      C 69,118 66,124 62,126
      L 59,128 C 59,120 59,110 58,102
      C 58,94 58,88 58,88
      C 61,87 64,87 67,88 Z
    `,
  },

  // ── QUADS ──────────────────────────────────
  // Each quad has the characteristic 4-head teardrop look
  quads: {
    label: 'Quads',
    d: `
      M 36,162 C 33,168 32,180 33,194
      C 34,206 38,214 43,216
      C 47,218 50,216 51,212
      L 52,190 C 52,178 50,165 47,160
      C 44,157 39,158 36,162 Z

      M 64,162 C 67,168 68,180 67,194
      C 66,206 62,214 57,216
      C 53,218 50,216 49,212
      L 48,190 C 48,178 50,165 53,160
      C 56,157 61,158 64,162 Z
    `,
  },

  // ── ADDUCTORS (inner thigh) ────────────────
  adductors: {
    label: 'Adductors',
    d: `
      M 46,163 C 44,168 43,178 44,190
      L 46,210 C 47,215 50,217 50,217
      C 50,217 53,215 54,210
      L 56,190 C 57,178 56,168 54,163
      C 52,159 48,159 46,163 Z
    `,
  },

  // ── CALVES / TIBIALIS (front shin) ─────────
  calves: {
    label: 'Calves',
    d: `
      M 34,220 C 32,226 32,236 33,245
      C 34,251 37,254 40,253
      L 44,250 C 46,246 46,238 45,229
      C 44,221 41,217 38,218 Z

      M 66,220 C 68,226 68,236 67,245
      C 66,251 63,254 60,253
      L 56,250 C 54,246 54,238 55,229
      C 56,221 59,217 62,218 Z
    `,
  },
};

// ─────────────────────────────────────────────
// BACK MUSCLE PATHS  (same viewBox 0 0 100 260)
// ─────────────────────────────────────────────
const BACK_MUSCLE_PATHS: { [key: string]: { d: string; label: string } } = {

  // ── TRAPS ──────────────────────────────────
  traps: {
    label: 'Traps',
    d: `
      M 50,40 C 44,40 36,44 33,50
      C 31,54 32,60 36,64
      C 40,68 46,70 50,70
      C 54,70 60,68 64,64
      C 68,60 69,54 67,50
      C 64,44 56,40 50,40 Z
    `,
  },

  // ── REAR DELTS ─────────────────────────────
  shoulders: {
    label: 'Shoulders',
    d: `
      M 30,52 C 24,52 18,57 16,64 L 15,75
      C 16,81 20,84 25,83 L 32,80
      C 35,76 36,69 35,61 C 34,55 32,52 30,52 Z

      M 70,52 C 76,52 82,57 84,64 L 85,75
      C 84,81 80,84 75,83 L 68,80
      C 65,76 64,69 65,61 C 66,55 68,52 70,52 Z
    `,
  },

  // ── TRICEPS ────────────────────────────────
  triceps_left: {
    label: 'Left Tricep',
    d: `
      M 15,84 C 12,88 11,96 12,106
      C 13,113 17,117 21,116
      L 27,113 C 30,108 30,100 28,92
      C 26,85 22,82 18,83 Z
    `,
  },
  triceps_right: {
    label: 'Right Tricep',
    d: `
      M 85,84 C 88,88 89,96 88,106
      C 87,113 83,117 79,116
      L 73,113 C 70,108 70,100 72,92
      C 74,85 78,82 82,83 Z
    `,
  },

  // ── FOREARMS (back) ────────────────────────
  forearms_left: {
    label: 'Left Forearm',
    d: `
      M 11,118 C 9,126 9,138 10,148
      C 11,155 14,159 18,159
      L 23,157 C 26,153 27,145 26,135
      C 25,125 22,118 18,117 Z
    `,
  },
  forearms_right: {
    label: 'Right Forearm',
    d: `
      M 89,118 C 91,126 91,138 90,148
      C 89,155 86,159 82,159
      L 77,157 C 74,153 73,145 74,135
      C 75,125 78,118 82,117 Z
    `,
  },

  // ── LATS ───────────────────────────────────
  // Wide sweep from armpits tapering to waist
  back: {
    label: 'Back / Lats',
    d: `
      M 34,68 C 28,72 26,82 27,95
      C 28,108 32,118 38,124
      C 42,128 46,130 50,130
      C 54,130 58,128 62,124
      C 68,118 72,108 73,95
      C 74,82 72,72 66,68
      C 62,65 56,64 50,64
      C 44,64 38,65 34,68 Z
    `,
  },

  // ── LOWER BACK (erectors) ──────────────────
  lower_back: {
    label: 'Lower Back',
    d: `
      M 42,130 C 40,134 39,142 40,150
      C 41,156 44,160 50,160
      C 56,160 59,156 60,150
      C 61,142 60,134 58,130
      C 55,128 45,128 42,130 Z
    `,
  },

  // ── GLUTES ─────────────────────────────────
  glutes: {
    label: 'Glutes',
    d: `
      M 35,162 C 31,166 30,174 31,184
      C 32,192 36,198 42,200
      C 46,201 50,200 50,200
      C 50,200 54,201 58,200
      C 64,198 68,192 69,184
      C 70,174 69,166 65,162
      C 61,158 55,157 50,157
      C 45,157 39,158 35,162 Z
    `,
  },

  // ── HAMSTRINGS ─────────────────────────────
  hamstrings: {
    label: 'Hamstrings',
    d: `
      M 35,202 C 32,208 31,220 32,232
      C 33,242 37,248 42,249
      C 47,250 50,248 51,244
      L 52,224 C 52,212 50,202 47,198
      C 44,195 38,197 35,202 Z

      M 65,202 C 68,208 69,220 68,232
      C 67,242 63,248 58,249
      C 53,250 50,248 49,244
      L 48,224 C 48,212 50,202 53,198
      C 56,195 62,197 65,202 Z
    `,
  },

  // ── CALVES (gastrocnemius) ─────────────────
  calves: {
    label: 'Calves',
    d: `
      M 33,252 C 31,258 31,266 33,274
      C 34,279 37,282 41,281
      L 45,278 C 47,274 47,266 46,257
      C 45,249 42,245 39,246 Z

      M 67,252 C 69,258 69,266 67,274
      C 66,279 63,282 59,281
      L 55,278 C 53,274 53,266 54,257
      C 55,249 58,245 61,246 Z
    `,
  },
};

// ─────────────────────────────────────────────
// BODY SILHOUETTE (front & back share same outline)
// ─────────────────────────────────────────────
const BODY_SILHOUETTE = `
  M 50,10
  C 57,10 63,16 63,24
  L 63,36 C 63,41 61,45 57,48
  L 62,51 C 70,53 78,60 81,72
  L 84,90 C 85,100 83,112 79,118
  L 82,138 C 84,148 82,158 78,162
  L 74,195 L 70,225 L 67,255
  C 67,260 64,264 60,264
  L 56,262 L 53,255 L 51,248
  L 49,255 L 46,262 L 40,264
  C 36,264 33,260 33,255
  L 30,225 L 26,195 L 22,162
  C 18,158 16,148 18,138
  L 21,118 C 17,112 15,100 16,90
  L 19,72 C 22,60 30,53 38,51
  L 43,48 C 39,45 37,41 37,36
  L 37,24 C 37,16 43,10 50,10 Z
`;

// Arms (separate paths to allow arm muscles to overlay)
const LEFT_ARM = `
  M 30,52 C 22,54 15,60 13,70
  L 10,100 C 10,110 12,118 16,122
  L 14,148 C 13,156 14,162 17,164
  L 20,174 C 20,177 22,179 25,178
  L 30,176 C 32,174 33,171 32,168
  L 29,158 C 33,155 35,148 34,138
  L 32,120 C 36,116 38,108 37,98
  L 35,72 C 34,62 32,54 30,52 Z
`;

const RIGHT_ARM = `
  M 70,52 C 78,54 85,60 87,70
  L 90,100 C 90,110 88,118 84,122
  L 86,148 C 87,156 86,162 83,164
  L 80,174 C 80,177 78,179 75,178
  L 70,176 C 68,174 67,171 68,168
  L 71,158 C 67,155 65,148 66,138
  L 68,120 C 64,116 62,108 63,98
  L 65,72 C 66,62 68,54 70,52 Z
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

  const svgWidth = Math.min(SCREEN_WIDTH - 60, 260);
  const svgHeight = svgWidth * 1.45;

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

  const getMuscleColor = (muscleId: string): string => {
    if (mode === 'workout') {
      return highlightMuscles.includes(muscleId) ? accentColor : theme.colors.bodyBase;
    }
    const readiness = getMuscleReadiness(muscleId);
    return getReadinessColor(readiness, accentColor, theme);
  };

  const getMuscleOpacity = (muscleId: string): number => {
    if (mode === 'workout') {
      return highlightMuscles.includes(muscleId) ? 0.9 : 0.25;
    }
    return 0.82;
  };

  const handleMusclePress = (muscleId: string) => {
    setSelectedMuscle(muscleId);
    onMusclePress?.(muscleId);
  };

  const selectedMuscleData = selectedMuscle ? muscles[selectedMuscle] : null;
  const selectedMuscleInfo = selectedMuscle ? MUSCLE_REGIONS[selectedMuscle as MuscleRegionId] : null;

  const musclePaths = view === 'front' ? FRONT_MUSCLE_PATHS : BACK_MUSCLE_PATHS;

  const scaleX = flipAnim.interpolate({
    inputRange: [0, 0.5],
    outputRange: [1, 0],
  });

  // Dark slate base color for the silhouette
  const silhouetteColor = '#2e3348';
  const silhouetteBorder = '#3d4260';
  const muscleBaseColor = '#8b92b0'; // silvery lavender like reference

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

      {/* Body SVG */}
      <Animated.View style={[styles.bodyContainer, { transform: [{ scaleX }] }]}>
        <Svg width={svgWidth} height={svgHeight} viewBox="0 0 100 280">
          <Defs>
            <LinearGradient id="silhouetteGrad" x1="30%" y1="0%" x2="70%" y2="100%">
              <Stop offset="0%" stopColor="#3a3f58" stopOpacity="1" />
              <Stop offset="40%" stopColor="#2a2e42" stopOpacity="1" />
              <Stop offset="100%" stopColor="#1e2130" stopOpacity="1" />
            </LinearGradient>
            <LinearGradient id="armGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <Stop offset="0%" stopColor="#2a2e42" stopOpacity="1" />
              <Stop offset="50%" stopColor="#323750" stopOpacity="1" />
              <Stop offset="100%" stopColor="#2a2e42" stopOpacity="1" />
            </LinearGradient>
            <LinearGradient id="muscleSheen" x1="0%" y1="0%" x2="0%" y2="100%">
              <Stop offset="0%" stopColor="#ffffff" stopOpacity="0.15" />
              <Stop offset="100%" stopColor="#000000" stopOpacity="0.08" />
            </LinearGradient>
          </Defs>

          {/* Arms base */}
          <Path d={LEFT_ARM} fill="url(#armGrad)" stroke={silhouetteBorder} strokeWidth="0.5" />
          <Path d={RIGHT_ARM} fill="url(#armGrad)" stroke={silhouetteBorder} strokeWidth="0.5" />

          {/* Body base silhouette */}
          <Path
            d={BODY_SILHOUETTE}
            fill="url(#silhouetteGrad)"
            stroke={silhouetteBorder}
            strokeWidth="0.6"
          />

          {/* Head */}
          <Ellipse
            cx={50} cy={22} rx={13} ry={15}
            fill="#282c3f"
            stroke={silhouetteBorder}
            strokeWidth="0.5"
          />
          {/* Neck */}
          <Path
            d="M 44,35 L 56,35 L 57,48 L 43,48 Z"
            fill="#252839"
            stroke={silhouetteBorder}
            strokeWidth="0.4"
          />

          {/* Hands */}
          <Ellipse cx={19} cy={175} rx={6} ry={8} fill="#1e2130" stroke={silhouetteBorder} strokeWidth="0.4" />
          <Ellipse cx={81} cy={175} rx={6} ry={8} fill="#1e2130" stroke={silhouetteBorder} strokeWidth="0.4" />

          {/* Feet */}
          <Ellipse cx={38} cy={268} rx={10} ry={6} fill="#1a1d2b" stroke={silhouetteBorder} strokeWidth="0.4" />
          <Ellipse cx={62} cy={268} rx={10} ry={6} fill="#1a1d2b" stroke={silhouetteBorder} strokeWidth="0.4" />

          {/* ── MUSCLE GROUPS ── */}
          <G>
            {Object.entries(musclePaths).map(([muscleId, muscle]) => (
              <Path
                key={muscleId}
                d={muscle.d}
                fill={getMuscleColor(muscleId)}
                opacity={getMuscleOpacity(muscleId)}
                stroke="#1a1d2b"
                strokeWidth="0.6"
                onPress={() => handleMusclePress(muscleId)}
              />
            ))}
          </G>

          {/* Subtle sheen overlay on body */}
          <Path
            d={BODY_SILHOUETTE}
            fill="url(#muscleSheen)"
            stroke="none"
          />
        </Svg>
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
