import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import Svg, { Circle, Defs, LinearGradient as SvgGradient, Stop } from 'react-native-svg';
import { useThemeStore } from '../store/themeStore';

interface CircularProgressProps {
  value: number;
  size?: number;
  strokeWidth?: number;
  label?: string;
  sublabel?: string;
}

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export const CircularProgress: React.FC<CircularProgressProps> = ({
  value,
  size = 200,
  strokeWidth = 10,
  label,
  sublabel,
}) => {
  const { theme, accentColor } = useThemeStore();
  const animatedValue = useRef(new Animated.Value(0)).current;
  const countAnim = useRef(new Animated.Value(0)).current;
  const [displayValue, setDisplayValue] = React.useState(0);

  const radius = (size - strokeWidth * 2) / 2;
  const circumference = radius * 2 * Math.PI;
  const progress = Math.min(Math.max(value, 0), 100);

  useEffect(() => {
    // Animate ring
    Animated.timing(animatedValue, {
      toValue: progress,
      duration: 1200,
      useNativeDriver: false,
    }).start();

    // Count-up animation
    Animated.timing(countAnim, {
      toValue: progress,
      duration: 1200,
      useNativeDriver: false,
    }).start();

    const listener = countAnim.addListener(({ value: v }) => {
      setDisplayValue(Math.round(v));
    });

    return () => countAnim.removeListener(listener);
  }, [progress]);

  const strokeDashoffset = animatedValue.interpolate({
    inputRange: [0, 100],
    outputRange: [circumference, 0],
  });

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      {/* Subtle silver glow behind */}
      <View style={[styles.glowBg, {
        width: size * 0.75,
        height: size * 0.75,
        borderRadius: size * 0.375,
        backgroundColor: 'rgba(192,192,192,0.04)',
      }]} />

      <Svg width={size} height={size} style={styles.svg}>
        <Defs>
          <SvgGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor={accentColor} stopOpacity="1" />
            <Stop offset="100%" stopColor={accentColor} stopOpacity="0.5" />
          </SvgGradient>
        </Defs>

        {/* Outer gunmetal ring */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius + strokeWidth * 0.6}
          stroke={theme.colors.metallic}
          strokeWidth={1}
          fill="transparent"
          opacity={0.3}
        />

        {/* Background track */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={theme.colors.metallicDark}
          strokeWidth={strokeWidth}
          fill="transparent"
          opacity={0.5}
        />

        {/* Progress ring */}
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="url(#progressGradient)"
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={`${circumference}`}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>

      <View style={styles.content}>
        <Text style={[styles.value, {
          color: theme.colors.textPrimary,
          textShadowColor: 'rgba(255,255,255,0.15)',
          textShadowRadius: 8,
        }]}>
          {displayValue}%
        </Text>
        {label && (
          <Text style={[styles.label, { color: accentColor }]}>
            {label}
          </Text>
        )}
        {sublabel && (
          <Text style={[styles.sublabel, { color: theme.colors.textSecondary }]}>
            {sublabel}
          </Text>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  svg: {
    position: 'absolute',
  },
  glowBg: {
    position: 'absolute',
  },
  content: {
    alignItems: 'center',
  },
  value: {
    fontSize: 42,
    fontWeight: '700',
    letterSpacing: -1,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: 4,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  sublabel: {
    fontSize: 12,
    marginTop: 2,
  },
});
