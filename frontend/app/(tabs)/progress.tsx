import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LineChart, BarChart } from 'react-native-gifted-charts';
import { useThemeStore } from '../../src/store/themeStore';
import { MetallicCard } from '../../src/components/MetallicCard';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type TimeFilter = '7d' | '30d' | '3m' | '1y';

// Animated counter
const CountUp = ({ target, color }: { target: string; color: string }) => {
  const anim = useRef(new Animated.Value(0)).current;
  const [val, setVal] = useState('0');
  const numericPart = parseFloat(target.replace(/[^0-9.]/g, ''));
  const suffix = target.replace(/[0-9.+-]/g, '');

  useEffect(() => {
    Animated.timing(anim, { toValue: numericPart, duration: 1000, useNativeDriver: false }).start();
    const id = anim.addListener(({ value }) => {
      setVal(Number.isInteger(numericPart) ? Math.round(value).toString() : value.toFixed(0));
    });
    return () => anim.removeListener(id);
  }, [numericPart]);

  return (
    <Text style={[styles.overviewValue, {
      color,
      textShadowColor: 'rgba(255,255,255,0.15)',
      textShadowRadius: 8,
    }]}>
      {target.startsWith('+') ? '+' : ''}{val}{suffix}
    </Text>
  );
};

export default function ProgressScreen() {
  const { theme, accentColor } = useThemeStore();
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('30d');
  const isDark = theme.name === 'dark';
  
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
          <Text style={[styles.headerTitle, { color: theme.colors.textPrimary }]}>Progress</Text>
          <Text style={[styles.headerSubtitle, { color: theme.colors.textMuted }]}>PERFORMANCE TRACKING</Text>
        </View>
        
        {/* Time Filter */}
        <View style={[styles.filterContainer, { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder }]}>
          {(['7d', '30d', '3m', '1y'] as TimeFilter[]).map((filter) => (
            <TouchableOpacity
              key={filter}
              style={[
                styles.filterButton,
                timeFilter === filter && [styles.filterButtonActive, { borderTopColor: accentColor, backgroundColor: theme.colors.cardSecondary }],
              ]}
              onPress={() => setTimeFilter(filter)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.filterText,
                  { color: timeFilter === filter ? theme.colors.textPrimary : theme.colors.textMuted },
                ]}
              >
                {filter === '7d' ? '7 Days' : filter === '30d' ? '30 Days' : filter === '3m' ? '3 Months' : '1 Year'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        
        {/* Overview Cards */}
        <View style={styles.overviewGrid}>
          <MetallicCard style={styles.overviewCard} delay={0} small>
            <Ionicons name="trending-up" size={22} color="#3A7A5A" />
            <CountUp target="+12%" color="#ffffff" />
            <Text style={styles.overviewLabel}>Strength</Text>
          </MetallicCard>
          
          <MetallicCard style={styles.overviewCard} delay={80} small>
            <Ionicons name="pulse" size={22} color={accentColor} />
            <CountUp target="78%" color="#ffffff" />
            <Text style={styles.overviewLabel}>Avg Recovery</Text>
          </MetallicCard>
          
          <MetallicCard style={styles.overviewCard} delay={160} small>
            <Ionicons name="flame" size={22} color="#8A6A3A" />
            <CountUp target="27" color="#ffffff" />
            <Text style={styles.overviewLabel}>Workouts</Text>
          </MetallicCard>
          
          <MetallicCard style={styles.overviewCard} delay={240} small>
            <Ionicons name="trophy" size={22} color="#8A6A3A" />
            <CountUp target="12" color="#ffffff" />
            <Text style={styles.overviewLabel}>Day Streak</Text>
          </MetallicCard>
        </View>
        
        {/* Strength Progress Chart */}
        <MetallicCard style={styles.chartCard} delay={320}>
          <View style={styles.chartHeader}>
            <Text style={[styles.chartTitle, { color: theme.colors.textPrimary }]}>Strength Progress</Text>
            <Text style={[styles.chartSubtitle, { color: theme.colors.textMuted }]}>Bench Press (kg)</Text>
          </View>
          <LineChart
            data={strengthData}
            width={SCREEN_WIDTH - 100}
            height={180}
            color={accentColor}
            thickness={2}
            dataPointsColor={accentColor}
            dataPointsRadius={4}
            xAxisColor={theme.colors.divider}
            yAxisColor={theme.colors.divider}
            xAxisLabelTextStyle={{ color: theme.colors.textMuted, fontSize: 10 }}
            yAxisTextStyle={{ color: theme.colors.textMuted, fontSize: 10 }}
            hideRules
            curved
            areaChart
            startFillColor={accentColor}
            endFillColor={accentColor}
            startOpacity={0.2}
            endOpacity={0.02}
          />
        </MetallicCard>
        
        {/* Recovery Trend */}
        <MetallicCard style={styles.chartCard} delay={400}>
          <View style={styles.chartHeader}>
            <Text style={[styles.chartTitle, { color: theme.colors.textPrimary }]}>Recovery Trend</Text>
            <Text style={[styles.chartSubtitle, { color: theme.colors.textMuted }]}>This week</Text>
          </View>
          <LineChart
            data={recoveryData}
            width={SCREEN_WIDTH - 100}
            height={160}
            color={isDark ? '#c0c0c0' : accentColor}
            thickness={2}
            dataPointsColor={isDark ? '#c0c0c0' : accentColor}
            dataPointsRadius={4}
            xAxisColor={theme.colors.divider}
            yAxisColor={theme.colors.divider}
            xAxisLabelTextStyle={{ color: theme.colors.textMuted, fontSize: 10 }}
            yAxisTextStyle={{ color: theme.colors.textMuted, fontSize: 10 }}
            hideRules
            curved
            maxValue={100}
          />
        </MetallicCard>
        
        {/* Workout Frequency */}
        <MetallicCard style={styles.chartCard} delay={480}>
          <View style={styles.chartHeader}>
            <Text style={[styles.chartTitle, { color: theme.colors.textPrimary }]}>Workout Frequency</Text>
            <Text style={[styles.chartSubtitle, { color: theme.colors.textMuted }]}>Sessions per week</Text>
          </View>
          <BarChart
            data={workoutFrequencyData}
            width={SCREEN_WIDTH - 100}
            height={140}
            barWidth={32}
            spacing={24}
            xAxisColor={theme.colors.divider}
            yAxisColor={theme.colors.divider}
            xAxisLabelTextStyle={{ color: theme.colors.textMuted, fontSize: 10 }}
            yAxisTextStyle={{ color: theme.colors.textMuted, fontSize: 10 }}
            hideRules
            barBorderRadius={8}
            maxValue={7}
          />
        </MetallicCard>
        
        {/* Personal Records */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.textMuted }]}>PERSONAL RECORDS</Text>
          {personalRecords.map((record, index) => (
            <MetallicCard key={index} style={styles.recordCard} delay={560 + index * 80} small>
              <View style={styles.recordRow}>
                <View style={[styles.recordIcon, { backgroundColor: accentColor + '12' }]}>
                  <Ionicons name="trophy" size={18} color={accentColor} />
                </View>
                <View style={styles.recordInfo}>
                  <Text style={[styles.recordExercise, { color: theme.colors.textPrimary }]}>{record.exercise}</Text>
                  <Text style={[styles.recordDate, { color: theme.colors.textMuted }]}>{record.date}</Text>
                </View>
                <Text style={[styles.recordWeight, { color: accentColor }]}>
                  {record.weight}kg
                </Text>
              </View>
            </MetallicCard>
          ))}
        </View>
        
        {/* AI Insight */}
        <MetallicCard style={styles.insightCard} intensity="medium" delay={800}>
          <View style={styles.insightHeader}>
            <Ionicons name="sparkles" size={20} color={accentColor} />
            <Text style={[styles.insightTitle, { color: theme.colors.textPrimary }]}>Coach Analysis</Text>
          </View>
          <Text style={[styles.insightText, { color: theme.colors.textSecondary }]}>
            Strong progress this month! Your bench press has increased 12.5% over 6 weeks. 
            Your recovery scores are consistent, averaging 78%. Consider adding more leg 
            training - your lower body volume is 23% below your upper body.
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
    backgroundColor: '#000000',
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
  filterContainer: {
    flexDirection: 'row',
    backgroundColor: '#111111',
    borderRadius: 14,
    padding: 4,
    marginBottom: 24,
    borderWidth: 0.5,
    borderColor: '#2a2a2a',
  },
  filterButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10,
  },
  filterButtonActive: {
    backgroundColor: '#242424',
    borderTopWidth: 1,
  },
  filterText: {
    fontSize: 13,
    fontWeight: '600',
  },
  overviewGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -5,
    marginBottom: 24,
  },
  overviewCard: {
    width: '46%',
    marginHorizontal: '2%',
    marginBottom: 10,
    alignItems: 'center',
    paddingVertical: 20,
  },
  overviewValue: {
    fontSize: 28,
    fontWeight: '700',
    marginTop: 8,
    letterSpacing: -1,
  },
  overviewLabel: {
    fontSize: 11,
    marginTop: 4,
    color: '#555555',
    fontWeight: '600',
    letterSpacing: 0.5,
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
    fontSize: 17,
    fontWeight: '700',
    color: '#ffffff',
  },
  chartSubtitle: {
    fontSize: 12,
    marginTop: 2,
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
    marginBottom: 16,
  },
  recordCard: {
    marginBottom: 8,
  },
  recordRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  recordIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  recordInfo: {
    flex: 1,
  },
  recordExercise: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  recordDate: {
    fontSize: 12,
    marginTop: 2,
    color: '#555555',
  },
  recordWeight: {
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  insightCard: {
    marginBottom: 20,
  },
  insightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 10,
  },
  insightTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  insightText: {
    fontSize: 15,
    lineHeight: 22,
    color: '#8a8a8a',
  },
  bottomSpacer: {
    height: 20,
  },
});
