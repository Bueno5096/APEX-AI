import React from 'react';
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
import { useThemeStore } from '../../src/store/themeStore';
import { useHealthStore } from '../../src/store/healthStore';
import { MetallicCard } from '../../src/components/MetallicCard';
import { CircularProgress } from '../../src/components/CircularProgress';
import { BodyMap } from '../../src/components/BodyMap';

export default function RecoveryScreen() {
  const { theme, accentColor } = useThemeStore();
  const { recoveryData, isLoading, refreshData } = useHealthStore();
  const router = useRouter();
  
  if (!recoveryData) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={styles.loadingContainer}>
          <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>
            Loading recovery data...
          </Text>
        </View>
      </SafeAreaView>
    );
  }
  
  const { score, statusLabel, metrics, muscles } = recoveryData;
  
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
          <Text style={[styles.headerTitle, { color: theme.colors.textPrimary }]}>
            Recovery
          </Text>
          <Text style={[styles.headerSubtitle, { color: theme.colors.textSecondary }]}>
            Body Readiness Dashboard
          </Text>
        </View>
        
        {/* Recovery Score */}
        <View style={styles.scoreSection}>
          <CircularProgress
            value={score}
            size={200}
            strokeWidth={14}
            label={statusLabel}
          />
        </View>
        
        {/* Metrics Grid */}
        <View style={styles.metricsGrid}>
          <MetallicCard style={styles.metricCard}>
            <Ionicons name="moon" size={20} color={accentColor} />
            <Text style={[styles.metricValue, { color: theme.colors.textPrimary }]}>
              {metrics.sleepDuration}h
            </Text>
            <Text style={[styles.metricLabel, { color: theme.colors.textSecondary }]}>
              Sleep
            </Text>
          </MetallicCard>
          
          <MetallicCard style={styles.metricCard}>
            <Ionicons name="star" size={20} color={accentColor} />
            <Text style={[styles.metricValue, { color: theme.colors.textPrimary }]}>
              {metrics.sleepScore}
            </Text>
            <Text style={[styles.metricLabel, { color: theme.colors.textSecondary }]}>
              Sleep Score
            </Text>
          </MetallicCard>
          
          <MetallicCard style={styles.metricCard}>
            <Ionicons name="pulse" size={20} color={accentColor} />
            <Text style={[styles.metricValue, { color: theme.colors.textPrimary }]}>
              {metrics.hrv}ms
            </Text>
            <Text style={[styles.metricLabel, { color: theme.colors.textSecondary }]}>
              HRV
            </Text>
          </MetallicCard>
          
          <MetallicCard style={styles.metricCard}>
            <Ionicons name="heart" size={20} color={accentColor} />
            <Text style={[styles.metricValue, { color: theme.colors.textPrimary }]}>
              {metrics.restingHeartRate}
            </Text>
            <Text style={[styles.metricLabel, { color: theme.colors.textSecondary }]}>
              Resting HR
            </Text>
          </MetallicCard>
          
          <MetallicCard style={styles.metricCard}>
            <Ionicons name="footsteps" size={20} color={accentColor} />
            <Text style={[styles.metricValue, { color: theme.colors.textPrimary }]}>
              {metrics.steps.toLocaleString()}
            </Text>
            <Text style={[styles.metricLabel, { color: theme.colors.textSecondary }]}>
              Steps
            </Text>
          </MetallicCard>
          
          <MetallicCard style={styles.metricCard}>
            <Ionicons name="flame" size={20} color={accentColor} />
            <Text style={[styles.metricValue, { color: theme.colors.textPrimary }]}>
              {metrics.caloriesBurned}
            </Text>
            <Text style={[styles.metricLabel, { color: theme.colors.textSecondary }]}>
              Calories
            </Text>
          </MetallicCard>
        </View>
        
        {/* Body Map Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>
            Muscle Readiness
          </Text>
          <Text style={[styles.sectionSubtitle, { color: theme.colors.textSecondary }]}>
            Tap muscles for details
          </Text>
          <MetallicCard style={styles.bodyMapCard}>
            <BodyMap muscles={muscles} mode="readiness" />
            
            {/* Legend */}
            <View style={styles.legend}>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: accentColor }]} />
                <Text style={[styles.legendText, { color: theme.colors.textSecondary }]}>
                  Recovered
                </Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: theme.colors.muscleFatigueMild }]} />
                <Text style={[styles.legendText, { color: theme.colors.textSecondary }]}>
                  Mild Fatigue
                </Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: theme.colors.muscleFatigueModerate }]} />
                <Text style={[styles.legendText, { color: theme.colors.textSecondary }]}>
                  Moderate
                </Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: theme.colors.muscleOverworked }]} />
                <Text style={[styles.legendText, { color: theme.colors.textSecondary }]}>
                  Overworked
                </Text>
              </View>
            </View>
          </MetallicCard>
        </View>
        
        {/* Coach Insight */}
        <MetallicCard style={styles.insightCard} intensity="medium">
          <View style={styles.insightHeader}>
            <Ionicons name="sparkles" size={24} color={accentColor} />
            <Text style={[styles.insightTitle, { color: theme.colors.textPrimary }]}>
              Coach Insight
            </Text>
          </View>
          <Text style={[styles.insightText, { color: theme.colors.textSecondary }]}>
            {score >= 75
              ? "Your body is well-recovered. You're primed for an intense training session today. Consider pushing your limits on compound lifts."
              : score >= 50
              ? "Moderate recovery detected. A standard workout is fine, but consider reducing volume on heavily fatigued muscle groups."
              : "Your body needs more recovery. Consider a light mobility session or active recovery day to prevent overtraining."}
          </Text>
        </MetallicCard>
        
        {/* Recommended Workout */}
        <TouchableOpacity onPress={() => router.push('/(tabs)/workout')}>
          <MetallicCard style={styles.workoutCard} intensity="high">
            <View style={styles.workoutHeader}>
              <View>
                <Text style={[styles.workoutLabel, { color: theme.colors.textSecondary }]}>
                  RECOMMENDED WORKOUT
                </Text>
                <Text style={[styles.workoutTitle, { color: theme.colors.textPrimary }]}>
                  Push Day
                </Text>
                <Text style={[styles.workoutMeta, { color: theme.colors.textSecondary }]}>
                  45 min • Moderate Intensity
                </Text>
              </View>
              <View style={[styles.workoutArrow, { backgroundColor: accentColor + '20' }]}>
                <Ionicons name="arrow-forward" size={24} color={accentColor} />
              </View>
            </View>
          </MetallicCard>
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
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 16,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  header: {
    marginBottom: 24,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 14,
    marginTop: 4,
  },
  scoreSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6,
    marginBottom: 24,
  },
  metricCard: {
    width: '30%',
    marginHorizontal: '1.5%',
    marginBottom: 12,
    alignItems: 'center',
    paddingVertical: 16,
  },
  metricValue: {
    fontSize: 20,
    fontWeight: '700',
    marginTop: 8,
  },
  metricLabel: {
    fontSize: 11,
    marginTop: 4,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 13,
    marginBottom: 16,
  },
  bodyMapCard: {
    paddingVertical: 24,
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
  },
  insightCard: {
    marginBottom: 16,
  },
  insightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  insightTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  insightText: {
    fontSize: 14,
    lineHeight: 22,
  },
  workoutCard: {
    marginBottom: 16,
  },
  workoutHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  workoutLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1,
    marginBottom: 4,
  },
  workoutTitle: {
    fontSize: 24,
    fontWeight: '700',
  },
  workoutMeta: {
    fontSize: 13,
    marginTop: 4,
  },
  workoutArrow: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomSpacer: {
    height: 20,
  },
});
