import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  RefreshControl,
  TouchableOpacity 
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

// Futuristic circular progress component
const ApexCircularProgress = ({ 
  value, 
  size = 180, 
  strokeWidth = 10,
  accentColor,
  theme,
}: {
  value: number;
  size?: number;
  strokeWidth?: number;
  accentColor: string;
  theme: any;
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const progress = Math.min(Math.max(value, 0), 100);
  const strokeDashoffset = circumference - (progress / 100) * circumference;
  
  const statusLabel = progress >= 75 ? 'READY TO TRAIN' : 
                     progress >= 50 ? 'MODERATE' : 'RECOVERY NEEDED';

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={{ position: 'absolute' }}>
        <Defs>
          <SvgGradient id="progressGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <Stop offset="0%" stopColor={accentColor} stopOpacity={0.8} />
            <Stop offset="100%" stopColor={accentColor} stopOpacity={0.4} />
          </SvgGradient>
        </Defs>
        {/* Background track */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={theme.colors.metallic}
          strokeWidth={strokeWidth}
          fill="transparent"
          opacity={0.4}
        />
        {/* Progress arc */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="url(#progressGrad)"
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="square"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <View style={{ alignItems: 'center' }}>
        <Text style={[styles.scoreValue, { color: theme.colors.textPrimary }]}>
          {Math.round(progress)}
        </Text>
        <Text style={[styles.scoreLabel, { color: accentColor }]}>
          {statusLabel}
        </Text>
      </View>
    </View>
  );
};

// Sharp-edged metric card
const MetricCard = ({ 
  icon, 
  value, 
  label, 
  accentColor, 
  theme 
}: { 
  icon: string; 
  value: string; 
  label: string; 
  accentColor: string; 
  theme: any;
}) => (
  <View style={[styles.metricCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder }]}>
    <View style={[styles.metricGlow, { backgroundColor: accentColor }]} />
    <Ionicons name={icon as any} size={18} color={accentColor} />
    <Text style={[styles.metricValue, { color: theme.colors.textPrimary }]}>{value}</Text>
    <Text style={[styles.metricLabel, { color: theme.colors.textSecondary }]}>{label}</Text>
  </View>
);

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
  
  // Calculate overall readiness from muscle states
  const muscleReadiness = Object.values(muscles);
  const avgReadiness = muscleReadiness.length > 0 
    ? muscleReadiness.reduce((sum, m) => sum + m.readiness, 0) / muscleReadiness.length 
    : 75;
  
  const overallScore = recoveryData 
    ? Math.round((recoveryData.score * 0.6) + (avgReadiness * 0.4))
    : Math.round(avgReadiness);
  
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
            <Text style={[styles.headerTitle, { color: theme.colors.textPrimary }]}>
              RECOVERY
            </Text>
            <Text style={[styles.headerSubtitle, { color: theme.colors.textSecondary }]}>
              Body Readiness Analysis
            </Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: accentColor + '20', borderColor: accentColor }]}>
            <View style={[styles.statusDot, { backgroundColor: accentColor }]} />
            <Text style={[styles.statusText, { color: accentColor }]}>LIVE</Text>
          </View>
        </View>
        
        {/* Recovery Score */}
        <View style={[styles.scoreSection, { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder }]}>
          <ApexCircularProgress 
            value={overallScore} 
            size={200}
            accentColor={accentColor}
            theme={theme}
          />
        </View>
        
        {/* Metrics Grid */}
        <View style={styles.metricsGrid}>
          <MetricCard 
            icon="moon" 
            value={recoveryData?.metrics.sleepDuration ? `${recoveryData.metrics.sleepDuration}h` : '--'}
            label="SLEEP"
            accentColor={accentColor}
            theme={theme}
          />
          <MetricCard 
            icon="pulse" 
            value={recoveryData?.metrics.hrv ? `${recoveryData.metrics.hrv}` : '--'}
            label="HRV"
            accentColor={accentColor}
            theme={theme}
          />
          <MetricCard 
            icon="heart" 
            value={recoveryData?.metrics.restingHeartRate ? `${recoveryData.metrics.restingHeartRate}` : '--'}
            label="RHR"
            accentColor={accentColor}
            theme={theme}
          />
          <MetricCard 
            icon="footsteps" 
            value={recoveryData?.metrics.steps ? `${(recoveryData.metrics.steps / 1000).toFixed(1)}k` : '--'}
            label="STEPS"
            accentColor={accentColor}
            theme={theme}
          />
        </View>
        
        {/* Body Map Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>
              MUSCLE READINESS
            </Text>
            <Text style={[styles.sectionSubtitle, { color: theme.colors.textSecondary }]}>
              Tap regions for details
            </Text>
          </View>
          <View style={[styles.bodyMapContainer, { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder }]}>
            <ApexBodyMap mode="readiness" />
          </View>
        </View>
        
        {/* Why This Recommendation - AI Explanation Panel */}
        <View style={[styles.explanationCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder }]}>
          <View style={[styles.explanationGlow, { backgroundColor: accentColor }]} />
          <View style={styles.explanationHeader}>
            <View style={styles.explanationTitleRow}>
              <Ionicons name="sparkles" size={20} color={accentColor} />
              <Text style={[styles.explanationTitle, { color: theme.colors.textPrimary }]}>
                WHY THIS RECOMMENDATION
              </Text>
            </View>
            <View style={[styles.aiTag, { backgroundColor: accentColor + '20' }]}>
              <Text style={[styles.aiTagText, { color: accentColor }]}>AI</Text>
            </View>
          </View>
          
          <Text style={[styles.explanationText, { color: theme.colors.textSecondary }]}>
            {recommendation.explanation}
          </Text>
          
          {recommendation.reasoning.length > 0 && (
            <View style={styles.reasoningList}>
              {recommendation.reasoning.map((reason, i) => (
                <View key={i} style={styles.reasoningItem}>
                  <View style={[styles.reasoningBullet, { backgroundColor: accentColor }]} />
                  <Text style={[styles.reasoningText, { color: theme.colors.textMuted }]}>
                    {reason}
                  </Text>
                </View>
              ))}
            </View>
          )}
          
          {/* Muscle status summary */}
          <View style={styles.muscleStatusSummary}>
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
        
        {/* Recommended Workout Card */}
        <TouchableOpacity onPress={() => {
          setTodayWorkoutByType(recommendation.type, recommendation.title);
          setWorkoutApplied(true);
          setTimeout(() => {
            router.push('/(tabs)/workout');
          }, 600);
        }}>
          <View style={[styles.workoutCard, { 
            backgroundColor: theme.colors.card, 
            borderColor: workoutApplied ? theme.colors.success : accentColor 
          }]}>
            <LinearGradient
              colors={[accentColor + '15', 'transparent']}
              style={styles.workoutGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            />
            <View style={styles.workoutContent}>
              <View>
                <Text style={[styles.workoutLabel, { color: accentColor }]}>
                  RECOMMENDED
                </Text>
                <Text style={[styles.workoutTitle, { color: theme.colors.textPrimary }]}>
                  {recommendation.title}
                </Text>
                <Text style={[styles.workoutType, { color: theme.colors.textSecondary }]}>
                  {workoutApplied ? 'Workout set! Navigating...' : 'Tap to set as today\'s workout'}
                </Text>
              </View>
              <View style={[styles.workoutArrow, { backgroundColor: workoutApplied ? theme.colors.success : accentColor }]}>
                <Ionicons name={workoutApplied ? "checkmark" : "arrow-forward"} size={22} color="#FFFFFF" />
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
    marginBottom: 24,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: 3,
  },
  headerSubtitle: {
    fontSize: 12,
    marginTop: 4,
    letterSpacing: 1,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
  },
  statusDot: {
    width: 6,
    height: 6,
    marginRight: 6,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
  },
  scoreSection: {
    alignItems: 'center',
    paddingVertical: 32,
    marginBottom: 20,
    borderWidth: 1,
  },
  scoreValue: {
    fontSize: 56,
    fontWeight: '700',
    letterSpacing: -2,
  },
  scoreLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 2,
    marginTop: 4,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6,
    marginBottom: 24,
  },
  metricCard: {
    width: '22%',
    marginHorizontal: '1.5%',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 8,
    borderWidth: 1,
    position: 'relative',
    overflow: 'hidden',
  },
  metricGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 2,
  },
  metricValue: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 8,
  },
  metricLabel: {
    fontSize: 9,
    fontWeight: '600',
    letterSpacing: 1,
    marginTop: 4,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 2,
  },
  sectionSubtitle: {
    fontSize: 11,
    marginTop: 2,
  },
  bodyMapContainer: {
    borderWidth: 1,
    paddingVertical: 16,
  },
  explanationCard: {
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    position: 'relative',
    overflow: 'hidden',
  },
  explanationGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 2,
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
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
  },
  aiTag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  aiTagText: {
    fontSize: 10,
    fontWeight: '700',
  },
  explanationText: {
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 16,
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
    marginTop: 8,
    marginRight: 10,
  },
  reasoningText: {
    fontSize: 12,
    lineHeight: 18,
    flex: 1,
  },
  muscleStatusSummary: {
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  muscleStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  statusIndicator: {
    width: 8,
    height: 8,
    marginRight: 10,
  },
  muscleStatusText: {
    fontSize: 12,
  },
  workoutCard: {
    marginBottom: 16,
    borderWidth: 1,
    overflow: 'hidden',
    position: 'relative',
  },
  workoutGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  workoutContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
  },
  workoutLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 2,
    marginBottom: 4,
  },
  workoutTitle: {
    fontSize: 24,
    fontWeight: '700',
  },
  workoutType: {
    fontSize: 12,
    marginTop: 4,
  },
  workoutArrow: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomSpacer: {
    height: 20,
  },
});
