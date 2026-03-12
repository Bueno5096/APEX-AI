import React from 'react';
import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useThemeStore } from '../src/store/themeStore';

export default function RootLayout() {
  const { themeName } = useThemeStore();

  return (
    <SafeAreaProvider>
      <StatusBar style={themeName === 'dark' ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false, animation: 'fade' }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="onboarding" options={{ gestureEnabled: false }} />
        <Stack.Screen name="(tabs)" />
      </Stack>
    </SafeAreaProvider>
  );
}
