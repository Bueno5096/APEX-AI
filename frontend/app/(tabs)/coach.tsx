import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Animated,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Speech from 'expo-speech';
import { useThemeStore } from '../../src/store/themeStore';
import { useUserStore } from '../../src/store/userStore';
import { useHealthStore } from '../../src/store/healthStore';
import { MetallicCard } from '../../src/components/MetallicCard';
import Constants from 'expo-constants';

interface Message {
  id: string;
  role: 'user' | 'coach';
  content: string;
  timestamp: Date;
}

const SUGGESTED_PROMPTS = [
  'What workout should I do today?',
  'Analyze my recovery',
  'Help me modify my workout',
  'Nutrition tips for muscle gain',
  'How can I improve my sleep?',
  'Am I overtraining?',
];

export default function CoachScreen() {
  const { theme, accentColor } = useThemeStore();
  const { profile, settings } = useUserStore();
  const { recoveryData } = useHealthStore();
  
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'coach',
      content: `Welcome back${profile?.name ? `, ${profile.name}` : ''}. I've analyzed your recovery data. Your body is at ${recoveryData?.score || 75}% readiness. How can I help you optimize your training today?`,
      timestamp: new Date(),
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [inputMode, setInputMode] = useState<'text' | 'voice'>('text');
  const [isListening, setIsListening] = useState(false);
  
  const scrollViewRef = useRef<ScrollView>(null);
  const waveformAnim = useRef(new Animated.Value(0)).current;
  
  useEffect(() => {
    if (isListening) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(waveformAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
          Animated.timing(waveformAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
        ])
      ).start();
    } else {
      waveformAnim.setValue(0);
    }
  }, [isListening]);
  
  const getBackendUrl = () => {
    const backendUrl = Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL 
      || process.env.EXPO_PUBLIC_BACKEND_URL 
      || 'https://coach-ai-fitness.preview.emergentagent.com';
    return backendUrl;
  };
  
  const sendMessage = async (text: string) => {
    if (!text.trim()) return;
    
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: text.trim(),
      timestamp: new Date(),
    };
    
    setMessages((prev) => [...prev, userMessage]);
    setInputText('');
    setIsLoading(true);
    
    try {
      const response = await fetch(`${getBackendUrl()}/api/coach/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text.trim(),
          context: {
            recoveryScore: recoveryData?.score,
            sleepDuration: recoveryData?.metrics.sleepDuration,
            hrv: recoveryData?.metrics.hrv,
            coachStyle: settings.coachStyle,
            userProfile: profile,
          },
        }),
      });
      
      const data = await response.json();
      
      const coachMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'coach',
        content: data.response || "I'm having trouble connecting right now. Please try again.",
        timestamp: new Date(),
      };
      
      setMessages((prev) => [...prev, coachMessage]);
      
      if (settings.voiceEnabled) {
        const cleanForSpeech = (text: string): string => {
          return text
            .replace(/#{1,6}\s?/g, '')
            .replace(/\*{1,3}(.*?)\*{1,3}/g, '$1')
            .replace(/_{1,3}(.*?)_{1,3}/g, '$1')
            .replace(/~~(.*?)~~/g, '$1')
            .replace(/`{1,3}[^`]*`{1,3}/g, '')
            .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
            .replace(/^[-*+]\s+/gm, '')
            .replace(/^\d+\.\s+/gm, '')
            .replace(/^>\s+/gm, '')
            .replace(/\|/g, '')
            .replace(/---+/g, '')
            .replace(/\p{Emoji_Presentation}/gu, '')
            .replace(/[\u2600-\u27BF\u{1F300}-\u{1F9FF}\u{2702}-\u{27B0}]/gu, '')
            .replace(/\n{3,}/g, '\n\n')
            .trim();
        };
        
        Speech.speak(cleanForSpeech(data.response), {
          language: 'en',
          pitch: 1.0,
          rate: settings.speechRate || 1.0,
        });
      }
    } catch (error) {
      console.error('Coach API error:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'coach',
        content: "I'm having trouble connecting to my systems. Please check your connection and try again.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  };
  
  const handleVoicePress = () => {
    if (inputMode === 'voice') {
      setIsListening(!isListening);
      if (!isListening) {
        setTimeout(() => {
          setIsListening(false);
          setInputText('What workout should I do today?');
        }, 3000);
      }
    } else {
      setInputMode('voice');
    }
  };
  
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: theme.colors.divider }]}>
          <View style={styles.headerLeft}>
            <View style={[styles.statusDot, { backgroundColor: accentColor }]} />
            <Text style={[styles.headerTitle, { color: accentColor }]}>COACH</Text>
          </View>
          <View style={[styles.headerBadge, { backgroundColor: accentColor + '12' }]}>
            <Text style={[styles.headerBadgeText, { color: accentColor }]}>Online</Text>
          </View>
        </View>
        
        {/* Messages */}
        <ScrollView
          ref={scrollViewRef}
          style={styles.messagesContainer}
          contentContainerStyle={styles.messagesContent}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
        >
          {messages.map((message, index) => (
            <View key={message.id}>
              <View
                style={[
                  styles.messageBubble,
                  message.role === 'user'
                    ? [styles.userMessage, { backgroundColor: theme.colors.cardSecondary, borderColor: theme.colors.cardBorder }]
                    : [styles.coachMessage, { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder, borderLeftColor: accentColor + '30' }],
                ]}
              >
                {message.role === 'coach' && (
                  <View style={styles.coachIcon}>
                    <Ionicons name="sparkles" size={14} color={accentColor} />
                  </View>
                )}
                <Text
                  style={[
                    styles.messageText,
                    { color: theme.colors.textPrimary },
                  ]}
                >
                  {message.content}
                </Text>
              </View>
              {message.role === 'coach' && index > 0 && index === messages.length - 1 && !isLoading && (
                <TouchableOpacity
                  style={[styles.explainMoreChip, { borderColor: accentColor + '40' }]}
                  onPress={() => sendMessage('Explain more about that')}
                  activeOpacity={0.7}
                >
                  <Ionicons name="expand-outline" size={14} color={accentColor} />
                  <Text style={[styles.explainMoreText, { color: accentColor }]}>
                    Explain more
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          ))}
          
          {isLoading && (
            <View style={[styles.loadingBubble, { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder }]}>
              <ActivityIndicator size="small" color={accentColor} />
              <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>Coach is thinking...</Text>
            </View>
          )}
        </ScrollView>
        
        {/* Suggested Prompts */}
        {messages.length <= 2 && (
          <View style={styles.suggestionsContainer}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.suggestionsContent}
            >
              {SUGGESTED_PROMPTS.map((prompt, index) => (
                <TouchableOpacity
                  key={index}
                  style={[styles.suggestionChip, { borderColor: theme.colors.cardBorder, backgroundColor: theme.colors.card }]}
                  onPress={() => sendMessage(prompt)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.suggestionText, { color: theme.colors.textSecondary }]}>{prompt}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}
        
        {/* Input Bar - floating pill */}
        <View style={styles.inputWrapper}>
          <View style={[styles.inputContainer, { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder }]}>
            {inputMode === 'voice' && isListening ? (
              <View style={styles.voiceContainer}>
                <View style={styles.waveformContainer}>
                  {[...Array(5)].map((_, i) => (
                    <Animated.View
                      key={i}
                      style={[
                        styles.waveformBar,
                        {
                          backgroundColor: accentColor,
                          transform: [{
                            scaleY: waveformAnim.interpolate({
                              inputRange: [0, 1],
                              outputRange: [0.3, 0.3 + Math.random() * 0.7],
                            }),
                          }],
                        },
                      ]}
                    />
                  ))}
                </View>
                <Text style={[styles.listeningText, { color: accentColor }]}>Listening...</Text>
              </View>
            ) : (
              <TextInput
                style={styles.input}
                placeholder="Ask Coach anything..."
                placeholderTextColor="#555555"
                value={inputText}
                onChangeText={setInputText}
                multiline
                maxLength={500}
                onSubmitEditing={() => sendMessage(inputText)}
              />
            )}
            
            <View style={styles.inputActions}>
              <TouchableOpacity
                style={[
                  styles.modeButton,
                  inputMode === 'voice' && { backgroundColor: accentColor + '15' },
                ]}
                onPress={handleVoicePress}
              >
                <Ionicons
                  name={isListening ? 'stop' : 'mic'}
                  size={18}
                  color={inputMode === 'voice' ? accentColor : '#555555'}
                />
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.sendButton,
                  { backgroundColor: inputText.trim() ? accentColor : '#242424' },
                ]}
                onPress={() => sendMessage(inputText)}
                disabled={!inputText.trim() || isLoading}
              >
                <Ionicons name="send" size={16} color="#ffffff" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  keyboardView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 0.5,
    borderBottomColor: '#2e2e2e',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 10,
  },
  headerTitle: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 1.5,
  },
  headerBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 10,
  },
  headerBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: 20,
  },
  messageBubble: {
    maxWidth: '85%',
    padding: 16,
    marginBottom: 12,
  },
  userMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#1a1a1a',
    borderRadius: 18,
    borderBottomRightRadius: 6,
    borderWidth: 0.5,
    borderColor: '#2a2a2a',
  },
  coachMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#0f0f0f',
    borderRadius: 18,
    borderBottomLeftRadius: 6,
    borderLeftWidth: 1.5,
    borderLeftColor: 'rgba(192,192,192,0.15)',
    borderWidth: 0.5,
    borderColor: '#1a1a1a',
  },
  coachIcon: {
    marginBottom: 8,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 22,
  },
  loadingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    padding: 16,
    borderRadius: 18,
    gap: 10,
    backgroundColor: '#0f0f0f',
    borderWidth: 0.5,
    borderColor: '#1a1a1a',
  },
  loadingText: {
    fontSize: 14,
    color: '#8a8a8a',
  },
  suggestionsContainer: {
    paddingVertical: 12,
  },
  suggestionsContent: {
    paddingHorizontal: 20,
    gap: 8,
  },
  suggestionChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 50,
    borderWidth: 0.5,
    borderColor: '#2a2a2a',
    backgroundColor: '#111111',
    marginRight: 8,
  },
  suggestionText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#8a8a8a',
  },
  inputWrapper: {
    paddingHorizontal: 12,
    paddingBottom: 8,
    paddingTop: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#111111',
    borderRadius: 24,
    borderWidth: 0.5,
    borderColor: '#2a2a2a',
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  input: {
    flex: 1,
    fontSize: 15,
    maxHeight: 100,
    paddingVertical: 6,
    color: '#ffffff',
  },
  inputActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  modeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  voiceContainer: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
  },
  waveformContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 40,
    gap: 4,
  },
  waveformBar: {
    width: 4,
    height: 30,
    borderRadius: 2,
  },
  listeningText: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 8,
  },
  explainMoreChip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 50,
    borderWidth: 0.5,
    marginTop: -4,
    marginBottom: 12,
    marginLeft: 4,
    backgroundColor: '#0a0a0a',
  },
  explainMoreText: {
    fontSize: 12,
    fontWeight: '600',
  },
});
