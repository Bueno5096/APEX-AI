import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Animated,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useUserStore } from '../src/store/userStore';
import { useThemeStore } from '../src/store/themeStore';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ── Types ──
type ResponseType = 'pills' | 'text' | 'height-weight' | 'none' | 'injury-detail';

interface ConversationStep {
  aiMessage: string | ((data: Record<string, any>) => string);
  responseType: ResponseType;
  options?: string[];
  placeholder?: string;
  keyboardType?: 'default' | 'numeric';
  field: string;
}

interface ChatMessage {
  id: string;
  text: string;
  sender: 'ai' | 'user';
  anim: Animated.Value;
}

// ── Conversation Flow ──
const STEPS: ConversationStep[] = [
  {
    aiMessage: "Hey! I'm APEX, your personal AI coach. I'm going to ask you a few quick questions so I can build your perfect training program. Ready to get started?",
    responseType: 'pills',
    options: ["Let's go 💪", "Sure"],
    field: 'ready',
  },
  {
    aiMessage: "First things first — what's your name?",
    responseType: 'text',
    placeholder: 'Enter your name',
    field: 'name',
  },
  {
    aiMessage: (d) => `Nice to meet you ${d.name}! How old are you?`,
    responseType: 'text',
    placeholder: 'Enter your age',
    keyboardType: 'numeric',
    field: 'age',
  },
  {
    aiMessage: "Got it. Are you male or female?",
    responseType: 'pills',
    options: ['Male', 'Female'],
    field: 'gender',
  },
  {
    aiMessage: "Perfect. What's your height and weight?",
    responseType: 'height-weight',
    field: 'measurements',
  },
  {
    aiMessage: "Awesome. What's your main fitness goal right now?",
    responseType: 'pills',
    options: ['Lose weight', 'Build muscle', 'Get stronger', 'Improve endurance', 'Stay active & healthy'],
    field: 'goal',
  },
  {
    aiMessage: "Love that goal. How would you describe your current fitness level?",
    responseType: 'pills',
    options: ['Complete beginner', 'Some experience', 'Intermediate', 'Advanced'],
    field: 'level',
  },
  {
    aiMessage: "How many days per week can you commit to training?",
    responseType: 'pills',
    options: ['2 days', '3 days', '4 days', '5+ days'],
    field: 'days',
  },
  {
    aiMessage: "Where do you usually work out?",
    responseType: 'pills',
    options: ['Gym', 'At home', 'Outdoors', 'Mix of everything'],
    field: 'location',
  },
  {
    aiMessage: "Almost done! Do you have any injuries or physical limitations I should know about?",
    responseType: 'pills',
    options: ['No injuries', 'Minor limitations', 'Yes, I have injuries'],
    field: 'injuries',
  },
];

// ── Typing Indicator ──
const TypingIndicator = () => {
  const dots = [useRef(new Animated.Value(0.3)).current, useRef(new Animated.Value(0.3)).current, useRef(new Animated.Value(0.3)).current];

  useEffect(() => {
    const anims = dots.map((dot, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 200),
          Animated.timing(dot, { toValue: 1, duration: 400, useNativeDriver: true }),
          Animated.timing(dot, { toValue: 0.3, duration: 400, useNativeDriver: true }),
        ])
      )
    );
    anims.forEach((a) => a.start());
    return () => anims.forEach((a) => a.stop());
  }, []);

  return (
    <View style={styles.typingContainer}>
      <View style={styles.aiBubble}>
        <View style={styles.typingDots}>
          {dots.map((dot, i) => (
            <Animated.View key={i} style={[styles.typingDot, { opacity: dot }]} />
          ))}
        </View>
      </View>
    </View>
  );
};

