import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useThemeStore } from '../store/themeStore';

interface MetallicCardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  glowColor?: string;
  intensity?: 'low' | 'medium' | 'high';
  onPress?: () => void;
}

export const MetallicCard: React.FC<MetallicCardProps> = ({
  children,
  style,
  glowColor,
  intensity = 'low',
}) => {
  const { theme, accentColor } = useThemeStore();
  const glow = glowColor || accentColor;
  
  const glowOpacity = intensity === 'high' ? 0.3 : intensity === 'medium' ? 0.15 : 0.05;
  
  return (
    <View style={[styles.container, { borderColor: theme.colors.cardBorder }, style]}>
      <LinearGradient
        colors={[
          theme.colors.cardHighlight,
          theme.colors.card,
          theme.colors.card,
        ]}
        locations={[0, 0.1, 1]}
        style={styles.gradient}
      >
        {children}
      </LinearGradient>
      {/* Subtle glow effect */}
      <View
        style={[
          styles.glowOverlay,
          {
            backgroundColor: glow,
            opacity: glowOpacity,
          },
        ]}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    position: 'relative',
  },
  gradient: {
    padding: 16,
  },
  glowOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 2,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
});
