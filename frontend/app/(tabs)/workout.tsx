import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useThemeStore } from '../../src/store/themeStore';
import { useWorkoutStore } from '../../src/store/workoutStore';
import { MetallicCard } from '../../src/components/MetallicCard';
import { ApexBodyMap } from '../../src/components/ApexBodyMap';
import { useHealthStore } from '../../src/store/healthStore';
import { CircularProgress } from '../../src/components/CircularProgress';
import Constants from 'expo-constants';

// Weight display helper
const displayWeight = (kg: number | undefined, isImperial: boolean): string => {
  if (!kg) return '';
  if (isImperial) {
    // Round to nearest 5 lbs to match US gym plate increments
    const lbs = Math.round(kg * 2.20462 / 5) * 5;
    return `${lbs} lbs`;
  }
  return `${kg}kg`;
};

interface ChatMessage {
  id: string;
  role: 'user' | 'coach';
  content: string;
}

const WORKOUT_SUGGESTIONS = [
  { icon: 'swap-horizontal', text: 'Swap this exercise' },
  { icon: 'bandage', text: 'Something hurts' },
  { icon: 'time', text: 'Short on time' },
  { icon: 'arrow-down', text: 'Lower intensity' },
  { icon: 'help-circle', text: 'Form check tips' },
];