// ── Logo ──
const ApexLogo = () => {
  const pulseAnim = useRef(new Animated.Value(0.6)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1, duration: 2000, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 0.6, duration: 2000, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  return (
    <View style={styles.logoContainer}>
      <Animated.Text style={[styles.logoText, { opacity: pulseAnim }]}>
        APEX AI
      </Animated.Text>
      <Text style={styles.logoSubtext}>PERSONAL COACH</Text>
    </View>
  );
};

// ── Profile Summary ──
const ProfileSummary = ({ data, onComplete }: { data: Record<string, any>; onComplete: () => void }) => {
  const [visibleCards, setVisibleCards] = useState(0);
  const [showButton, setShowButton] = useState(false);
  const buttonPulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Stagger cards in one by one
    const timer = setInterval(() => {
      setVisibleCards((prev) => {
        if (prev >= 6) {
          clearInterval(timer);
          setShowButton(true);
          Animated.loop(
            Animated.sequence([
              Animated.timing(buttonPulse, { toValue: 1.02, duration: 1500, useNativeDriver: true }),
              Animated.timing(buttonPulse, { toValue: 1, duration: 1500, useNativeDriver: true }),
            ])
          ).start();
          return prev;
        }
        return prev + 1;
      });
    }, 150);
    return () => clearInterval(timer);
  }, []);

  const cards = [
    { label: 'NAME', value: data.name },
    { label: 'AGE & GENDER', value: `${data.age} • ${data.gender}` },
    { label: 'MEASUREMENTS', value: data.unitSystem === 'imperial'
        ? `${data.heightFt ?? 'N/A'}'${data.heightIn ?? '0'}" • ${data.weightLbs ?? 'N/A'} lbs`
        : `${data.heightCm ?? 'N/A'} cm • ${data.weightKg ?? 'N/A'} kg` },
    { label: 'GOAL', value: data.goal },
    { label: 'EXPERIENCE', value: `${data.level} • ${data.days}` },
    { label: 'WORKOUT STYLE', value: `${data.location}${data.injuryDetail ? ` • ${data.injuryDetail}` : ''}` },
  ];

  return (
    <ScrollView style={styles.summaryScroll} contentContainerStyle={styles.summaryContent}>
      <Text style={styles.summaryTitle}>
        Welcome to APEX, {data.name} 👋
      </Text>

      {cards.map((card, i) => (
        i < visibleCards ? (
          <View key={i} style={styles.summaryCard}>
            <Text style={styles.summaryCardLabel}>{card.label}</Text>
            <Text style={styles.summaryCardValue}>{card.value}</Text>
          </View>
        ) : null
      ))}

      {showButton && (
        <Animated.View style={{ transform: [{ scale: buttonPulse }] }}>
          <TouchableOpacity style={styles.startButton} onPress={onComplete} activeOpacity={0.8}>
            <View style={styles.startButtonGlow} />
            <Text style={styles.startButtonText}>Let's Start Training →</Text>
          </TouchableOpacity>
        </Animated.View>
      )}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
};

