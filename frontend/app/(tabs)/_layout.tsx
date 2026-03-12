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
          borderTopColor: theme.colors.tabBarBorder,
          borderTopWidth: 1,
          height: Platform.OS === 'ios' ? 88 : 70,
          paddingBottom: Platform.OS === 'ios' ? 28 : 10,
          paddingTop: 10,
        },
        tabBarActiveTintColor: accentColor,
        tabBarInactiveTintColor: theme.colors.textMuted,
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '600',
          letterSpacing: 1,
          marginTop: 4,
        },
      }}
    >
      <Tabs.Screen
        name="recovery"
        options={{
          title: 'RECOVERY',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="pulse" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="workout"
        options={{
          title: 'WORKOUT',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="barbell" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="coach"
        options={{
          title: '',
          tabBarIcon: ({ color, focused }) => (
            <View style={[
              styles.coachButton,
              { 
                backgroundColor: focused ? accentColor : theme.colors.card,
                borderColor: accentColor,
              }
            ]}>
              <Ionicons 
                name="sparkles" 
                size={24} 
                color={focused ? '#FFFFFF' : accentColor} 
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
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="trending-up" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'PROFILE',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  coachButton: {
    width: 52,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 2,
  },
});
