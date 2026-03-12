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
  
  // Waveform animation for voice mode
  useEffect(() => {
    if (isListening) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(waveformAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(waveformAnim, {
            toValue: 0,
            duration: 500,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      waveformAnim.setValue(0);
    }
  }, [isListening]);
  
  const getBackendUrl = () => {
    const backendUrl = Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL 
      || process.env.EXPO_PUBLIC_BACKEND_URL 
      || 'https://gender-ready.preview.emergentagent.com';
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
        headers: {
          'Content-Type': 'application/json',
        },
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
      
      // Speak response if voice is enabled
      if (settings.voiceEnabled) {
        // Strip markdown formatting and emojis for natural TTS
        const cleanForSpeech = (text: string): string => {
          return text
            .replace(/#{1,6}\s?/g, '')           // Remove ## headings
            .replace(/\*{1,3}(.*?)\*{1,3}/g, '$1') // Remove **bold** and *italic*
            .replace(/_{1,3}(.*?)_{1,3}/g, '$1')    // Remove __bold__ and _italic_
            .replace(/~~(.*?)~~/g, '$1')           // Remove ~~strikethrough~~
            .replace(/`{1,3}[^`]*`{1,3}/g, '')    // Remove `code` and ```blocks```
            .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // [link text](url) → link text
            .replace(/^[-*+]\s+/gm, '')            // Remove bullet points
            .replace(/^\d+\.\s+/gm, '')            // Remove numbered lists
            .replace(/^>\s+/gm, '')                // Remove blockquotes
            .replace(/\|/g, '')                    // Remove table pipes
            .replace(/---+/g, '')                  // Remove horizontal rules
            .replace(/\p{Emoji_Presentation}/gu, '') // Remove emojis
            .replace(/[\u2600-\u27BF\u{1F300}-\u{1F9FF}\u{2702}-\u{27B0}]/gu, '') // More emojis
            .replace(/\n{3,}/g, '\n\n')            // Collapse extra newlines
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
      // In production, this would use expo-speech-recognition
      if (!isListening) {
        // Simulate voice input after 3 seconds
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
        <View style={[styles.header, { borderBottomColor: theme.colors.cardBorder }]}>
          <View style={styles.headerLeft}>
            <View style={[styles.statusDot, { backgroundColor: accentColor }]} />
            <Text style={[styles.headerTitle, { color: accentColor }]}>
              COACH ONLINE
            </Text>
          </View>
          <View style={[styles.headerBadge, { backgroundColor: accentColor + '20' }]}>
            <Text style={[styles.headerBadgeText, { color: accentColor }]}>
              AI Active
            </Text>
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
                    ? [styles.userMessage, { backgroundColor: accentColor }]
                    : [styles.coachMessage, { backgroundColor: theme.colors.card }],
                ]}
              >
                {message.role === 'coach' && (
                  <View style={styles.coachIcon}>
                    <Ionicons name="sparkles" size={16} color={accentColor} />
                  </View>
                )}
                <Text
                  style={[
                    styles.messageText,
                    { color: message.role === 'user' ? '#FFFFFF' : theme.colors.textPrimary },
                  ]}
                >
                  {message.content}
                </Text>
              </View>
              {/* "Explain more" chip after coach messages (not the loading or first message) */}
              {message.role === 'coach' && index > 0 && index === messages.length - 1 && !isLoading && (
                <TouchableOpacity
                  style={[styles.explainMoreChip, { borderColor: accentColor + '60' }]}
                  onPress={() => sendMessage('Explain more about that')}
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
            <View style={[styles.loadingBubble, { backgroundColor: theme.colors.card }]}>
              <ActivityIndicator size="small" color={accentColor} />
              <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>
                Coach is thinking...
              </Text>
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
                  style={[styles.suggestionChip, { borderColor: accentColor }]}
                  onPress={() => sendMessage(prompt)}
                >
                  <Text style={[styles.suggestionText, { color: accentColor }]}>
                    {prompt}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}
        
        {/* Input Area */}
        <View style={[styles.inputContainer, { backgroundColor: theme.colors.card }]}>
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
                        transform: [
                          {
                            scaleY: waveformAnim.interpolate({
                              inputRange: [0, 1],
                              outputRange: [0.3, 0.3 + Math.random() * 0.7],
                            }),
                          },
                        ],
                      },
                    ]}
                  />
                ))}
              </View>
              <Text style={[styles.listeningText, { color: accentColor }]}>
                Listening...
              </Text>
            </View>
          ) : (
            <TextInput
              style={[styles.input, { color: theme.colors.textPrimary }]}
              placeholder="Ask Coach anything..."
              placeholderTextColor={theme.colors.textMuted}
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
                inputMode === 'voice' && { backgroundColor: accentColor + '20' },
              ]}
              onPress={handleVoicePress}
            >
              <Ionicons
                name={isListening ? 'stop' : 'mic'}
                size={20}
                color={inputMode === 'voice' ? accentColor : theme.colors.textSecondary}
              />
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                styles.sendButton,
                { backgroundColor: inputText.trim() ? accentColor : theme.colors.metallic },
              ]}
              onPress={() => sendMessage(inputText)}
              disabled={!inputText.trim() || isLoading}
            >
              <Ionicons name="send" size={18} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
    borderBottomWidth: 1,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 2,
  },
  headerBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
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
    padding: 14,
    borderRadius: 16,
    marginBottom: 12,
  },
  userMessage: {
    alignSelf: 'flex-end',
    borderBottomRightRadius: 4,
  },
  coachMessage: {
    alignSelf: 'flex-start',
    borderBottomLeftRadius: 4,
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
    padding: 14,
    borderRadius: 16,
    gap: 10,
  },
  loadingText: {
    fontSize: 14,
  },
  suggestionsContainer: {
    paddingVertical: 12,
  },
  suggestionsContent: {
    paddingHorizontal: 20,
    gap: 10,
  },
  suggestionChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
  },
  suggestionText: {
    fontSize: 13,
    fontWeight: '500',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    gap: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    maxHeight: 100,
    paddingVertical: 8,
  },
  inputActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
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
    borderRadius: 16,
    borderWidth: 1,
    marginTop: -4,
    marginBottom: 12,
    marginLeft: 4,
  },
  explainMoreText: {
    fontSize: 12,
    fontWeight: '600',
  },
});
