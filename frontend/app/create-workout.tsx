import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useThemeStore } from '../src/store/themeStore';

const PATHS = [
  {
    key: 'scratch',
    title: 'Build From Scratch',
    subtitle: 'Browse exercises and build your own workout',
    icon: 'hammer',
    route: '/exercise-browser',
    color: '#4CAF50',
  },
  {
    key: 'template',
    title: 'Choose a Template',
    subtitle: 'Start from a pre-built workout plan',
    icon: 'copy',
    route: '/workout-templates',
    color: '#FF9800',
  },
  {
    key: 'ai',
    title: 'AI Generate',
    subtitle: 'Let APEX create a workout tailored to you',
    icon: 'sparkles',
    route: '/ai-generate-workout',
    color: '#7C3AED',
  },
];

export default function CreateWorkoutScreen() {
  const router = useRouter();
  const theme = useThemeStore((s) => s.theme);
  const accentColor = useThemeStore((s) => s.accentColor);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={theme.colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.textPrimary }]}>CREATE WORKOUT</Text>
      </View>

      <View style={styles.content}>
        <Text style={[styles.prompt, { color: theme.colors.textMuted }]}>
          How would you like to create your workout?
        </Text>

        {PATHS.map((path) => (
          <TouchableOpacity
            key={path.key}
            style={[styles.pathCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder }]}
            onPress={() => router.push(path.route)}
            activeOpacity={0.7}
          >
            <View style={[styles.pathIcon, { backgroundColor: path.color + '15' }]}>
              <Ionicons name={path.icon as any} size={28} color={path.color} />
            </View>
            <View style={styles.pathText}>
              <Text style={[styles.pathTitle, { color: theme.colors.textPrimary }]}>{path.title}</Text>
              <Text style={[styles.pathSubtitle, { color: theme.colors.textMuted }]}>{path.subtitle}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={theme.colors.textSecondary} />
          </TouchableOpacity>
        ))}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12, gap: 8 },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '800', letterSpacing: 1.5 },
  content: { flex: 1, paddingHorizontal: 20, paddingTop: 20 },
  prompt: { fontSize: 15, marginBottom: 24, lineHeight: 22 },
  pathCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderRadius: 16,
    borderWidth: 0.5,
    marginBottom: 14,
    gap: 16,
  },
  pathIcon: { width: 56, height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  pathText: { flex: 1 },
  pathTitle: { fontSize: 17, fontWeight: '700', marginBottom: 4 },
  pathSubtitle: { fontSize: 13, lineHeight: 18 },
});