export default function WorkoutScreen() {
  const { theme, accentColor, unitSystem } = useThemeStore();
  const { recoveryData } = useHealthStore();
  const {
    todayWorkout,
    activeWorkout,
    startWorkout,
    endWorkout,
    completeSet,
    nextExercise,
    decrementRestTimer,
    reorderExercise,
  } = useWorkoutStore();
  
  const [showCoachAssist, setShowCoachAssist] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  
  // Mini coach chat state
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [pendingActions, setPendingActions] = useState<any[]>([]);
  const chatScrollRef = useRef<ScrollView>(null);
  
  const getBackendUrl = () => {
    const backendUrl = Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL 
      || process.env.EXPO_PUBLIC_BACKEND_URL 
      || 'https://coach-ai-fitness.preview.emergentagent.com';
    return backendUrl;
  };
  
  const sendCoachMessage = async (text: string) => {
    if (!text.trim() || isChatLoading) return;
    
    const exerciseName = currentExercise?.name || 'not started yet';
    const workoutTitle = activeWorkout.workout?.title || todayWorkout?.title || 'workout';
    
    // Build full workout context for the AI
    const sourceExercises = activeWorkout.workout?.exercises || todayWorkout?.exercises || [];
    const workoutExercises = sourceExercises.map(ex => ({
      name: ex.name,
      sets: ex.sets,
      reps: ex.reps,
      weight: ex.weight,
      targetMuscles: ex.targetMuscles,
      completedSets: ex.completedSets,
      isCompleted: ex.isCompleted,
    }));
    
    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: text.trim(),
    };
    setChatMessages(prev => [...prev, userMsg]);
    setChatInput('');
    setIsChatLoading(true);
    
    try {
      const response = await fetch(`${getBackendUrl()}/api/coach/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text.trim(),
          context: {
            recoveryScore: recoveryData?.score,
            activeWorkout: workoutTitle,
            currentExercise: exerciseName,
            workoutExercises: workoutExercises,
          },
        }),
      });
      
      const data = await response.json();
      const coachMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'coach',
        content: data.response || "I couldn't process that. Try again.",
      };
      setChatMessages(prev => [...prev, coachMsg]);
      
      // If the AI returned workout modification actions, show apply button
      if (data.actions && data.actions.length > 0) {
        setPendingActions(data.actions);
        const actionMsg: ChatMessage = {
          id: (Date.now() + 2).toString(),
          role: 'coach',
          content: `__ACTIONS__`,
        };
        setChatMessages(prev => [...prev, actionMsg]);
      }
    } catch (error) {
      setChatMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'coach',
        content: "Connection issue. Check your network and try again.",
      }]);
    } finally {
      setIsChatLoading(false);
      setTimeout(() => chatScrollRef.current?.scrollToEnd({ animated: true }), 100);
    }
  };
  
  const openCoachAssist = () => {
    if (chatMessages.length === 0) {
      setChatMessages([{
        id: '0',
        role: 'coach',
        content: `I'm here to help during your workout. Ask me about form, alternatives, rest times, or anything else.`,
      }]);
    }
    setShowCoachAssist(true);
  };
  
  // Elapsed workout timer
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (activeWorkout.startTime) {
      // Calculate initial elapsed time (handles tab switching)
      const start = new Date(activeWorkout.startTime).getTime();
      setElapsedSeconds(Math.floor((Date.now() - start) / 1000));
      
      interval = setInterval(() => {
        setElapsedSeconds(Math.floor((Date.now() - start) / 1000));
      }, 1000);
    } else {
      setElapsedSeconds(0);
    }
    return () => clearInterval(interval);
  }, [activeWorkout.startTime]);
  
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
  
  const formatElapsed = (seconds: number): string => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
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
          
          {/* Elapsed Timer Bar */}
          <MetallicCard style={styles.timerBar}>
            <View style={styles.timerRow}>
              <View style={styles.timerItem}>
                <Ionicons name="time-outline" size={16} color={accentColor} />
                <Text style={[styles.timerLabel, { color: theme.colors.textSecondary }]}>ELAPSED</Text>
                <Text style={[styles.timerValue, { color: theme.colors.textPrimary }]}>
                  {formatElapsed(elapsedSeconds)}
                </Text>
              </View>
              <View style={[styles.timerDivider, { backgroundColor: theme.colors.cardBorder }]} />
              <View style={styles.timerItem}>
                <Ionicons name="fitness-outline" size={16} color={accentColor} />
                <Text style={[styles.timerLabel, { color: theme.colors.textSecondary }]}>EXERCISE</Text>
                <Text style={[styles.timerValue, { color: theme.colors.textPrimary }]}>
                  {activeWorkout.currentExerciseIndex + 1}/{workout.exercises.length}
                </Text>
              </View>
              <View style={[styles.timerDivider, { backgroundColor: theme.colors.cardBorder }]} />
              <View style={styles.timerItem}>
                <Ionicons name="checkmark-circle-outline" size={16} color={accentColor} />
                <Text style={[styles.timerLabel, { color: theme.colors.textSecondary }]}>SETS DONE</Text>
                <Text style={[styles.timerValue, { color: theme.colors.textPrimary }]}>
                  {workout.exercises.reduce((sum, e) => sum + e.completedSets, 0)}
                </Text>
              </View>
            </View>
          </MetallicCard>
          
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
              {currentExercise.weight && ` • ${displayWeight(currentExercise.weight, unitSystem === 'imperial')}`}
            </Text>
            
            {/* Previous Performance */}
            {currentExercise.previousPerformance && (
              <View style={[styles.prevPerf, { backgroundColor: theme.colors.card }]}>
                <Ionicons name="time" size={14} color={theme.colors.textSecondary} />
                <Text style={[styles.prevPerfText, { color: theme.colors.textSecondary }]}>
                  Last: {displayWeight(currentExercise.previousPerformance.weight, unitSystem === 'imperial')} ×{' '}
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
                  size={160}
                  strokeWidth={12}
                  label="REST"
                  sublabel={formatTime(activeWorkout.restTimer)}
                />
                
                {/* Rest duration quick-adjust buttons */}
                <View style={styles.restPresetsRow}>
                  {[30, 60, 90, 120].map((sec) => (
                    <TouchableOpacity
                      key={sec}
                      style={[
                        styles.restPresetButton,
                        { borderColor: theme.colors.cardBorder },
                        activeWorkout.restTimer === sec && { borderColor: accentColor, backgroundColor: accentColor + '15' },
                      ]}
                      onPress={() => useWorkoutStore.getState().setRestTimer(sec)}
                    >
                      <Text style={[
                        styles.restPresetText,
                        { color: activeWorkout.restTimer === sec ? accentColor : theme.colors.textSecondary },
                      ]}>
                        {sec}s
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                
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
                    {currentExercise.isCompleted ? 'Next Exercise →' : 'Skip Rest →'}
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
            onPress={openCoachAssist}
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
        
        {/* Coach Mini-Chat Modal */}
        <Modal
          visible={showCoachAssist}
          transparent
          animationType="slide"
          onRequestClose={() => setShowCoachAssist(false)}
        >
          <KeyboardAvoidingView 
            style={styles.chatModalWrapper}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          >
            <TouchableOpacity 
              style={styles.chatModalDismiss} 
              activeOpacity={1} 
              onPress={() => setShowCoachAssist(false)} 
            />
            <View style={[styles.chatModal, { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder }]}>
              {/* Chat Header */}
              <View style={[styles.chatHeader, { borderBottomColor: theme.colors.cardBorder }]}>
                <View style={styles.chatHeaderLeft}>
                  <Ionicons name="sparkles" size={18} color={accentColor} />
                  <Text style={[styles.chatHeaderTitle, { color: theme.colors.textPrimary }]}>
                    Coach Assist
                  </Text>
                </View>
                <TouchableOpacity onPress={() => setShowCoachAssist(false)}>
                  <Ionicons name="close" size={22} color={theme.colors.textSecondary} />
                </TouchableOpacity>
              </View>
              
              {/* Quick Suggestions */}
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false} 
                style={styles.suggestionsScroll}
                contentContainerStyle={styles.suggestionsContent}
              >
                {WORKOUT_SUGGESTIONS.map((item, i) => (
                  <TouchableOpacity
                    key={i}
                    style={[styles.suggestionPill, { borderColor: theme.colors.cardBorder }]}
                    onPress={() => sendCoachMessage(item.text)}
                  >
                    <Ionicons name={item.icon as any} size={14} color={accentColor} />
                    <Text style={[styles.suggestionText, { color: theme.colors.textSecondary }]}>
                      {item.text}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              
              {/* Chat Messages */}
              <ScrollView 
                ref={chatScrollRef}
                style={styles.chatMessages}
                contentContainerStyle={styles.chatMessagesContent}
              >
                {chatMessages.map((msg) => (
                  <View key={msg.id}>
                    {msg.content === '__ACTIONS__' ? (
                      /* Apply Changes Button */
                      <TouchableOpacity
                        style={[styles.applyChangesBtn, { backgroundColor: accentColor }]}
                        onPress={() => {
                          useWorkoutStore.getState().applyCoachActions(pendingActions);
                          setPendingActions([]);
                          // Replace the action marker with a confirmation
                          setChatMessages(prev => prev.map(m => 
                            m.id === msg.id 
                              ? { ...m, content: '✅ Changes applied to your workout!' }
                              : m
                          ));
                        }}
                      >
                        <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" />
                        <Text style={styles.applyChangesText}>
                          Apply Changes ({pendingActions.length})
                        </Text>
                      </TouchableOpacity>
                    ) : (
                      <View
                        style={[
                          styles.chatBubble,
                          msg.role === 'user'
                            ? [styles.chatBubbleUser, { backgroundColor: accentColor + '20' }]
                            : [styles.chatBubbleCoach, { backgroundColor: theme.colors.backgroundSecondary }],
                        ]}
                      >
                        {msg.role === 'coach' && (
                          <View style={styles.chatBubbleIcon}>
                            <Ionicons name="sparkles" size={12} color={accentColor} />
                          </View>
                        )}
                        <Text style={[
                          styles.chatBubbleText,
                          { color: theme.colors.textPrimary },
                        ]}>
                          {msg.content}
                        </Text>
                      </View>
                    )}
                  </View>
                ))}
                {isChatLoading && (
                  <View style={[styles.chatBubble, styles.chatBubbleCoach, { backgroundColor: theme.colors.backgroundSecondary }]}>
                    <ActivityIndicator size="small" color={accentColor} />
                    <Text style={[styles.chatBubbleText, { color: theme.colors.textSecondary, marginLeft: 8 }]}>
                      Thinking...
                    </Text>
                  </View>
                )}
              </ScrollView>
              
              {/* Chat Input */}
              <View style={[styles.chatInputRow, { borderTopColor: theme.colors.cardBorder }]}>
                <TextInput
                  style={[styles.chatInput, { 
                    color: theme.colors.textPrimary, 
                    backgroundColor: theme.colors.backgroundSecondary,
                    borderColor: theme.colors.cardBorder,
                  }]}
                  placeholder="Ask your coach..."
                  placeholderTextColor={theme.colors.textMuted}
                  value={chatInput}
                  onChangeText={setChatInput}
                  onSubmitEditing={() => sendCoachMessage(chatInput)}
                  returnKeyType="send"
                  multiline={false}
                />
                <TouchableOpacity
                  style={[styles.chatSendBtn, { backgroundColor: accentColor }]}
                  onPress={() => sendCoachMessage(chatInput)}
                  disabled={!chatInput.trim() || isChatLoading}
                >
                  <Ionicons name="send" size={18} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
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
                  WORKOUT IN PROGRESS • {formatElapsed(elapsedSeconds)}
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
              onPress={openCoachAssist}
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
                    {exercise.weight && ` • ${displayWeight(exercise.weight, unitSystem === 'imperial')}`}
                  </Text>
                  <Text style={[styles.exerciseTarget, { color: theme.colors.textMuted }]}>
                    {exercise.targetMuscles.join(', ')}
                  </Text>
                </View>
                <View style={styles.exerciseActions}>
                  <TouchableOpacity
                    style={[styles.exerciseAction, index === 0 && { opacity: 0.3 }]}
                    onPress={() => index > 0 && reorderExercise(index, index - 1)}
                    disabled={index === 0}
                  >
                    <Ionicons name="chevron-up" size={20} color={theme.colors.textSecondary} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.exerciseAction, index === (todayWorkout?.exercises?.length || 0) - 1 && { opacity: 0.3 }]}
                    onPress={() => index < (todayWorkout?.exercises?.length || 0) - 1 && reorderExercise(index, index + 1)}
                    disabled={index === (todayWorkout?.exercises?.length || 0) - 1}
                  >
                    <Ionicons name="chevron-down" size={20} color={theme.colors.textSecondary} />
                  </TouchableOpacity>
                </View>
              </View>
              {exercise.previousPerformance && (
                <View style={[styles.prevPerformance, { backgroundColor: theme.colors.backgroundSecondary }]}>
                  <Ionicons name="time" size={12} color={theme.colors.textMuted} />
                  <Text style={[styles.prevPerformanceText, { color: theme.colors.textMuted }]}>
                    Previous: {displayWeight(exercise.previousPerformance.weight, unitSystem === 'imperial')} × {exercise.previousPerformance.reps} reps
                  </Text>
                </View>
              )}
            </MetallicCard>
          ))}
        </View>
        
        <View style={styles.bottomSpacer} />
      </ScrollView>
      
      {/* Coach Mini-Chat Modal (pre-workout) */}
      <Modal
        visible={showCoachAssist}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCoachAssist(false)}
      >
        <KeyboardAvoidingView 
          style={styles.chatModalWrapper}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <TouchableOpacity 
            style={styles.chatModalDismiss} 
            activeOpacity={1} 
            onPress={() => setShowCoachAssist(false)} 
          />
          <View style={[styles.chatModal, { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder }]}>
            <View style={[styles.chatHeader, { borderBottomColor: theme.colors.cardBorder }]}>
              <View style={styles.chatHeaderLeft}>
                <Ionicons name="sparkles" size={18} color={accentColor} />
                <Text style={[styles.chatHeaderTitle, { color: theme.colors.textPrimary }]}>
                  Modify with Coach
                </Text>
              </View>
              <TouchableOpacity onPress={() => setShowCoachAssist(false)}>
                <Ionicons name="close" size={22} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            </View>
            
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false} 
              style={styles.suggestionsScroll}
              contentContainerStyle={styles.suggestionsContent}
            >
              {WORKOUT_SUGGESTIONS.map((item, i) => (
                <TouchableOpacity
                  key={i}
                  style={[styles.suggestionPill, { borderColor: theme.colors.cardBorder }]}
                  onPress={() => sendCoachMessage(item.text)}
                >
                  <Ionicons name={item.icon as any} size={14} color={accentColor} />
                  <Text style={[styles.suggestionText, { color: theme.colors.textSecondary }]}>
                    {item.text}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            
            <ScrollView 
              ref={chatScrollRef}
              style={styles.chatMessages}
              contentContainerStyle={styles.chatMessagesContent}
            >
              {chatMessages.map((msg) => (
                <View key={msg.id}>
                  {msg.content === '__ACTIONS__' ? (
                    <TouchableOpacity
                      style={[styles.applyChangesBtn, { backgroundColor: accentColor }]}
                      onPress={() => {
                        useWorkoutStore.getState().applyCoachActions(pendingActions);
                        setPendingActions([]);
                        setChatMessages(prev => prev.map(m => 
                          m.id === msg.id 
                            ? { ...m, content: '✅ Changes applied to your workout!' }
                            : m
                        ));
                      }}
                    >
                      <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" />
                      <Text style={styles.applyChangesText}>
                        Apply Changes ({pendingActions.length})
                      </Text>
                    </TouchableOpacity>
                  ) : (
                    <View
                      style={[
                        styles.chatBubble,
                        msg.role === 'user'
                          ? [styles.chatBubbleUser, { backgroundColor: accentColor + '20' }]
                          : [styles.chatBubbleCoach, { backgroundColor: theme.colors.backgroundSecondary }],
                      ]}
                    >
                      {msg.role === 'coach' && (
                        <View style={styles.chatBubbleIcon}>
                          <Ionicons name="sparkles" size={12} color={accentColor} />
                        </View>
                      )}
                      <Text style={[styles.chatBubbleText, { color: theme.colors.textPrimary }]}>
                        {msg.content}
                      </Text>
                    </View>
                  )}
                </View>
              ))}
              {isChatLoading && (
                <View style={[styles.chatBubble, styles.chatBubbleCoach, { backgroundColor: theme.colors.backgroundSecondary }]}>
                  <ActivityIndicator size="small" color={accentColor} />
                  <Text style={[styles.chatBubbleText, { color: theme.colors.textSecondary, marginLeft: 8 }]}>
                    Thinking...
                  </Text>
                </View>
              )}
            </ScrollView>
            
            <View style={[styles.chatInputRow, { borderTopColor: theme.colors.cardBorder }]}>
              <TextInput
                style={[styles.chatInput, { 
                  color: theme.colors.textPrimary, 
                  backgroundColor: theme.colors.backgroundSecondary,
                  borderColor: theme.colors.cardBorder,
                }]}
                placeholder="Ask your coach to modify..."
                placeholderTextColor={theme.colors.textMuted}
                value={chatInput}
                onChangeText={setChatInput}
                onSubmitEditing={() => sendCoachMessage(chatInput)}
                returnKeyType="send"
                multiline={false}
              />
              <TouchableOpacity
                style={[styles.chatSendBtn, { backgroundColor: accentColor }]}
                onPress={() => sendCoachMessage(chatInput)}
                disabled={!chatInput.trim() || isChatLoading}
              >
                <Ionicons name="send" size={18} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
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
    fontSize: 28,
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
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 1.5,
    marginBottom: 16,
    textTransform: 'uppercase',
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
  // Elapsed timer bar
  timerBar: {
    marginBottom: 12,
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  timerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  timerItem: {
    alignItems: 'center',
    gap: 4,
    flex: 1,
  },
  timerLabel: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1,
  },
  timerValue: {
    fontSize: 18,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  timerDivider: {
    width: 1,
    height: 36,
  },
  // Rest timer preset buttons
  restPresetsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
    marginBottom: 12,
  },
  restPresetButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  restPresetText: {
    fontSize: 13,
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
  // Coach Mini Chat Modal
  chatModalWrapper: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  chatModalDismiss: {
    flex: 1,
  },
  chatModal: {
    maxHeight: '70%',
    borderTopWidth: 1,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
  },
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  chatHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  chatHeaderTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  suggestionsScroll: {
    maxHeight: 44,
    borderBottomWidth: 0,
  },
  suggestionsContent: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  suggestionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  suggestionText: {
    fontSize: 12,
    fontWeight: '500',
  },
  chatMessages: {
    flex: 1,
    minHeight: 180,
  },
  chatMessagesContent: {
    padding: 12,
    gap: 10,
  },
  chatBubble: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 12,
    borderRadius: 12,
    maxWidth: '88%',
  },
  chatBubbleUser: {
    alignSelf: 'flex-end',
    borderBottomRightRadius: 4,
  },
  chatBubbleCoach: {
    alignSelf: 'flex-start',
    borderBottomLeftRadius: 4,
  },
  chatBubbleIcon: {
    marginRight: 8,
    marginTop: 2,
  },
  chatBubbleText: {
    fontSize: 14,
    lineHeight: 20,
    flex: 1,
  },
  chatInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 8,
    borderTopWidth: 1,
  },
  chatInput: {
    flex: 1,
    height: 42,
    borderRadius: 21,
    paddingHorizontal: 16,
    fontSize: 14,
    borderWidth: 1,
  },
  chatSendBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  applyChangesBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignSelf: 'center',
  },
  applyChangesText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
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
