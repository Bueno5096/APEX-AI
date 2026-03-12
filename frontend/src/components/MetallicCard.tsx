import React, { useRef, useEffect } from 'react';
import { View, StyleSheet, ViewStyle, Animated } from 'react-native';
import { useThemeStore } from '../store/themeStore';

interface MetallicCardProps {
  children: React.ReactNode;
  style?: ViewStyle | ViewStyle[];
  glowColor?: string;
  intensity?: 'low' | 'medium' | 'high';
  delay?: number; // stagger delay in ms
  small?: boolean;
}

export const MetallicCard: React.FC<MetallicCardProps> = ({
  children,
  style,
  glowColor,
  intensity = 'low',
  delay = 0,
  small = false,
}) => {
  const { theme } = useThemeStore();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(16)).current;

  useEffect(() => {
    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          tension: 80,
          friction: 12,
          useNativeDriver: true,
        }),
      ]).start();
    }, delay);
    return () => clearTimeout(timer);
  }, []);

  const glowOpacity = intensity === 'high' ? 0.6 : intensity === 'medium' ? 0.4 : 0.2;
  const borderRadius = small ? 14 : 20;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          backgroundColor: small ? theme.colors.cardSecondary : theme.colors.card,
          borderColor: theme.colors.cardBorder,
          borderRadius,
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
        style,
      ]}
    >
      {/* Top glow line */}
      <View
        style={[
          styles.topGlow,
          {
            backgroundColor: glowColor || theme.colors.metallicShine,
            opacity: glowOpacity,
            borderTopLeftRadius: borderRadius,
            borderTopRightRadius: borderRadius,
          },
        ]}
      />
      <View style={styles.content}>
        {children}
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderWidth: 0.5,
    overflow: 'hidden',
    position: 'relative',
  },
  topGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1,
  },
  content: {
    padding: 16,
  },
});