// ── Main Component ──
export default function OnboardingScreen() {
  const router = useRouter();
  const { setProfile, setOnboardingComplete, setAuthToken } = useUserStore();
  const { accentColor, setUnitSystem, unitSystem: savedUnitSystem } = useThemeStore();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentStep, setCurrentStep] = useState(-1);
  const [isTyping, setIsTyping] = useState(false);
  const [userData, setUserData] = useState<Record<string, any>>({});
  const userDataRef = useRef<Record<string, any>>({});
  const [textValue, setTextValue] = useState('');
  const [showSummary, setShowSummary] = useState(false);
  const [showLoading, setShowLoading] = useState(false);
  const [unitSystem, setLocalUnitSystem] = useState<'metric' | 'imperial'>(savedUnitSystem || 'imperial');
  const [heightCm, setHeightCm] = useState('');
  const [weightKg, setWeightKg] = useState('');
  const [heightFt, setHeightFt] = useState('');
  const [heightIn, setHeightIn] = useState('');
  const [weightLbs, setWeightLbs] = useState('');
  const [showInjuryInput, setShowInjuryInput] = useState(false);
  const [injuryDetail, setInjuryDetail] = useState('');

  const scrollRef = useRef<ScrollView>(null);
  const loadingAnim = useRef(new Animated.Value(0)).current;
  const loadingPulse = useRef(new Animated.Value(0.4)).current;

  // Scroll to bottom when messages change
  useEffect(() => {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 200);
  }, [messages, isTyping, showInjuryInput]);

  // Start the conversation
  useEffect(() => {
    advanceToStep(0);
  }, []);

  const addMessage = useCallback((text: string, sender: 'ai' | 'user') => {
    const anim = new Animated.Value(0);
    const msg: ChatMessage = { id: `${Date.now()}_${Math.random()}`, text, sender, anim };
    setMessages((prev) => [...prev, msg]);
    Animated.timing(anim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
    return msg;
  }, []);

  const advanceToStep = useCallback((stepIndex: number) => {
    if (stepIndex >= STEPS.length) {
      handleFinish();
      return;
    }

    setIsTyping(true);
    setTimeout(() => {
      const step = STEPS[stepIndex];
      const text = typeof step.aiMessage === 'function' ? step.aiMessage(userDataRef.current) : step.aiMessage;
      setIsTyping(false);
      addMessage(text, 'ai');
      setCurrentStep(stepIndex);
    }, 1500);
  }, [addMessage]);

  const handlePillSelect = useCallback((option: string) => {
    addMessage(option, 'user');
    const step = STEPS[currentStep];

    const newData = { ...userDataRef.current, [step.field]: option };
    userDataRef.current = newData;
    setUserData(newData);

    // Special case: injuries with detail
    if (step.field === 'injuries' && (option === 'Minor limitations' || option === 'Yes, I have injuries')) {
      setShowInjuryInput(true);
      return;
    }

    setTimeout(() => advanceToStep(currentStep + 1), 400);
  }, [currentStep, addMessage, advanceToStep]);

  const handleTextSubmit = useCallback(() => {
    if (!textValue.trim()) return;
    Keyboard.dismiss();
    addMessage(textValue.trim(), 'user');
    const step = STEPS[currentStep];
    const newData = { ...userDataRef.current, [step.field]: textValue.trim() };
    userDataRef.current = newData;
    setUserData(newData);
    setTextValue('');
    setTimeout(() => advanceToStep(currentStep + 1), 400);
  }, [textValue, currentStep, addMessage, advanceToStep]);

  const handleHeightWeightSubmit = useCallback(() => {
    Keyboard.dismiss();
    let displayText: string;
    let heightVal: number;
    let weightVal: number;

    if (unitSystem === 'imperial') {
      const ft = parseInt(heightFt) || 5;
      const inches = parseInt(heightIn) || 10;
      const lbs = parseFloat(weightLbs) || 165;
      heightVal = Math.round((ft * 12 + inches) * 2.54);
      weightVal = Math.round(lbs / 2.20462);
      displayText = `${ft}'${inches}" • ${Math.round(lbs)} lbs`;
    } else {
      heightVal = parseFloat(heightCm) || 178;
      weightVal = parseFloat(weightKg) || 75;
      displayText = `${heightVal} cm • ${weightVal} kg`;
    }

    addMessage(displayText, 'user');
    const newData = {
      ...userDataRef.current,
      heightCm: unitSystem === 'metric' ? heightCm || '178' : String(heightVal),
      weightKg: unitSystem === 'metric' ? weightKg || '75' : String(weightVal),
      heightFt: heightFt || '5',
      heightIn: heightIn || '10',
      weightLbs: weightLbs || '165',
      unitSystem,
      heightValue: heightVal,
      weightValue: weightVal,
    };
    userDataRef.current = newData;
    setUserData(newData);
    setTimeout(() => advanceToStep(currentStep + 1), 400);
  }, [unitSystem, heightCm, weightKg, heightFt, heightIn, weightLbs, currentStep, addMessage, advanceToStep]);

  const handleInjurySubmit = useCallback(() => {
    Keyboard.dismiss();
    if (injuryDetail.trim()) {
      addMessage(injuryDetail.trim(), 'user');
    }
    setShowInjuryInput(false);
    const newData = { ...userDataRef.current, injuryDetail: injuryDetail.trim() || '' };
    userDataRef.current = newData;
    setUserData(newData);
    setInjuryDetail('');
    setTimeout(() => advanceToStep(currentStep + 1), 400);
  }, [injuryDetail, currentStep, addMessage, advanceToStep]);

  const handleFinish = useCallback(() => {
    setIsTyping(true);
    setTimeout(() => {
      setIsTyping(false);
      const name = userDataRef.current.name || 'there';
      addMessage(`Perfect ${name}, I have everything I need to build your personalized program. Let me put together your profile...`, 'ai');
      setCurrentStep(-2);

      // Show loading after a beat
      setTimeout(() => {
        setShowLoading(true);
        Animated.loop(
          Animated.sequence([
            Animated.timing(loadingPulse, { toValue: 1, duration: 1000, useNativeDriver: true }),
            Animated.timing(loadingPulse, { toValue: 0.4, duration: 1000, useNativeDriver: true }),
          ])
        ).start();

        // After 2s, show summary
        setTimeout(() => {
          setShowLoading(false);
          setShowSummary(true);
        }, 2000);
      }, 800);
    }, 1500);
  }, [userData, addMessage]);

  const handleComplete = useCallback(async () => {
    const experienceMap: Record<string, 'beginner' | 'intermediate' | 'advanced'> = {
      'Complete beginner': 'beginner',
      'Some experience': 'beginner',
      'Intermediate': 'intermediate',
      'Advanced': 'advanced',
    };

    const daysMap: Record<string, number> = {
      '2 days': 2,
      '3 days': 3,
      '4 days': 4,
      '5+ days': 5,
    };

    const profile = {
      id: 'user_1',
      name: userData.name || 'Athlete',
      age: parseInt(userData.age) || 28,
      gender: (userData.gender?.toLowerCase() || 'male') as 'male' | 'female',
      height: userData.heightValue || 178,
      weight: userData.weightValue || 75,
      bodyFat: 15,
      trainingExperience: experienceMap[userData.level] || 'intermediate',
      fitnessGoals: [userData.goal || 'Build muscle'],
      trainingDaysPerWeek: daysMap[userData.days] || 4,
      workoutLocation: userData.location || 'Gym',
      injuries: userData.injuryDetail || (userData.injuries === 'No injuries' ? null : userData.injuries),
    };

    // Save unit preference
    if (userData.unitSystem) {
      setUnitSystem(userData.unitSystem);
    }

    await setProfile(profile);
    await setOnboardingComplete(true);

    // Register with backend and store auth token
    try {
      const { registerAndGetToken } = await import('../src/utils/api');
      const token = await registerAndGetToken(profile.id, profile.name);
      if (token) await setAuthToken(token);
    } catch (e) {
      console.error('Auth registration failed (non-blocking):', e);
    }

    // Route to training frequency → style → split before profile creation
    router.replace('/training-frequency?fromOnboarding=true');
  }, [userData, setProfile, setOnboardingComplete, setAuthToken, setUnitSystem, router]);

  // ── Loading Screen ──
  if (showLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Animated.View style={[styles.loadingRing, { opacity: loadingPulse, transform: [{ scale: loadingPulse.interpolate({ inputRange: [0.4, 1], outputRange: [0.9, 1.1] }) }] }]}>
            <View style={styles.loadingRingInner} />
          </Animated.View>
          <Text style={styles.loadingText}>Building your profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // ── Summary Screen ──
  if (showSummary) {
    return (
      <SafeAreaView style={styles.container}>
        <ProfileSummary data={userData} onComplete={handleComplete} />
      </SafeAreaView>
    );
  }

  // ── Chat Screen ──
  const step = currentStep >= 0 && currentStep < STEPS.length ? STEPS[currentStep] : null;

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ApexLogo />

        <ScrollView
          ref={scrollRef}
          style={styles.chatScroll}
          contentContainerStyle={styles.chatContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {messages.map((msg) => (
            <Animated.View
              key={msg.id}
              style={[
                msg.sender === 'ai' ? styles.aiRow : styles.userRow,
                {
                  opacity: msg.anim,
                  transform: [{ translateY: msg.anim.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }],
                },
              ]}
            >
              <View style={msg.sender === 'ai' ? styles.aiBubble : styles.userBubble}>
                <Text style={msg.sender === 'ai' ? styles.aiText : styles.userText}>
                  {msg.text}
                </Text>
              </View>
            </Animated.View>
          ))}

          {isTyping && <TypingIndicator />}
        </ScrollView>

        {/* Response Area */}
        {step && !isTyping && currentStep >= 0 && (
          <View style={styles.responseArea}>
            {/* Pills */}
            {step.responseType === 'pills' && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pillsRow}>
                {step.options?.map((opt) => (
                  <TouchableOpacity
                    key={opt}
                    style={styles.pill}
                    onPress={() => handlePillSelect(opt)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.pillText}>{opt}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}

            {/* Text Input */}
            {step.responseType === 'text' && (
              <View style={styles.inputRow}>
                <TextInput
                  style={styles.textInput}
                  value={textValue}
                  onChangeText={setTextValue}
                  placeholder={step.placeholder || 'Type here...'}
                  placeholderTextColor="#555555"
                  keyboardType={step.keyboardType || 'default'}
                  onSubmitEditing={handleTextSubmit}
                  returnKeyType="send"
                  autoFocus
                />
                <TouchableOpacity style={styles.sendButton} onPress={handleTextSubmit}>
                  <Text style={styles.sendButtonText}>→</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Height & Weight */}
            {step.responseType === 'height-weight' && (
              <View style={styles.hwContainer}>
                {/* Unit Toggle */}
                <View style={styles.unitToggle}>
                  <TouchableOpacity
                    style={[styles.unitBtn, unitSystem === 'metric' && styles.unitBtnActive]}
                    onPress={() => setLocalUnitSystem('metric')}
                  >
                    <Text style={[styles.unitBtnText, unitSystem === 'metric' && styles.unitBtnTextActive]}>Metric</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.unitBtn, unitSystem === 'imperial' && styles.unitBtnActive]}
                    onPress={() => setLocalUnitSystem('imperial')}
                  >
                    <Text style={[styles.unitBtnText, unitSystem === 'imperial' && styles.unitBtnTextActive]}>Imperial</Text>
                  </TouchableOpacity>
                </View>

                {unitSystem === 'metric' ? (
                  <View style={styles.hwRow}>
                    <View style={styles.hwField}>
                      <TextInput style={styles.hwInput} value={heightCm} onChangeText={setHeightCm} placeholder="178" placeholderTextColor="#555555" keyboardType="numeric" />
                      <Text style={styles.hwLabel}>cm</Text>
                    </View>
                    <View style={styles.hwField}>
                      <TextInput style={styles.hwInput} value={weightKg} onChangeText={setWeightKg} placeholder="75" placeholderTextColor="#555555" keyboardType="numeric" />
                      <Text style={styles.hwLabel}>kg</Text>
                    </View>
                  </View>
                ) : (
                  <View style={styles.hwRow}>
                    <View style={styles.hwField}>
                      <TextInput style={styles.hwInput} value={heightFt} onChangeText={setHeightFt} placeholder="5" placeholderTextColor="#555555" keyboardType="numeric" maxLength={1} />
                      <Text style={styles.hwLabel}>ft</Text>
                    </View>
                    <View style={styles.hwField}>
                      <TextInput style={styles.hwInput} value={heightIn} onChangeText={setHeightIn} placeholder="10" placeholderTextColor="#555555" keyboardType="numeric" maxLength={2} />
                      <Text style={styles.hwLabel}>in</Text>
                    </View>
                    <View style={styles.hwField}>
                      <TextInput style={styles.hwInput} value={weightLbs} onChangeText={setWeightLbs} placeholder="165" placeholderTextColor="#555555" keyboardType="numeric" />
                      <Text style={styles.hwLabel}>lbs</Text>
                    </View>
                  </View>
                )}

                <TouchableOpacity style={styles.hwSubmit} onPress={handleHeightWeightSubmit}>
                  <Text style={styles.hwSubmitText}>Continue</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Injury Detail Input (shown after pills) */}
            {showInjuryInput && (
              <View style={styles.inputRow}>
                <TextInput
                  style={styles.textInput}
                  value={injuryDetail}
                  onChangeText={setInjuryDetail}
                  placeholder="Tell me more so I can keep you safe"
                  placeholderTextColor="#555555"
                  onSubmitEditing={handleInjurySubmit}
                  returnKeyType="send"
                  autoFocus
                />
                <TouchableOpacity style={styles.sendButton} onPress={handleInjurySubmit}>
                  <Text style={styles.sendButtonText}>→</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ── Styles ──
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },

  // Logo
  logoContainer: {
    alignItems: 'center',
    paddingTop: 16,
    paddingBottom: 12,
  },
  logoText: {
    fontSize: 28,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: 6,
    textShadowColor: 'rgba(192,192,192,0.3)',
    textShadowRadius: 12,
  },
  logoSubtext: {
    fontSize: 10,
    fontWeight: '600',
    color: '#555555',
    letterSpacing: 3,
    marginTop: 4,
  },

  // Chat
  chatScroll: {
    flex: 1,
  },
  chatContent: {
    padding: 20,
    paddingBottom: 10,
  },
  aiRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    marginBottom: 12,
    paddingRight: 40,
  },
  userRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignSelf: 'flex-end',
    marginBottom: 12,
    paddingLeft: 40,
  },
  aiBubble: {
    backgroundColor: '#111111',
    borderRadius: 18,
    borderWidth: 0.5,
    borderColor: '#2a2a2a',
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexShrink: 1,
  },
  userBubble: {
    backgroundColor: '#1a1a1a',
    borderRadius: 18,
    borderWidth: 0.5,
    borderColor: '#2a2a2a',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  aiText: {
    color: '#ffffff',
    fontSize: 15,
    lineHeight: 22,
  },
  userText: {
    color: '#c0c0c0',
    fontSize: 15,
    lineHeight: 22,
  },

  // Typing
  typingContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    marginBottom: 12,
  },
  typingDots: {
    flexDirection: 'row',
    gap: 6,
  },
  typingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#c0c0c0',
  },

  // Response Area
  responseArea: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    paddingTop: 8,
  },
  pillsRow: {
    flexDirection: 'row',
    gap: 10,
    paddingVertical: 4,
  },
  pill: {
    backgroundColor: '#111111',
    borderRadius: 50,
    borderWidth: 0.5,
    borderColor: '#2a2a2a',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  pillText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },

  // Text Input
  inputRow: {
    flexDirection: 'row',
    gap: 10,
  },
  textInput: {
    flex: 1,
    backgroundColor: '#111111',
    borderRadius: 14,
    borderWidth: 0.5,
    borderColor: '#2a2a2a',
    color: '#ffffff',
    padding: 16,
    fontSize: 16,
  },
  sendButton: {
    backgroundColor: '#111111',
    borderRadius: 14,
    borderWidth: 0.5,
    borderColor: '#c0c0c0',
    width: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonText: {
    color: '#c0c0c0',
    fontSize: 20,
    fontWeight: '700',
  },

  // Height & Weight
  hwContainer: {
    gap: 12,
  },
  unitToggle: {
    flexDirection: 'row',
    backgroundColor: '#111111',
    borderRadius: 50,
    borderWidth: 0.5,
    borderColor: '#2a2a2a',
    padding: 3,
    alignSelf: 'center',
  },
  unitBtn: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 50,
  },
  unitBtnActive: {
    backgroundColor: '#1a1a1a',
    borderWidth: 0.5,
    borderColor: '#c0c0c0',
  },
  unitBtnText: {
    color: '#555555',
    fontSize: 13,
    fontWeight: '600',
  },
  unitBtnTextActive: {
    color: '#c0c0c0',
  },
  hwRow: {
    flexDirection: 'row',
    gap: 10,
  },
  hwField: {
    flex: 1,
    alignItems: 'center',
  },
  hwInput: {
    width: '100%',
    backgroundColor: '#111111',
    borderRadius: 14,
    borderWidth: 0.5,
    borderColor: '#2a2a2a',
    color: '#ffffff',
    padding: 14,
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
  },
  hwLabel: {
    color: '#555555',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1,
    marginTop: 6,
  },
  hwSubmit: {
    backgroundColor: '#111111',
    borderRadius: 14,
    borderWidth: 0.5,
    borderColor: '#c0c0c0',
    paddingVertical: 14,
    alignItems: 'center',
  },
  hwSubmitText: {
    color: '#c0c0c0',
    fontSize: 15,
    fontWeight: '600',
  },

  // Loading
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingRing: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 2,
    borderColor: '#c0c0c0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingRingInner: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  loadingText: {
    color: '#8a8a8a',
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 1,
    marginTop: 24,
  },

  // Summary
  summaryScroll: {
    flex: 1,
  },
  summaryContent: {
    padding: 24,
  },
  summaryTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 28,
    textShadowColor: 'rgba(192,192,192,0.15)',
    textShadowRadius: 8,
  },
  summaryCard: {
    backgroundColor: '#111111',
    borderRadius: 20,
    borderWidth: 0.5,
    borderColor: '#2a2a2a',
    padding: 20,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.6,
    shadowRadius: 20,
    elevation: 12,
  },
  summaryCardLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#555555',
    letterSpacing: 1.5,
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  summaryCardValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
  },
  startButton: {
    backgroundColor: '#111111',
    borderRadius: 14,
    borderWidth: 0.5,
    borderColor: '#c0c0c0',
    paddingVertical: 18,
    alignItems: 'center',
    marginTop: 20,
    position: 'relative',
    overflow: 'hidden',
  },
  startButtonGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: '#c0c0c0',
    opacity: 0.5,
  },
  startButtonText: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.5,
    textShadowColor: 'rgba(192,192,192,0.15)',
    textShadowRadius: 8,
  },
});
