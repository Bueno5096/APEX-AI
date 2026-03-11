import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LineChart, BarChart } from 'react-native-gifted-charts';
import { useThemeStore } from '../../src/store/themeStore';
import { MetallicCard } from '../../src/components/MetallicCard';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type TimeFilter = '7d' | '30d' | '3m' | '1y';

export default function ProgressScreen() {
  const { theme, accentColor } = useThemeStore();
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('30d');
  
  // Sample data for charts
  const strengthData = [
    { value: 80, label: 'W1' },
    { value: 82.5, label: 'W2' },
    { value: 85, label: 'W3' },
    { value: 82.5, label: 'W4' },
    { value: 87.5, label: 'W5' },
    { value: 90, label: 'W6' },
  ];
  
  const recoveryData = [
    { value: 72, label: 'Mon' },
    { value: 68, label: 'Tue' },
    { value: 75, label: 'Wed' },
    { value: 82, label: 'Thu' },
    { value: 78, label: 'Fri' },
    { value: 85, label: 'Sat' },
    { value: 80, label: 'Sun' },
  ];
  
  const workoutFrequencyData = [
    { value: 4, label: 'W1', frontColor: accentColor },
    { value: 5, label: 'W2', frontColor: accentColor },
    { value: 3, label: 'W3', frontColor: accentColor },
    { value: 5, label: 'W4', frontColor: accentColor },
    { value: 4, label: 'W5', frontColor: accentColor },
    { value: 6, label: 'W6', frontColor: accentColor },
  ];
  
  const personalRecords = [
    { exercise: 'Bench Press', weight: 100, date: '2 weeks ago' },
    { exercise: 'Squat', weight: 140, date: '1 week ago' },
    { exercise: 'Deadlift', weight: 160, date: '3 days ago' },
    { exercise: 'Overhead Press', weight: 60, date: '1 month ago' },
  ];
  
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: theme.colors.textPrimary }]}>
            Progress
          </Text>
          <Text style={[styles.headerSubtitle, { color: theme.colors.textSecondary }]}>
            Track your improvements
          </Text>
        </View>
        
        {/* Time Filter */}
        <View style={[styles.filterContainer, { backgroundColor: theme.colors.card }]}>
          {(['7d', '30d', '3m', '1y'] as TimeFilter[]).map((filter) => (
            <TouchableOpacity
              key={filter}
              style={[
                styles.filterButton,
                timeFilter === filter && { backgroundColor: accentColor + '30' },
              ]}
              onPress={() => setTimeFilter(filter)}
            >
              <Text
                style={[
                  styles.filterText,
                  { color: timeFilter === filter ? accentColor : theme.colors.textSecondary },
                ]}
              >
                {filter === '7d' ? '7 Days' : filter === '30d' ? '30 Days' : filter === '3m' ? '3 Months' : '1 Year'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        
        {/* Overview Cards */}
        <View style={styles.overviewGrid}>
          <MetallicCard style={styles.overviewCard}>
            <Ionicons name="trending-up" size={24} color={theme.colors.success} />
            <Text style={[styles.overviewValue, { color: theme.colors.textPrimary }]}>
              +12%
            </Text>
            <Text style={[styles.overviewLabel, { color: theme.colors.textSecondary }]}>
              Strength
            </Text>
          </MetallicCard>
          
          <MetallicCard style={styles.overviewCard}>
            <Ionicons name="pulse" size={24} color={accentColor} />
            <Text style={[styles.overviewValue, { color: theme.colors.textPrimary }]}>
              78%
            </Text>
            <Text style={[styles.overviewLabel, { color: theme.colors.textSecondary }]}>
              Avg Recovery
            </Text>
          </MetallicCard>
          
          <MetallicCard style={styles.overviewCard}>
            <Ionicons name="flame" size={24} color={theme.colors.warning} />
            <Text style={[styles.overviewValue, { color: theme.colors.textPrimary }]}>
              27
            </Text>
            <Text style={[styles.overviewLabel, { color: theme.colors.textSecondary }]}>
              Workouts
            </Text>
          </MetallicCard>
          
          <MetallicCard style={styles.overviewCard}>
            <Ionicons name="trophy" size={24} color={theme.colors.warning} />
            <Text style={[styles.overviewValue, { color: theme.colors.textPrimary }]}>
              12
            </Text>
            <Text style={[styles.overviewLabel, { color: theme.colors.textSecondary }]}>
              Day Streak
            </Text>
          </MetallicCard>
        </View>
        
        {/* Strength Progress Chart */}
        <MetallicCard style={styles.chartCard}>
          <View style={styles.chartHeader}>
            <Text style={[styles.chartTitle, { color: theme.colors.textPrimary }]}>
              Strength Progress
            </Text>
            <Text style={[styles.chartSubtitle, { color: theme.colors.textSecondary }]}>
              Bench Press (kg)
            </Text>
          </View>
          <LineChart
            data={strengthData}
            width={SCREEN_WIDTH - 100}
            height={180}
            color={accentColor}
            thickness={3}
            dataPointsColor={accentColor}
            dataPointsRadius={5}
            xAxisColor={theme.colors.metallic}
            yAxisColor={theme.colors.metallic}
            xAxisLabelTextStyle={{ color: theme.colors.textMuted, fontSize: 10 }}
            yAxisTextStyle={{ color: theme.colors.textMuted, fontSize: 10 }}
            hideRules
            curved
            areaChart
            startFillColor={accentColor}
            endFillColor={accentColor}
            startOpacity={0.3}
            endOpacity={0.05}
          />
        </MetallicCard>
        
        {/* Recovery Trend Chart */}
        <MetallicCard style={styles.chartCard}>
          <View style={styles.chartHeader}>
            <Text style={[styles.chartTitle, { color: theme.colors.textPrimary }]}>
              Recovery Trend
            </Text>
            <Text style={[styles.chartSubtitle, { color: theme.colors.textSecondary }]}>
              This week
            </Text>
          </View>
          <LineChart
            data={recoveryData}
            width={SCREEN_WIDTH - 100}
            height={160}
            color={theme.colors.success}
            thickness={2}
            dataPointsColor={theme.colors.success}
            dataPointsRadius={4}
            xAxisColor={theme.colors.metallic}
            yAxisColor={theme.colors.metallic}
            xAxisLabelTextStyle={{ color: theme.colors.textMuted, fontSize: 10 }}
            yAxisTextStyle={{ color: theme.colors.textMuted, fontSize: 10 }}
            hideRules
            curved
            maxValue={100}
          />
        </MetallicCard>
        
        {/* Workout Frequency */}
        <MetallicCard style={styles.chartCard}>
          <View style={styles.chartHeader}>
            <Text style={[styles.chartTitle, { color: theme.colors.textPrimary }]}>
              Workout Frequency
            </Text>
            <Text style={[styles.chartSubtitle, { color: theme.colors.textSecondary }]}>
              Sessions per week
            </Text>
          </View>
          <BarChart
            data={workoutFrequencyData}
            width={SCREEN_WIDTH - 100}
            height={140}
            barWidth={32}
            spacing={24}
            xAxisColor={theme.colors.metallic}
            yAxisColor={theme.colors.metallic}
            xAxisLabelTextStyle={{ color: theme.colors.textMuted, fontSize: 10 }}
            yAxisTextStyle={{ color: theme.colors.textMuted, fontSize: 10 }}
            hideRules
            barBorderRadius={6}
            maxValue={7}
          />
        </MetallicCard>
        
        {/* Personal Records */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>
            Personal Records
          </Text>
          {personalRecords.map((record, index) => (
            <MetallicCard key={index} style={styles.recordCard}>
              <View style={styles.recordRow}>
                <View style={[styles.recordIcon, { backgroundColor: accentColor + '20' }]}>
                  <Ionicons name="trophy" size={20} color={accentColor} />
                </View>
                <View style={styles.recordInfo}>
                  <Text style={[styles.recordExercise, { color: theme.colors.textPrimary }]}>
                    {record.exercise}
                  </Text>
                  <Text style={[styles.recordDate, { color: theme.colors.textMuted }]}>
                    {record.date}
                  </Text>
                </View>
                <Text style={[styles.recordWeight, { color: accentColor }]}>
                  {record.weight}kg
                </Text>
              </View>
            </MetallicCard>
          ))}
        </View>
        
        {/* AI Insight */}
        <MetallicCard style={styles.insightCard} intensity="medium">
          <View style={styles.insightHeader}>
            <Ionicons name="sparkles" size={24} color={accentColor} />
            <Text style={[styles.insightTitle, { color: theme.colors.textPrimary }]}>
              Coach Analysis
            </Text>
          </View>
          <Text style={[styles.insightText, { color: theme.colors.textSecondary }]}>
            Strong progress this month! Your bench press has increased 12.5% over 6 weeks. 
            Your recovery scores are consistent, averaging 78%. Consider adding more leg 
            training - your lower body volume is 23% below your upper body. Keep up the 
            great work on maintaining your streak!
          </Text>
        </MetallicCard>
        
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
    marginBottom: 20,
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
  filterContainer: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
  },
  filterButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  filterText: {
    fontSize: 13,
    fontWeight: '600',
  },
  overviewGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6,
    marginBottom: 20,
  },
  overviewCard: {
    width: '46%',
    marginHorizontal: '2%',
    marginBottom: 12,
    alignItems: 'center',
    paddingVertical: 20,
  },
  overviewValue: {
    fontSize: 28,
    fontWeight: '700',
    marginTop: 8,
  },
  overviewLabel: {
    fontSize: 12,
    marginTop: 4,
  },
  chartCard: {
    marginBottom: 20,
    paddingVertical: 20,
  },
  chartHeader: {
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  chartSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 16,
  },
  recordCard: {
    marginBottom: 10,
  },
  recordRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  recordIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  recordInfo: {
    flex: 1,
  },
  recordExercise: {
    fontSize: 16,
    fontWeight: '600',
  },
  recordDate: {
    fontSize: 12,
    marginTop: 2,
  },
  recordWeight: {
    fontSize: 24,
    fontWeight: '700',
  },
  insightCard: {
    marginBottom: 20,
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
  bottomSpacer: {
    height: 20,
  },
});
