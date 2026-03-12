import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useThemeStore } from '../../src/store/themeStore';
import { useWorkoutStore } from '../../src/store/workoutStore';
import { MetallicCard } from '../../src/components/MetallicCard';
import { ApexBodyMap } from '../../src/components/ApexBodyMap';
import { useHealthStore } from '../../src/store/healthStore';
import { CircularProgress } from '../../src/components/CircularProgress';

export default function WorkoutScreen() {
  const { theme, accentColor } = useThemeStore();
  const { recoveryData } = useHealthStore();
  const {
    todayWorkout,
    activeWorkout,
    startWorkout,
    endWorkout,
    completeSet,
    nextExercise,
    decrementRestTimer,
  } = useWorkoutStore();
  
  const [showCoachAssist, setShowCoachAssist] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  
  // Rest timer countdown
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (activeWorkout.isResting && activeWorkout.restTimer > 0) {
      interval = setInterval(() => {
        decrementRestTimer();
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [activeWorkout.isResting, activeWorkout.restTimer]);
  
  const isWorkoutActive = activeWorkout.workout !== null;
  const currentExercise = isWorkoutActive
    ? activeWorkout.workout?.exercises[activeWorkout.currentExerciseIndex]
    : null;
  
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };
  
  if (!todayWorkout) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={styles.loadingContainer}>
          <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>
            Loading workout...
          </Text>
        </View>
      </SafeAreaView>
    );
  }
  
  // Active Workout Mode
  if (isWorkoutActive && currentExercise && !isMinimized) {
    const workout = activeWorkout.workout!;
    const completedCount = workout.exercises.filter((e) => e.isCompleted).length;
    const progress = (completedCount / workout.exercises.length) * 100;
    
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          {/* Active Header with Minimize + End */}
          <View style={styles.activeHeader}>
            <View style={styles.activeHeaderLeft}>
              <TouchableOpacity
                style={[styles.minimizeButton, { borderColor: theme.colors.cardBorder }]}
                onPress={() => setIsMinimized(true)}
              >
                <Ionicons name="chevron-down" size={20} color={theme.colors.textSecondary} />
              </TouchableOpacity>
              <View>
                <Text style={[styles.activeTitle, { color: accentColor }]}>
                  ACTIVE WORKOUT
                </Text>
                <Text style={[styles.workoutName, { color: theme.colors.textPrimary }]}>
                  {workout.title}
                </Text>
              </View>
            </View>
            <TouchableOpacity
              style={[styles.endButton, { borderColor: theme.colors.danger }]}
              onPress={endWorkout}
            >
              <Text style={[styles.endButtonText, { color: theme.colors.danger }]}>
                End
              </Text>
            </TouchableOpacity>
          </View>
          
          {/* Progress Bar */}
          <View style={styles.progressContainer}>
            <View style={[styles.progressBg, { backgroundColor: theme.colors.metallic }]}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${progress}%`, backgroundColor: accentColor },
                ]}
              />
            </View>
            <Text style={[styles.progressText, { color: theme.colors.textSecondary }]}>
              {completedCount}/{workout.exercises.length} exercises
            </Text>
          </View>
          
          {/* Current Exercise Card */}
          <MetallicCard style={styles.currentExerciseCard} intensity="high">
            <Text style={[styles.exerciseNumber, { color: accentColor }]}>
              EXERCISE {activeWorkout.currentExerciseIndex + 1}
            </Text>
            <Text style={[styles.currentExerciseName, { color: theme.colors.textPrimary }]}>
              {currentExercise.name}
            </Text>
            <Text style={[styles.currentExerciseSets, { color: theme.colors.textSecondary }]}>
              {currentExercise.sets} sets × {currentExercise.reps} reps
              {currentExercise.weight && ` • ${currentExercise.weight}kg`}
            </Text>
            
            {/* Previous Performance */}
            {currentExercise.previousPerformance && (
              <View style={[styles.prevPerf, { backgroundColor: theme.colors.card }]}>
                <Ionicons name="time" size={14} color={theme.colors.textSecondary} />
                <Text style={[styles.prevPerfText, { color: theme.colors.textSecondary }]}>
                  Last: {currentExercise.previousPerformance.weight}kg ×{' '}
                  {currentExercise.previousPerformance.reps} reps
                </Text>
              </View>
            )}
            
            {/* Sets Progress */}
            <View style={styles.setsContainer}>
              {Array.from({ length: currentExercise.sets }).map((_, i) => (
                <View
                  key={i}
                  style={[
                    styles.setDot,
                    {
                      backgroundColor:
                        i < currentExercise.completedSets
                          ? accentColor
                          : theme.colors.metallic,
                    },
                  ]}
                />
              ))}
            </View>
            
            {/* Rest Timer or Complete Set Button */}
            {activeWorkout.isResting ? (
              <View style={styles.restTimerContainer}>
                <CircularProgress
                  value={(activeWorkout.restTimer / 90) * 100}
                  size={140}
                  strokeWidth={10}
                  label="REST"
                  sublabel={formatTime(activeWorkout.restTimer)}
                />
                <TouchableOpacity
                  style={[styles.skipRestButton, { borderColor: accentColor }]}
                  onPress={() => {
                    if (currentExercise.isCompleted) {
                      nextExercise();
                    } else {
                      useWorkoutStore.getState().setRestTimer(0);
                    }
                  }}
                >
                  <Text style={[styles.skipRestText, { color: accentColor }]}>
                    {currentExercise.isCompleted ? 'Next Exercise' : 'Skip Rest'}
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                style={[
                  styles.completeSetButton,
                  { backgroundColor: accentColor },
                  currentExercise.isCompleted && { opacity: 0.5 },
                ]}
                onPress={() => !currentExercise.isCompleted && completeSet(currentExercise.id)}
                disabled={currentExercise.isCompleted}
              >
                <Text style={styles.completeSetText}>
                  {currentExercise.isCompleted
                    ? 'Exercise Complete'
                    : `Complete Set ${currentExercise.completedSets + 1}`}
                </Text>
              </TouchableOpacity>
            )}
            
            {/* Navigation */}
            {!activeWorkout.isResting && currentExercise.isCompleted && (
              <TouchableOpacity
                style={[styles.nextExButton, { backgroundColor: accentColor + '20' }]}
                onPress={nextExercise}
              >
                <Text style={[styles.nextExText, { color: accentColor }]}>
                  Next Exercise
                </Text>
                <Ionicons name="arrow-forward" size={20} color={accentColor} />
              </TouchableOpacity>
            )}
          </MetallicCard>
          
          {/* Quick Coach Assist */}
          <TouchableOpacity
            style={[styles.coachAssist, { borderColor: accentColor }]}
            onPress={() => setShowCoachAssist(true)}
          >
            <Ionicons name="sparkles" size={20} color={accentColor} />
            <Text style={[styles.coachAssistText, { color: accentColor }]}>
              Quick Coach Assist
            </Text>
          </TouchableOpacity>
          
          {/* Body Map Preview */}
          <MetallicCard style={styles.miniBodyMap}>
            <Text style={[styles.miniBodyMapTitle, { color: theme.colors.textSecondary }]}>
              Training: {workout.targetMuscles.join(', ')}
            </Text>
            <ApexBodyMap
              highlightMuscles={currentExercise.targetMuscles}
              mode="workout"
            />
          </MetallicCard>
        </ScrollView>
        
        {/* Coach Assist Modal */}
        <Modal
          visible={showCoachAssist}
          transparent
          animationType="slide"
          onRequestClose={() => setShowCoachAssist(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.assistModal, { backgroundColor: theme.colors.card }]}>
              <View style={styles.assistHeader}>
                <Text style={[styles.assistTitle, { color: theme.colors.textPrimary }]}>
                  Quick Assist
                </Text>
                <TouchableOpacity onPress={() => setShowCoachAssist(false)}>
                  <Ionicons name="close" size={24} color={theme.colors.textSecondary} />
                </TouchableOpacity>
              </View>
              {[
                { icon: 'arrow-down', text: 'Reduce intensity' },
                { icon: 'swap-horizontal', text: 'Swap exercise' },
                { icon: 'people', text: 'Gym is crowded' },
                { icon: 'time', text: 'Short on time' },
                { icon: 'bandage', text: 'Something hurts' },
              ].map((item, i) => (
                <TouchableOpacity
                  key={i}
                  style={[styles.assistOption, { borderColor: theme.colors.cardBorder }]}
                  onPress={() => setShowCoachAssist(false)}
                >
                  <Ionicons name={item.icon as any} size={20} color={accentColor} />
                  <Text style={[styles.assistOptionText, { color: theme.colors.textPrimary }]}>
                    {item.text}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    );
  }
  
  // Pre-workout View (also shows when active workout is minimized)
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Active Workout Banner (when minimized) */}
        {isWorkoutActive && isMinimized && currentExercise && (
          <TouchableOpacity
            style={[styles.activeBanner, { backgroundColor: accentColor + '15', borderColor: accentColor }]}
            onPress={() => setIsMinimized(false)}
          >
            <View style={styles.bannerLeft}>
              <View style={[styles.bannerPulse, { backgroundColor: accentColor }]} />
              <View>
                <Text style={[styles.bannerTitle, { color: accentColor }]}>
                  WORKOUT IN PROGRESS
                </Text>
                <Text style={[styles.bannerSubtitle, { color: theme.colors.textSecondary }]}>
                  {activeWorkout.workout?.title} — {currentExercise.name}
                  {activeWorkout.isResting ? ` • Rest ${formatTime(activeWorkout.restTimer)}` : ''}
                </Text>
              </View>
            </View>
            <View style={styles.bannerRight}>
              <Ionicons name="chevron-up" size={20} color={accentColor} />
            </View>
          </TouchableOpacity>
        )}

        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: theme.colors.textPrimary }]}>
            Today's Workout
          </Text>
        </View>
        
        {/* Workout Overview */}
        <MetallicCard style={styles.overviewCard} intensity="medium">
          <View style={styles.overviewTop}>
            <View>
              <Text style={[styles.workoutType, { color: accentColor }]}>
                {todayWorkout.type.toUpperCase()}
              </Text>
              <Text style={[styles.overviewTitle, { color: theme.colors.textPrimary }]}>
                {todayWorkout.title}
              </Text>
            </View>
            <View style={styles.overviewMeta}>
              <View style={styles.metaItem}>
                <Ionicons name="time" size={16} color={theme.colors.textSecondary} />
                <Text style={[styles.metaText, { color: theme.colors.textSecondary }]}>
                  {todayWorkout.duration} min
                </Text>
              </View>
              <View style={styles.metaItem}>
                <Ionicons name="flash" size={16} color={theme.colors.textSecondary} />
                <Text style={[styles.metaText, { color: theme.colors.textSecondary }]}>
                  {todayWorkout.intensity}
                </Text>
              </View>
            </View>
          </View>
          
          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[styles.startButton, { backgroundColor: accentColor }]}
              onPress={startWorkout}
            >
              <Ionicons name="play" size={20} color="#FFFFFF" />
              <Text style={styles.startButtonText}>Start Workout</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modifyButton, { borderColor: accentColor }]}
            >
              <Ionicons name="sparkles" size={18} color={accentColor} />
              <Text style={[styles.modifyButtonText, { color: accentColor }]}>
                Modify with Coach
              </Text>
            </TouchableOpacity>
          </View>
        </MetallicCard>
        
        {/* Target Muscles */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>
            Target Muscles
          </Text>
          <MetallicCard style={styles.bodyMapCard}>
            <ApexBodyMap
              highlightMuscles={todayWorkout.targetMuscles}
              mode="workout"
            />
          </MetallicCard>
        </View>
        
        {/* Exercise List */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>
            Exercises ({todayWorkout.exercises.length})
          </Text>
          {todayWorkout.exercises.map((exercise, index) => (
            <MetallicCard key={exercise.id} style={styles.exerciseCard}>
              <View style={styles.exerciseRow}>
                <View style={[styles.exerciseIndex, { backgroundColor: accentColor + '20' }]}>
                  <Text style={[styles.exerciseIndexText, { color: accentColor }]}>
                    {index + 1}
                  </Text>
                </View>
                <View style={styles.exerciseInfo}>
                  <Text style={[styles.exerciseName, { color: theme.colors.textPrimary }]}>
                    {exercise.name}
                  </Text>
                  <Text style={[styles.exerciseMeta, { color: theme.colors.textSecondary }]}>
                    {exercise.sets} sets × {exercise.reps}
                    {exercise.weight && ` • ${exercise.weight}kg`}
                  </Text>
                  <Text style={[styles.exerciseTarget, { color: theme.colors.textMuted }]}>
                    {exercise.targetMuscles.join(', ')}
                  </Text>
                </View>
                <View style={styles.exerciseActions}>
                  <TouchableOpacity style={styles.exerciseAction}>
                    <Ionicons name="swap-horizontal" size={18} color={theme.colors.textSecondary} />
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.exerciseAction}>
                    <Ionicons name="information-circle" size={18} color={theme.colors.textSecondary} />
                  </TouchableOpacity>
                </View>
              </View>
              {exercise.previousPerformance && (
                <View style={[styles.prevPerformance, { backgroundColor: theme.colors.backgroundSecondary }]}>
                  <Ionicons name="time" size={12} color={theme.colors.textMuted} />
                  <Text style={[styles.prevPerformanceText, { color: theme.colors.textMuted }]}>
                    Previous: {exercise.previousPerformance.weight}kg × {exercise.previousPerformance.reps} reps
                  </Text>
                </View>
              )}
            </MetallicCard>
          ))}
        </View>
        
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
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  overviewCard: {
    marginBottom: 24,
  },
  overviewTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  workoutType: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1,
    marginBottom: 4,
  },
  overviewTitle: {
    fontSize: 28,
    fontWeight: '700',
  },
  overviewMeta: {
    alignItems: 'flex-end',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  metaText: {
    marginLeft: 6,
    fontSize: 13,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  startButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  startButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  modifyButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    gap: 6,
  },
  modifyButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 16,
  },
  bodyMapCard: {
    paddingVertical: 20,
  },
  exerciseCard: {
    marginBottom: 12,
  },
  exerciseRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  exerciseIndex: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  exerciseIndexText: {
    fontSize: 14,
    fontWeight: '700',
  },
  exerciseInfo: {
    flex: 1,
  },
  exerciseName: {
    fontSize: 16,
    fontWeight: '600',
  },
  exerciseMeta: {
    fontSize: 13,
    marginTop: 2,
  },
  exerciseTarget: {
    fontSize: 11,
    marginTop: 2,
  },
  exerciseActions: {
    flexDirection: 'row',
    gap: 12,
  },
  exerciseAction: {
    padding: 4,
  },
  prevPerformance: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    gap: 6,
  },
  prevPerformanceText: {
    fontSize: 11,
  },
  bottomSpacer: {
    height: 20,
  },
  // Active Workout Styles
  activeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  activeHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  minimizeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeTitle: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
  },
  workoutName: {
    fontSize: 24,
    fontWeight: '700',
  },
  endButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  endButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  progressContainer: {
    marginBottom: 20,
  },
  progressBg: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 12,
    marginTop: 8,
    textAlign: 'center',
  },
  currentExerciseCard: {
    alignItems: 'center',
    paddingVertical: 24,
    marginBottom: 16,
  },
  exerciseNumber: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1,
    marginBottom: 8,
  },
  currentExerciseName: {
    fontSize: 28,
    fontWeight: '700',
    textAlign: 'center',
  },
  currentExerciseSets: {
    fontSize: 16,
    marginTop: 8,
  },
  prevPerf: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginTop: 12,
    gap: 6,
  },
  prevPerfText: {
    fontSize: 12,
  },
  setsContainer: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 20,
  },
  setDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  completeSetButton: {
    marginTop: 24,
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
  },
  completeSetText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  restTimerContainer: {
    alignItems: 'center',
    marginTop: 20,
  },
  skipRestButton: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  skipRestText: {
    fontSize: 14,
    fontWeight: '600',
  },
  nextExButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  nextExText: {
    fontSize: 14,
    fontWeight: '600',
  },
  coachAssist: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 16,
    gap: 8,
  },
  coachAssistText: {
    fontSize: 14,
    fontWeight: '600',
  },
  miniBodyMap: {
    paddingVertical: 16,
  },
  miniBodyMapTitle: {
    textAlign: 'center',
    fontSize: 12,
    marginBottom: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  assistModal: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
  },
  assistHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  assistTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  assistOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    gap: 12,
  },
  assistOptionText: {
    fontSize: 16,
  },
  // Active workout minimized banner
  activeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderRadius: 12,
    marginBottom: 16,
  },
  bannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  bannerPulse: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  bannerTitle: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
  },
  bannerSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  bannerRight: {
    paddingLeft: 12,
  },
});
