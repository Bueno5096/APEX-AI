import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Easing,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');

const STATUS_MESSAGES = [
  'Analyzing your fitness profile...',
  'Calculating muscle recovery baselines...',
  'Building your personalized training plan...',
  'Calibrating recovery algorithms...',
  'Finalizing your APEX profile...',
];

const TOTAL_DURATION = 5000;
const MSG_INTERVAL = 800;

export default function ProfileCreationScreen() {
  const router = useRouter();
  const [msgIndex, setMsgIndex] = useState(0);
  
  // Animations
  const logoScale = useRef(new Animated.Value(1)).current;
  const logoOpacity = useRef(new Animated.Value(0.6)).current;
  const msgOpacity = useRef(new Animated.Value(0)).current;
  const progressWidth = useRef(new Animated.Value(0)).current;
  const screenOpacity = useRef(new Animated.Value(1)).current;
  
  // Particle positions
  const particles = useRef(
    Array.from({ length: 8 }, () => ({
      x: new Animated.Value(Math.random() * width),
      y: new Animated.Value(height),
      opacity: new Animated.Value(0),
    }))
  ).current;

  useEffect(() => {
    // Logo pulse
    Animated.loop(
      Animated.sequence([
        Animated.timing(logoScale, { toValue: 1.08, duration: 1200, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(logoScale, { toValue: 1, duration: 1200, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(logoOpacity, { toValue: 1, duration: 1200, useNativeDriver: true }),
        Animated.timing(logoOpacity, { toValue: 0.6, duration: 1200, useNativeDriver: true }),
      ])
    ).start();

    // Progress bar
    Animated.timing(progressWidth, {
      toValue: 1,
      duration: TOTAL_DURATION,
      easing: Easing.linear,
      useNativeDriver: false,
    }).start();

    // Particles floating up
    particles.forEach((p, i) => {
      const delay = i * 600;
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.parallel([
            Animated.timing(p.y, { toValue: -50, duration: 3000, useNativeDriver: true }),
            Animated.sequence([
              Animated.timing(p.opacity, { toValue: 0.3, duration: 500, useNativeDriver: true }),
              Animated.delay(1500),
              Animated.timing(p.opacity, { toValue: 0, duration: 1000, useNativeDriver: true }),
            ]),
          ]),
          Animated.timing(p.y, { toValue: height, duration: 0, useNativeDriver: true }),
        ])
      ).start();
    });

    // Status message cycling
    const msgTimer = setInterval(() => {
      Animated.timing(msgOpacity, { toValue: 0, duration: 150, useNativeDriver: true }).start(() => {
        setMsgIndex((prev) => {
          const next = (prev + 1) % STATUS_MESSAGES.length;
          Animated.timing(msgOpacity, { toValue: 1, duration: 250, useNativeDriver: true }).start();
          return next;
        });
      });
    }, MSG_INTERVAL);

    // Initial msg fade in
    Animated.timing(msgOpacity, { toValue: 1, duration: 300, useNativeDriver: true }).start();

    // Navigate after total duration
    const navTimer = setTimeout(() => {
      Animated.timing(screenOpacity, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }).start(() => {
        router.replace('/(tabs)/recovery');
      });
    }, TOTAL_DURATION);

    return () => {
      clearInterval(msgTimer);
      clearTimeout(navTimer);
    };
  }, []);

  return (
    <Animated.View style={[styles.container, { opacity: screenOpacity }]}>
      {/* Particles */}
      {particles.map((p, i) => (
        <Animated.View
          key={i}
          style={[
            styles.particle,
            {
              transform: [{ translateX: p.x }, { translateY: p.y }],
              opacity: p.opacity,
            },
          ]}
        />
      ))}

      {/* Logo */}
      <Animated.View style={[styles.logoContainer, { transform: [{ scale: logoScale }], opacity: logoOpacity }]}>
        <View style={styles.logoBg}>
          <Ionicons name="fitness" size={48} color="#c0c0c0" />
        </View>
        <Text style={styles.logoText}>APEX AI</Text>
      </Animated.View>

      {/* Status Message */}
      <Animated.Text style={[styles.statusText, { opacity: msgOpacity }]}>
        {STATUS_MESSAGES[msgIndex]}
      </Animated.Text>

      {/* Progress Bar */}
      <View style={styles.progressContainer}>
        <Animated.View
          style={[
            styles.progressFill,
            {
              width: progressWidth.interpolate({
                inputRange: [0, 1],
                outputRange: ['0%', '100%'],
              }),
            },
          ]}
        />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  particle: {
    position: 'absolute',
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: '#444',
  },
  logoContainer: {
    alignItems: 'center',
    gap: 12,
    marginBottom: 40,
  },
  logoBg: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#111',
    borderWidth: 1,
    borderColor: '#2a2a2a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 6,
    color: '#c0c0c0',
  },
  statusText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#8a8a8a',
    textAlign: 'center',
    marginBottom: 60,
    paddingHorizontal: 40,
  },
  progressContainer: {
    width: '60%',
    height: 3,
    backgroundColor: '#1a1a1a',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#c0c0c0',
    borderRadius: 2,
  },
});
