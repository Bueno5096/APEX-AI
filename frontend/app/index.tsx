import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { Redirect } from 'expo-router';
import { useUserStore } from '../src/store/userStore';
import { useThemeStore } from '../src/store/themeStore';

export default function Index() {
  const { onboardingComplete, isLoaded, loadUser } = useUserStore();
  const { loadTheme } = useThemeStore();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const init = async () => {
      await Promise.all([loadUser(), loadTheme()]);
      setReady(true);
    };
    init();
  }, []);

  if (!ready || !isLoaded) {
    return (
      <View style={styles.splash}>
        <ActivityIndicator size="large" color="#c0c0c0" />
      </View>
    );
  }

  if (!onboardingComplete) {
    return <Redirect href="/onboarding" />;
  }

  return <Redirect href="/(tabs)/recovery" />;
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
