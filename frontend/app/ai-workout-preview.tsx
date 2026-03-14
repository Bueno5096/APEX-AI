import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import Constants from 'expo-constants';
import { useThemeStore } from '../src/store/themeStore';
import { useUserStore } from '../src/store/userStore';
import { useExerciseStore } from '../src/store/exerciseStore';
import { useWorkoutStore } from '../src/store/workoutStore';

interface RefineChatMessage {
  id: string;
  role: 'user' | 'coach';
  content: string;
}

export default function AIWorkoutPreviewScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const theme = useThemeStore((s) => s.theme);
  const accentColor = useThemeStore((s) => s.accentColor);
  const { profile } = useUserStore();
  const { saveWorkout } = useExerciseStore();
  const { setTodayWorkoutByType } = useWorkoutStore();

  const initialWorkout = params.workoutData ? JSON.parse(params.workoutData as string) : null;
  const genParams = params.genParams ? JSON.parse(params.genParams as string) : null;

  // Mutable workout state so coach can update it
  const [workout, setWorkout] = useState(initialWorkout);

  // Refine with Coach state
  const [showRefineChat, setShowRefineChat] = useState(false);
  const [refineMessages, setRefineMessages] = useState<RefineChatMessage[]>([]);
  const [refineInput, setRefineInput] = useState('');
  const [refineLoading, setRefineLoading] = useState(false);
  const [refineSessionId, setRefineSessionId] = useState<string | null>(null);
  const refineChatRef = useRef<ScrollView>(null);

  const REFINE_SUGGESTIONS = [
    'Make it harder',
    'Swap one exercise for a different one',
    'Add a warm-up',
    'Make it shorter',
    'More isolation work',
  ];

  if (!workout) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <Text style={[styles.errorText, { color: theme.colors.textMuted }]}>No workout data</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={[styles.backLink, { color: accentColor }]}>Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const getBackendUrl = () => {
    return Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL
      || process.env.EXPO_PUBLIC_BACKEND_URL
      || '';
  };

  // Apply actions from coach to the workout
  const applyActionsToWorkout = (actions: any[]) => {
    if (!actions || actions.length === 0) return;
    let updated = { ...workout, exercises: [...(workout.exercises || [])] };

    for (const action of actions) {
      if (action.type === 'swap_exercise') {
        updated.exercises = updated.exercises.map((ex: any) => {
          if (ex.name?.toLowerCase() === action.exercise_name?.toLowerCase()) {
            return {
              ...ex,
              name: action.new_exercise_name || ex.name,
              sets: action.new_sets || ex.sets,
              reps: action.new_reps || ex.reps,
              weight: action.new_weight || ex.weight,
              targetMuscles: action.target_muscles || ex.targetMuscles,
            };
          }
          return ex;
        });
      } else if (action.type === 'modify_exercise') {
        updated.exercises = updated.exercises.map((ex: any) => {
          if (ex.name?.toLowerCase() === action.exercise_name?.toLowerCase()) {
            return {
              ...ex,
              sets: action.new_sets || ex.sets,
              reps: action.new_reps || ex.reps,
              weight: action.new_weight !== undefined ? action.new_weight : ex.weight,
              restSeconds: action.new_rest_seconds || ex.restSeconds,
            };
          }
          return ex;
        });
      } else if (action.type === 'skip_exercise') {
        updated.exercises = updated.exercises.filter(
          (ex: any) => ex.name?.toLowerCase() !== action.exercise_name?.toLowerCase()
        );
      } else if (action.type === 'adjust_rest') {
        updated.exercises = updated.exercises.map((ex: any) => ({
          ...ex,
          restSeconds: action.new_rest_seconds || ex.restSeconds,
        }));
      }
    }
    setWorkout(updated);
  };

  const sendRefineMessage = async (text: string) => {
    if (!text.trim() || refineLoading) return;

    const userMsg: RefineChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: text.trim(),
    };

    const updatedMessages = [...refineMessages, userMsg];
    setRefineMessages(updatedMessages);
    setRefineInput('');
    setRefineLoading(true);

    try {
      // Build workout context for the AI
      const exerciseContext = (workout.exercises || []).map((ex: any) => ({
        name: ex.name,
        sets: ex.sets,
        reps: ex.reps,
        weight: ex.weight || null,
        targetMuscles: ex.targetMuscles || [],
        restSeconds: ex.restSeconds || 90,
      }));

      // Build conversation history
      const conversationHistory = refineMessages.map((msg) => ({
        role: msg.role === 'user' ? 'user' : 'coach',
        content: msg.content,
      }));

      const res = await fetch(`${getBackendUrl()}/api/coach/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text.trim(),
          session_id: refineSessionId,
          conversation_history: conversationHistory,
          context: {
            coachStyle: 'direct',
            userProfile: profile,
            activeWorkout: workout.title || 'AI Generated Workout',
            fullWorkoutPlan: exerciseContext,
            workoutExercises: exerciseContext,
            trainingStyle: profile?.trainingStyle || genParams?.trainingStyle,
            trainingSplit: profile?.trainingSplit || genParams?.trainingSplit,
          },
        }),
      });

      const data = await res.json();

      if (data.session_id && !refineSessionId) {
        setRefineSessionId(data.session_id);
      }

      const coachMsg: RefineChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'coach',
        content: data.response || 'Could not process that request.',
      };

      setRefineMessages((prev) => [...prev, coachMsg]);

      // Apply actions if any
      if (data.actions && data.actions.length > 0) {
        applyActionsToWorkout(data.actions);
      }
    } catch (err) {
      setRefineMessages((prev) => [
        ...prev,
        { id: (Date.now() + 1).toString(), role: 'coach', content: 'Connection error. Please try again.' },
      ]);
    } finally {
      setRefineLoading(false);
      setTimeout(() => refineChatRef.current?.scrollToEnd({ animated: true }), 100);
    }
  };

  const handleStartNow = () => {
    const exercises = (workout.exercises || []).map((ex: any, i: number) => ({
      id: ex.id || `ai_live_${i}`,
      name: ex.name,
      sets: Array.from({ length: ex.sets || 3 }, (_, si) => ({
        id: `s${si}`,
        weight: ex.weight || 0,
        reps: parseInt(ex.reps) || 10,
        completed: false,
      })),
      restSeconds: ex.restSeconds || 90,
    }));
    setTodayWorkoutByType('custom', {
      title: workout.title || 'AI Workout',
      exercises,
    });
    router.replace('/(tabs)/workout');
  };

  const handleSave = () => {
    try {
      saveWorkout({
        id: `wk_ai_${Date.now()}`,
        name: workout.title || 'AI Workout',
        targetMuscles: workout.targetMuscles || [],
        exercises: (workout.exercises || []).map((ex: any, i: number) => ({
          exerciseId: ex.id || `ai_${i}`,
          name: ex.name,
          primaryMuscle: (ex.targetMuscles || [])[0] || 'General',
          equipment: 'Various',
          sets: ex.sets || 3,
          reps: String(ex.reps || '10'),
          restSeconds: ex.restSeconds || 90,
          notes: ex.notes || undefined,
        })),
        estimatedDuration: workout.duration || 45,
        difficulty: workout.intensity || 'intermediate',
        trainingStyle: profile?.trainingStyle,
        scheduledDays: [],
        repeatWeekly: false,
        createdAt: new Date(),
      });
      Alert.alert('Saved!', `"${workout.title}" added to My Workouts`);
    } catch (e) {
      Alert.alert('Save Failed', 'Could not save workout. Please try again.');
    }
  };

  const handleRegenerate = () => {
    router.back();
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={theme.colors.textPrimary} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={[styles.headerTitle, { color: theme.colors.textPrimary }]}>AI WORKOUT</Text>
          <Text style={[styles.headerSub, { color: theme.colors.textMuted }]}>Generated for you</Text>
        </View>
        <Ionicons name="sparkles" size={22} color="#7C3AED" />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Workout Title & Meta */}
        <View style={[styles.titleCard, { backgroundColor: theme.colors.card, borderColor: '#7C3AED40' }]}>
          <Text style={[styles.workoutTitle, { color: theme.colors.textPrimary }]}>{workout.title}</Text>
          <View style={styles.metaRow}>
            <View style={[styles.metaTag, { backgroundColor: theme.colors.backgroundSecondary }]}>
              <Ionicons name="time-outline" size={13} color={theme.colors.textSecondary} />
              <Text style={[styles.metaText, { color: theme.colors.textSecondary }]}>{workout.duration || '~45'} min</Text>
            </View>
            <View style={[styles.metaTag, { backgroundColor: theme.colors.backgroundSecondary }]}>
              <Ionicons name="barbell-outline" size={13} color={theme.colors.textSecondary} />
              <Text style={[styles.metaText, { color: theme.colors.textSecondary }]}>{(workout.exercises || []).length} exercises</Text>
            </View>
            {workout.intensity && (
              <View style={[styles.metaTag, { backgroundColor: theme.colors.backgroundSecondary }]}>
                <Ionicons name="flame-outline" size={13} color={theme.colors.textSecondary} />
                <Text style={[styles.metaText, { color: theme.colors.textSecondary }]}>{workout.intensity}</Text>
              </View>
            )}
          </View>
          {(workout.targetMuscles || []).length > 0 && (
            <View style={styles.muscleChips}>
              {workout.targetMuscles.map((m: string) => (
                <View key={m} style={[styles.muscleChip, { backgroundColor: '#7C3AED15' }]}>
                  <Text style={[styles.muscleChipText, { color: '#7C3AED' }]}>{m}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Exercise List */}
        <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>Exercises</Text>
        {(workout.exercises || []).map((ex: any, i: number) => (
          <View key={i} style={[styles.exCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder }]}>
            <View style={styles.exHeader}>
              <View style={[styles.exNum, { backgroundColor: '#7C3AED20' }]}>
                <Text style={[styles.exNumText, { color: '#7C3AED' }]}>{i + 1}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.exName, { color: theme.colors.textPrimary }]}>{ex.name}</Text>
                <Text style={[styles.exMeta, { color: theme.colors.textMuted }]}>
                  {ex.sets} x {ex.reps} · {ex.restSeconds || 90}s rest
                </Text>
              </View>
            </View>
            {ex.notes && (
              <Text style={[styles.exNotes, { color: theme.colors.textSecondary }]}>{ex.notes}</Text>
            )}
          </View>
        ))}

        {/* Action Buttons */}
        <View style={styles.buttonSection}>
          {/* Refine with Coach Button */}
          <TouchableOpacity
            style={[styles.refineBtn, { borderColor: '#7C3AED', backgroundColor: '#7C3AED10' }]}
            onPress={() => {
              if (refineMessages.length === 0) {
                setRefineMessages([{
                  id: '0',
                  role: 'coach',
                  content: `I see your "${workout.title}" workout. What would you like me to change? I can swap exercises, adjust intensity, modify sets/reps, or anything else.`,
                }]);
              }
              setShowRefineChat(true);
            }}
          >
            <Ionicons name="chatbubbles" size={18} color="#7C3AED" />
            <Text style={[styles.refineBtnText, { color: '#7C3AED' }]}>Refine with Coach</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: accentColor }]} onPress={handleStartNow}>
            <Ionicons name="play-circle" size={20} color="#fff" />
            <Text style={styles.primaryBtnText}>Start Workout Now</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.secondaryBtn, { borderColor: accentColor }]} onPress={handleSave}>
            <Ionicons name="bookmark-outline" size={18} color={accentColor} />
            <Text style={[styles.secondaryBtnText, { color: accentColor }]}>Save to My Workouts</Text>
          </TouchableOpacity>

          <View style={styles.btnRow}>
            <TouchableOpacity style={[styles.halfBtn, { borderColor: '#7C3AED' }]} onPress={handleRegenerate}>
              <Ionicons name="refresh" size={16} color="#7C3AED" />
              <Text style={[styles.halfBtnText, { color: '#7C3AED' }]}>Regenerate</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Refine with Coach Modal */}
      <Modal
        visible={showRefineChat}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowRefineChat(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={[styles.modalContainer, { backgroundColor: theme.colors.background }]}>
            {/* Modal Header */}
            <View style={[styles.modalHeader, { borderBottomColor: theme.colors.cardBorder }]}>
              <View style={styles.modalHeaderLeft}>
                <Ionicons name="sparkles" size={18} color="#7C3AED" />
                <Text style={[styles.modalHeaderTitle, { color: theme.colors.textPrimary }]}>Refine Workout</Text>
              </View>
              <TouchableOpacity onPress={() => setShowRefineChat(false)} style={styles.modalCloseBtn}>
                <Ionicons name="close" size={22} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Chat Messages */}
            <ScrollView
              ref={refineChatRef}
              style={styles.chatMessages}
              contentContainerStyle={styles.chatMessagesContent}
              showsVerticalScrollIndicator={false}
              onContentSizeChange={() => refineChatRef.current?.scrollToEnd({ animated: true })}
            >
              {refineMessages.map((msg) => (
                <View
                  key={msg.id}
                  style={[
                    styles.chatBubble,
                    msg.role === 'user' ? styles.chatBubbleUser : styles.chatBubbleCoach,
                    msg.role === 'user'
                      ? { backgroundColor: accentColor + '15', borderColor: accentColor + '30' }
                      : { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder },
                  ]}
                >
                  {msg.role === 'coach' && (
                    <Ionicons name="sparkles" size={13} color="#7C3AED" style={{ marginBottom: 4 }} />
                  )}
                  <Text style={[styles.chatBubbleText, { color: theme.colors.textPrimary }]}>{msg.content}</Text>
                </View>
              ))}
              {refineLoading && (
                <View style={[styles.chatBubble, styles.chatBubbleCoach, { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder }]}>
                  <ActivityIndicator size="small" color="#7C3AED" />
                  <Text style={[styles.chatLoadingText, { color: theme.colors.textMuted }]}>Thinking...</Text>
                </View>
              )}
            </ScrollView>

            {/* Suggestion chips */}
            {refineMessages.length <= 2 && (
              <View style={styles.suggestionsWrap}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.suggestionsContent}>
                  {REFINE_SUGGESTIONS.map((s, i) => (
                    <TouchableOpacity
                      key={i}
                      style={[styles.suggestionChip, { borderColor: '#7C3AED30', backgroundColor: '#7C3AED08' }]}
                      onPress={() => sendRefineMessage(s)}
                      disabled={refineLoading}
                    >
                      <Text style={[styles.suggestionChipText, { color: '#7C3AED' }]}>{s}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            {/* Chat Input */}
            <View style={[styles.chatInputRow, { borderTopColor: theme.colors.cardBorder, backgroundColor: theme.colors.background }]}>
              <TextInput
                style={[styles.chatInput, { backgroundColor: theme.colors.card, color: theme.colors.textPrimary, borderColor: theme.colors.cardBorder }]}
                placeholder="Ask coach to modify..."
                placeholderTextColor={theme.colors.textMuted}
                value={refineInput}
                onChangeText={setRefineInput}
                multiline
                maxLength={300}
                onSubmitEditing={() => sendRefineMessage(refineInput)}
              />
              <TouchableOpacity
                style={[styles.chatSendBtn, { backgroundColor: refineInput.trim() ? '#7C3AED' : theme.colors.card }]}
                onPress={() => sendRefineMessage(refineInput)}
                disabled={!refineInput.trim() || refineLoading}
              >
                <Ionicons name="send" size={16} color={refineInput.trim() ? '#fff' : theme.colors.textMuted} />
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12, gap: 8 },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '800', letterSpacing: 1.5 },
  headerSub: { fontSize: 12, marginTop: 2 },
  errorText: { fontSize: 16, textAlign: 'center', marginTop: 60 },
  backLink: { fontSize: 16, textAlign: 'center', marginTop: 12, fontWeight: '600' },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 40 },
  titleCard: { padding: 18, borderRadius: 16, borderWidth: 1, marginBottom: 20 },
  workoutTitle: { fontSize: 22, fontWeight: '800', marginBottom: 10 },
  metaRow: { flexDirection: 'row', gap: 8, marginBottom: 10, flexWrap: 'wrap' },
  metaTag: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  metaText: { fontSize: 12 },
  muscleChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  muscleChip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  muscleChipText: { fontSize: 11, fontWeight: '600' },
  sectionTitle: { fontSize: 15, fontWeight: '700', marginBottom: 10 },
  exCard: { padding: 14, borderRadius: 12, borderWidth: 0.5, marginBottom: 8 },
  exHeader: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  exNum: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  exNumText: { fontSize: 14, fontWeight: '700' },
  exName: { fontSize: 15, fontWeight: '600' },
  exMeta: { fontSize: 12, marginTop: 2 },
  exNotes: { fontSize: 12, fontStyle: 'italic', marginTop: 8, marginLeft: 44, lineHeight: 17 },
  buttonSection: { marginTop: 20 },
  // Refine button
  refineBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 14, borderWidth: 1.5, marginBottom: 10 },
  refineBtnText: { fontSize: 15, fontWeight: '700' },
  primaryBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16, borderRadius: 14, marginBottom: 10 },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  secondaryBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 14, borderWidth: 1.5, marginBottom: 10 },
  secondaryBtnText: { fontSize: 15, fontWeight: '700' },
  btnRow: { flexDirection: 'row', gap: 10 },
  halfBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderRadius: 12, borderWidth: 1 },
  halfBtnText: { fontSize: 13, fontWeight: '600' },
  // Modal
  modalOverlay: { flex: 1, justifyContent: 'flex-end' },
  modalContainer: { height: '75%', borderTopLeftRadius: 24, borderTopRightRadius: 24, overflow: 'hidden' },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 0.5 },
  modalHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  modalHeaderTitle: { fontSize: 16, fontWeight: '700' },
  modalCloseBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  // Chat
  chatMessages: { flex: 1 },
  chatMessagesContent: { padding: 16 },
  chatBubble: { maxWidth: '85%', padding: 12, borderRadius: 16, borderWidth: 0.5, marginBottom: 10 },
  chatBubbleUser: { alignSelf: 'flex-end', borderBottomRightRadius: 4 },
  chatBubbleCoach: { alignSelf: 'flex-start', borderBottomLeftRadius: 4 },
  chatBubbleText: { fontSize: 14, lineHeight: 20 },
  chatLoadingText: { fontSize: 13, marginLeft: 8 },
  suggestionsWrap: { paddingVertical: 6 },
  suggestionsContent: { paddingHorizontal: 16, gap: 8 },
  suggestionChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 0.5 },
  suggestionChipText: { fontSize: 12, fontWeight: '600' },
  chatInputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, paddingHorizontal: 16, paddingVertical: 10, borderTopWidth: 0.5 },
  chatInput: { flex: 1, fontSize: 14, maxHeight: 80, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 20, borderWidth: 0.5 },
  chatSendBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
});
