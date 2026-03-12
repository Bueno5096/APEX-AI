import React, { useEffect } from 'react';
import { Tabs } from 'expo-router';
import { View, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeStore } from '../../src/store/themeStore';
import { useUserStore } from '../../src/store/userStore';
import { useHealthStore } from '../../src/store/healthStore';
import { useWorkoutStore } from '../../src/store/workoutStore';
import { useMuscleStore } from '../../src/store/muscleStore';

export default function TabLayout() {
  const { theme, accentColor, loadTheme } = useThemeStore();
  const { loadUser } = useUserStore();
  const { fetchHealthData } = useHealthStore();
  const { loadTodayWorkout } = useWorkoutStore();
  const { loadState, initializeMuscles } = useMuscleStore();
  
  useEffect(() => {
    const initApp = async () => {
      await loadTheme();
      await loadUser();
      await loadState();
      await fetchHealthData();
      loadTodayWorkout();
    };
    initApp();
  }, []);
  
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: theme.colors.tabBar,
          borderTopColor: theme.colors.tabBarBorder || 'transparent',
          borderTopWidth: 0,
          height: Platform.OS === 'ios' ? 90 : 75,
          paddingBottom: Platform.OS === 'ios' ? 30 : 12,
          paddingTop: 12,
        },
        tabBarActiveTintColor: theme.colors.textPrimary,
        tabBarInactiveTintColor: theme.name === 'dark' ? '#444444' : '#aaaaaa',
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '600',
          letterSpacing: 1.2,
          marginTop: 4,
        },
      }}
    >
      <Tabs.Screen
        name="recovery"
        options={{
          title: 'RECOVERY',
          tabBarIcon: ({ color, focused }) => (
            <View style={styles.tabIconWrapper}>
              <Ionicons name="pulse" size={22} color={color} />
              {focused && <View style={[styles.activeDot, { backgroundColor: accentColor }]} />}
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="workout"
        options={{
          title: 'WORKOUT',
          tabBarIcon: ({ color, focused }) => (
            <View style={styles.tabIconWrapper}>
              <Ionicons name="barbell" size={22} color={color} />
              {focused && <View style={[styles.activeDot, { backgroundColor: accentColor }]} />}
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="coach"
        options={{
          title: '',
          tabBarIcon: ({ focused }) => (
            <View style={[
              styles.coachButton,
              { 
                backgroundColor: focused ? theme.colors.cardSecondary : theme.colors.card,
                borderColor: focused ? accentColor : theme.colors.cardBorder,
              }
            ]}>
              <Ionicons 
                name="sparkles" 
                size={24} 
                color={focused ? accentColor : '#555555'} 
              />
            </View>
          ),
          tabBarLabel: () => null,
        }}
      />
      <Tabs.Screen
        name="progress"
        options={{
          title: 'PROGRESS',
          tabBarIcon: ({ color, focused }) => (
            <View style={styles.tabIconWrapper}>
              <Ionicons name="trending-up" size={22} color={color} />
              {focused && <View style={[styles.activeDot, { backgroundColor: accentColor }]} />}
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'PROFILE',
          tabBarIcon: ({ color, focused }) => (
            <View style={styles.tabIconWrapper}>
              <Ionicons name="person" size={22} color={color} />
              {focused && <View style={[styles.activeDot, { backgroundColor: accentColor }]} />}
            </View>
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabIconWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 30,
  },
  activeDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginTop: 4,
  },
  coachButton: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 1,
  },
});
