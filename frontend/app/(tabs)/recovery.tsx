import React, { useEffect, useState, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  RefreshControl,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle, Defs, LinearGradient as SvgGradient, Stop } from 'react-native-svg';
import { useThemeStore } from '../../src/store/themeStore';
import { useHealthStore } from '../../src/store/healthStore';
import { useMuscleStore } from '../../src/store/muscleStore';
import { useWorkoutStore } from '../../src/store/workoutStore';
import { ApexBodyMap } from '../../src/components/ApexBodyMap';
import { MUSCLE_REGIONS } from '../../src/constants/exerciseData';
import { getReadinessColor, getReadinessLabel } from '../../src/constants/theme';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

// Premium circular progress with animation
const ApexCircularProgress = ({ 
  value, 
  size = 200, 
  strokeWidth = 10,
  accentColor,
}: {
  value: number;
  size?: number;
  strokeWidth?: number;
  accentColor: string;
}) => {
  const radius = (size - strokeWidth * 2) / 2;
  const circumference = radius * 2 * Math.PI;
  const progress = Math.min(Math.max(value, 0), 100);
  const animValue = useRef(new Animated.Value(0)).current;
  const countAnim = useRef(new Animated.Value(0)).current;
  const [displayVal, setDisplayVal] = useState(0);

  useEffect(() => {
    Animated.timing(animValue, { toValue: progress, duration: 1200, useNativeDriver: false }).start();
    Animated.timing(countAnim, { toValue: progress, duration: 1200, useNativeDriver: false }).start();
    const id = countAnim.addListener(({ value: v }) => setDisplayVal(Math.round(v)));
    return () => countAnim.removeListener(id);
  }, [progress]);

  const dashOffset = animValue.interpolate({
    inputRange: [0, 100],
    outputRange: [circumference, 0],
  });
  
  const statusLabel = progress >= 75 ? 'READY TO TRAIN' : 
                     progress >= 50 ? 'MODERATE' : 'RECOVERY NEEDED';

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      {/* Subtle radial glow */}
      <View style={{
        position: 'absolute',
        width: size * 0.7,
        height: size * 0.7,
        borderRadius: size * 0.35,
        backgroundColor: 'rgba(192,192,192,0.04)',
      }} />
      <Svg width={size} height={size} style={{ position: 'absolute' }}>
        <Defs>
          <SvgGradient id="progressGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <Stop offset="0%" stopColor={accentColor} stopOpacity={1} />
            <Stop offset="100%" stopColor={accentColor} stopOpacity={0.4} />
          </SvgGradient>
        </Defs>
        {/* Outer gunmetal ring */}
        <Circle
          cx={size / 2} cy={size / 2}
          r={radius + strokeWidth * 0.6}
          stroke="#3a3a3a" strokeWidth={1}
          fill="transparent" opacity={0.3}
        />
        {/* Background track */}
        <Circle
          cx={size / 2} cy={size / 2} r={radius}
          stroke="#242424" strokeWidth={strokeWidth}
          fill="transparent" opacity={0.5}
        />
        {/* Progress arc */}
        <AnimatedCircle
          cx={size / 2} cy={size / 2} r={radius}
          stroke="url(#progressGrad)"
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={`${circumference}`}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <View style={{ alignItems: 'center' }}>
        <Text style={styles.scoreValue}>{displayVal}</Text>
        <Text style={[styles.scoreLabel, { color: accentColor }]}>{statusLabel}</Text>
      </View>
    </View>
  );
};

// Floating metric card
const MetricCard = ({ 
  icon, value, label, accentColor, delay = 0, theme,
}: { 
  icon: string; value: string; label: string; accentColor: string; delay?: number; theme: any;
}) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(12)).current;

  useEffect(() => {
    const t = setTimeout(() => {
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.spring(slideAnim, { toValue: 0, tension: 80, friction: 12, useNativeDriver: true }),
      ]).start();
    }, delay);
    return () => clearTimeout(t);
  }, []);

  return (
    <Animated.View style={[styles.metricCard, { 
      opacity: fadeAnim, 
      transform: [{ translateY: slideAnim }],
      backgroundColor: theme.colors.card,
      borderColor: theme.colors.cardBorder,
    }]}>
      {/* Silver top glow */}
      <View style={[styles.metricGlow, { backgroundColor: accentColor, opacity: 0.3 }]} />
      <Ionicons name={icon as any} size={18} color={accentColor} />
      <Text style={[styles.metricValue, { color: theme.colors.textPrimary }]}>{value}</Text>
      <Text style={[styles.metricLabel, { color: theme.colors.textSecondary }]}>{label}</Text>
    </Animated.View>
  );
};

export default function RecoveryScreen() {
  const { theme, accentColor } = useThemeStore();
  const { recoveryData, isLoading, refreshData, fetchHealthData } = useHealthStore();
  const { muscles, loadState, getRecommendation, initializeMuscles } = useMuscleStore();
  const { setTodayWorkoutByType } = useWorkoutStore();
  const router = useRouter();
  const [isInitialized, setIsInitialized] = useState(false);
  const [workoutApplied, setWorkoutApplied] = useState(false);
  
  useEffect(() => {
    const init = async () => {
      await loadState();
      await fetchHealthData();
      setIsInitialized(true);
    };
    init();
  }, []);

  useEffect(() => {
    if (isInitialized && Object.keys(muscles).length === 0) {
      initializeMuscles();
    }
  }, [isInitialized]);

  const recommendation = getRecommendation();
  
  const muscleReadiness = Object.values(muscles);
  const avgReadiness = muscleReadiness.length > 0 
    ? muscleReadiness.reduce((sum, m) => sum + m.readiness, 0) / muscleReadiness.length 
    : 75;
  
  const overallScore = recoveryData 
    ? Math.round((recoveryData.score * 0.6) + (avgReadiness * 0.4))
    : Math.round(avgReadiness);

  const isDark = theme.name === 'dark';
  
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={refreshData}
            tintColor={accentColor}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={[styles.headerTitle, { color: theme.colors.textPrimary }]}>Recovery</Text>
            <Text style={[styles.headerSubtitle, { color: theme.colors.textMuted }]}>BODY READINESS</Text>
          </View>
          <View style={[styles.statusBadge, { borderColor: accentColor + '40' }]}>
            <View style={[styles.statusDot, { backgroundColor: accentColor }]} />
            <Text style={[styles.statusText, { color: accentColor }]}>LIVE</Text>
          </View>
        </View>
        
        {/* Recovery Score - floating card */}
        <View style={[styles.scoreSection, { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder }]}>
          <ApexCircularProgress 
            value={overallScore} 
            size={200}
            accentColor={accentColor}
          />
        </View>
        
        {/* Metrics Grid */}
        <View style={styles.metricsGrid}>
          <MetricCard 
            icon="moon" 
            value={recoveryData?.metrics.sleepDuration ? `${recoveryData.metrics.sleepDuration}h` : '--'}
            label="SLEEP" accentColor={accentColor} delay={0} theme={theme}
          />
          <MetricCard 
            icon="pulse" 
            value={recoveryData?.metrics.hrv ? `${recoveryData.metrics.hrv}` : '--'}
            label="HRV" accentColor={accentColor} delay={80} theme={theme}
          />
          <MetricCard 
            icon="heart" 
            value={recoveryData?.metrics.restingHeartRate ? `${recoveryData.metrics.restingHeartRate}` : '--'}
            label="RHR" accentColor={accentColor} delay={160} theme={theme}
          />
          <MetricCard 
            icon="footsteps" 
            value={recoveryData?.metrics.steps ? `${(recoveryData.metrics.steps / 1000).toFixed(1)}k` : '--'}
            label="STEPS" accentColor={accentColor} delay={240} theme={theme}
          />
        </View>
        
        {/* Body Map Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.textMuted }]}>MUSCLE READINESS</Text>
          <View style={[styles.bodyMapContainer, { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder }]}>
            <ApexBodyMap mode="readiness" />
          </View>
        </View>
        
        {/* AI Explanation Panel */}
        <View style={[styles.explanationCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder }]}>
          <View style={[styles.explanationGlow, { backgroundColor: accentColor }]} />
          <View style={styles.explanationHeader}>
            <View style={styles.explanationTitleRow}>
              <Ionicons name="sparkles" size={18} color={accentColor} />
              <Text style={[styles.explanationTitle, { color: theme.colors.textMuted }]}>AI ANALYSIS</Text>
            </View>
            <View style={[styles.aiTag, { backgroundColor: accentColor + '15' }]}>
              <Text style={[styles.aiTagText, { color: accentColor }]}>AI</Text>
            </View>
          </View>
          
          <Text style={[styles.explanationText, { color: theme.colors.textSecondary }]}>{recommendation.explanation}</Text>
          
          {recommendation.reasoning.length > 0 && (
            <View style={styles.reasoningList}>
              {recommendation.reasoning.map((reason, i) => (
                <View key={i} style={styles.reasoningItem}>
                  <View style={[styles.reasoningBullet, { backgroundColor: accentColor }]} />
                  <Text style={[styles.reasoningText, { color: theme.colors.textSecondary }]}>{reason}</Text>
                </View>
              ))}
            </View>
          )}
          
          <View style={[styles.muscleStatusSummary, { borderTopColor: theme.colors.divider }]}>
            {recommendation.readyMuscles.length > 0 && (
              <View style={styles.muscleStatusRow}>
                <View style={[styles.statusIndicator, { backgroundColor: accentColor }]} />
                <Text style={[styles.muscleStatusText, { color: theme.colors.textSecondary }]}>
                  Ready: {recommendation.readyMuscles.slice(0, 3).join(', ')}
                  {recommendation.readyMuscles.length > 3 && ` +${recommendation.readyMuscles.length - 3}`}
                </Text>
              </View>
            )}
            {recommendation.fatiguedMuscles.length > 0 && (
              <View style={styles.muscleStatusRow}>
                <View style={[styles.statusIndicator, { backgroundColor: theme.colors.readinessFatigued }]} />
                <Text style={[styles.muscleStatusText, { color: theme.colors.textSecondary }]}>
                  Fatigued: {recommendation.fatiguedMuscles.slice(0, 3).join(', ')}
                  {recommendation.fatiguedMuscles.length > 3 && ` +${recommendation.fatiguedMuscles.length - 3}`}
                </Text>
              </View>
            )}
          </View>
        </View>
        
        {/* Recommended Workout */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => {
            setTodayWorkoutByType(recommendation.type, recommendation.title);
            setWorkoutApplied(true);
            setTimeout(() => { router.push('/(tabs)/workout'); }, 600);
          }}
        >
          <View style={[styles.workoutCard, { 
            backgroundColor: theme.colors.card,
            borderColor: workoutApplied ? theme.colors.success : accentColor + '40',
          }]}>
            <LinearGradient
              colors={[accentColor + '08', 'transparent']}
              style={StyleSheet.absoluteFillObject}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            />
            <View style={styles.workoutContent}>
              <View>
                <Text style={[styles.workoutLabel, { color: accentColor }]}>RECOMMENDED</Text>
                <Text style={[styles.workoutTitle, { color: theme.colors.textPrimary }]}>{recommendation.title}</Text>
                <Text style={[styles.workoutType, { color: theme.colors.textMuted }]}>
                  {workoutApplied ? 'Workout set! Navigating...' : 'Tap to set as today\'s workout'}
                </Text>
              </View>
              <View style={[styles.workoutArrow, { 
                backgroundColor: workoutApplied ? theme.colors.success : theme.colors.cardSecondary,
                borderColor: workoutApplied ? theme.colors.success : accentColor + '30',
              }]}>
                <Ionicons name={workoutApplied ? "checkmark" : "arrow-forward"} size={20} color={isDark ? '#fff' : '#333'} />
              </View>
            </View>
          </View>
        </TouchableOpacity>
        
        <View style={styles.bottomSpacer} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 28,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.5,
    color: '#ffffff',
  },
  headerSubtitle: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 1.5,
    marginTop: 4,
    color: '#555555',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderRadius: 20,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.5,
  },
  scoreSection: {
    alignItems: 'center',
    paddingVertical: 32,
    marginBottom: 24,
    backgroundColor: '#111111',
    borderRadius: 20,
    borderWidth: 0.5,
    borderColor: '#2a2a2a',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.6,
    shadowRadius: 20,
    elevation: 12,
  },
  scoreValue: {
    fontSize: 48,
    fontWeight: '700',
    letterSpacing: -2,
    color: '#ffffff',
    textShadowColor: 'rgba(255,255,255,0.15)',
    textShadowRadius: 8,
  },
  scoreLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 2,
    marginTop: 4,
  },
  metricsGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 28,
  },
  metricCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 18,
    paddingHorizontal: 8,
    backgroundColor: '#111111',
    borderRadius: 14,
    borderWidth: 0.5,
    borderColor: '#2a2a2a',
    position: 'relative',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  metricGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1,
  },
  metricValue: {
    fontSize: 20,
    fontWeight: '700',
    marginTop: 8,
    color: '#ffffff',
    textShadowColor: 'rgba(255,255,255,0.15)',
    textShadowRadius: 8,
  },
  metricLabel: {
    fontSize: 9,
    fontWeight: '600',
    letterSpacing: 1.5,
    marginTop: 4,
    color: '#555555',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 1.5,
    color: '#555555',
    marginBottom: 12,
  },
  bodyMapContainer: {
    backgroundColor: '#111111',
    borderRadius: 20,
    borderWidth: 0.5,
    borderColor: '#2a2a2a',
    paddingVertical: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.6,
    shadowRadius: 20,
    elevation: 12,
  },
  explanationCard: {
    backgroundColor: '#111111',
    borderRadius: 20,
    borderWidth: 0.5,
    borderColor: '#2a2a2a',
    padding: 20,
    marginBottom: 16,
    position: 'relative',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.6,
    shadowRadius: 20,
    elevation: 12,
  },
  explanationGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    opacity: 0.3,
  },
  explanationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  explanationTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  explanationTitle: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 1.5,
    color: '#555555',
  },
  aiTag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  aiTagText: {
    fontSize: 10,
    fontWeight: '700',
  },
  explanationText: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 16,
    color: '#8a8a8a',
  },
  reasoningList: {
    marginBottom: 16,
  },
  reasoningItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  reasoningBullet: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginTop: 8,
    marginRight: 10,
  },
  reasoningText: {
    fontSize: 13,
    lineHeight: 18,
    flex: 1,
    color: '#555555',
  },
  muscleStatusSummary: {
    paddingTop: 12,
    borderTopWidth: 0.5,
    borderTopColor: '#2e2e2e',
  },
  muscleStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 10,
  },
  muscleStatusText: {
    fontSize: 13,
    color: '#8a8a8a',
  },
  workoutCard: {
    marginBottom: 16,
    borderWidth: 0.5,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#111111',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.6,
    shadowRadius: 20,
    elevation: 12,
  },
  workoutContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
  },
  workoutLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  workoutTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: -0.5,
  },
  workoutType: {
    fontSize: 13,
    marginTop: 4,
    color: '#555555',
  },
  workoutArrow: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  bottomSpacer: {
    height: 20,
  },
});
