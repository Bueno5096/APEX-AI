import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Platform,
  Animated,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
// Picker removed — using TextInput for height/weight
import { useThemeStore, formatWeight, formatHeight } from '../../src/store/themeStore';
import { useUserStore, CoachStyle } from '../../src/store/userStore';
import { useGoalStore } from '../../src/store/goalStore';
import { useWorkoutStore } from '../../src/store/workoutStore';
import { useHealthStore } from '../../src/store/healthStore';
import { useBodyCompStore } from '../../src/store/bodyCompositionStore';
import { MetallicCard } from '../../src/components/MetallicCard';
import { ACCENT_PRESETS } from '../../src/constants/theme';
import { TRAINING_STYLES, TRAINING_SPLITS } from '../../src/store/exerciseStore';
import ColorPicker, { Panel5, BrightnessSlider, Preview } from 'reanimated-color-picker';

export default function ProfileScreen() {
  const { theme, themeName, accentColor, unitSystem, setTheme, setAccentColor, setUnitSystem } = useThemeStore();
  const { profile, settings, updateSettings, setProfile, gender, setGender } = useUserStore();
  const { hasActiveGoalLayeringPlan, secondaryGoal } = useGoalStore();
  const router = useRouter();
  
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [editName, setEditName] = useState(profile?.name || '');
  const [editWeight, setEditWeight] = useState(profile?.weight?.toString() || '');
  const [editHeight, setEditHeight] = useState(profile?.height?.toString() || '');
  const [editGender, setEditGender] = useState<'male' | 'female'>(gender || 'male');
  const [pickerColor, setPickerColor] = useState(accentColor);
  
  // Editable picker states
  const [editHeightFt, setEditHeightFt] = useState('5');
  const [editHeightIn, setEditHeightIn] = useState('10');
  const [pickerHeightCm, setPickerHeightCm] = useState(profile?.height || 178);
  
  // Reset flow state
  const [resetStep, setResetStep] = useState(0); // 0=hidden, 1=first warning, 2=second, 3=final
  const [resetCheckbox, setResetCheckbox] = useState(false);
  const [resetCountdown, setResetCountdown] = useState(5);
  const [isResetting, setIsResetting] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [pickerWeightKg, setPickerWeightKg] = useState(profile?.weight || 75);
  
  const openColorPicker = () => {
    setPickerColor(accentColor);
    setShowColorPicker(true);
  };
  
  const onColorComplete = ({ hex }: { hex: string }) => {
    setPickerColor(hex);
  };
  
  const applyPickerColor = () => {
    setAccentColor(pickerColor);
    setShowColorPicker(false);
  };
  
  const openEditProfile = () => {
    const isImperial = unitSystem === 'imperial';
    setEditName(profile?.name || '');
    setEditGender(gender || 'male');
    
    const heightCm = profile?.height || 178;
    const weightKg = profile?.weight || 75;
    
    if (isImperial) {
      const totalInches = Math.round(heightCm / 2.54);
      setEditHeightFt(Math.floor(totalInches / 12).toString());
      setEditHeightIn((totalInches % 12).toString());
      setEditWeight(Math.round(weightKg * 2.20462).toString());
    } else {
      setEditHeight(heightCm.toString());
      setEditWeight(weightKg.toString());
    }
    
    setShowEditProfile(true);
  };

  const handleSaveProfile = () => {
    if (profile) {
      const isImperial = unitSystem === 'imperial';
      let saveWeight: number;
      let saveHeight: number;
      
      if (isImperial) {
        const ft = parseInt(editHeightFt) || 5;
        const inches = parseInt(editHeightIn) || 0;
        saveHeight = Math.round((ft * 12 + inches) * 2.54);
        saveWeight = Math.round((parseFloat(editWeight) || 165) / 2.20462 * 10) / 10;
      } else {
        saveHeight = parseFloat(editHeight) || profile.height;
        saveWeight = parseFloat(editWeight) || profile.weight;
      }
      
      setProfile({
        ...profile,
        name: editName,
        weight: saveWeight,
        height: saveHeight,
        gender: editGender,
      });
      setGender(editGender);
    }
    setShowEditProfile(false);
  };

  // ─── Reset Flow ─────────────────────
  // Start countdown when step 3 opens
  useEffect(() => {
    if (resetStep === 3) {
      setResetCountdown(5);
      const interval = setInterval(() => {
        setResetCountdown((c) => {
          if (c <= 1) { clearInterval(interval); return 0; }
          return c - 1;
        });
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [resetStep]);

  const handleResetAll = async () => {
    setIsResetting(true);
    setResetStep(0);

    try {
      // Clear all stores
      const resetUser = useUserStore.getState().resetStore;
      const resetGoal = useGoalStore.getState().resetStore;
      const resetWorkout = useWorkoutStore.getState().resetStore;
      const resetHealth = useHealthStore.getState().resetStore;
      const resetBodyComp = useBodyCompStore.getState().resetStore;

      await resetUser();
      await resetGoal();
      resetWorkout();
      resetHealth();
      await resetBodyComp();

      // Set pending coach message for fresh start
      useUserStore.getState().setPendingCoachMessage(
        "Welcome back. It looks like you are starting fresh — I am ready to build your new program from scratch. Let's get to know each other again. What is your name?"
      );
    } catch (err) {
      console.error('[Reset] Error:', err);
    }

    // Show fade-to-black transition
    await new Promise((resolve) => {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }).start(resolve);
    });

    setIsResetting(false);
    // Navigate to onboarding — onboardingComplete is now false
    router.replace('/');
  };

  const closeResetFlow = () => {
    setResetStep(0);
    setResetCheckbox(false);
    setResetCountdown(5);
  };
  
  const coachStyles: { key: CoachStyle; label: string; desc: string }[] = [
    { key: 'neutral', label: 'Neutral', desc: 'Professional & balanced' },
    { key: 'direct', label: 'Direct', desc: 'Short & performance-focused' },
    { key: 'supportive', label: 'Supportive', desc: 'Encouraging & motivating' },
  ];
  
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: theme.colors.textPrimary }]}>
            Settings
          </Text>
          <Text style={[styles.headerSubtitle, { color: theme.colors.textMuted }]}>
            PREFERENCES
          </Text>
        </View>
        
        {/* User Stats */}
        <TouchableOpacity onPress={openEditProfile}>
          <MetallicCard style={styles.profileCard} intensity="medium">
            <View style={styles.profileHeader}>
              <View style={[styles.avatar, { backgroundColor: accentColor }]}>
                <Text style={styles.avatarText}>
                  {profile?.name?.charAt(0).toUpperCase() || 'A'}
                </Text>
              </View>
              <View style={styles.profileInfo}>
                <Text style={[styles.profileName, { color: theme.colors.textPrimary }]}>
                  {profile?.name || 'Athlete'}
                </Text>
                <Text style={[styles.profileLevel, { color: accentColor }]}>
                  {profile?.trainingExperience?.charAt(0).toUpperCase()}
                  {profile?.trainingExperience?.slice(1)} Athlete
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={24} color={theme.colors.textSecondary} />
            </View>
            
            <View style={styles.statsGrid}>
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: theme.colors.textPrimary }]}>
                  {formatHeight(profile?.height || 178, unitSystem === 'imperial')}
                </Text>
                <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
                  Height
                </Text>
              </View>
              <View style={[styles.statDivider, { backgroundColor: theme.colors.cardBorder }]} />
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: theme.colors.textPrimary }]}>
                  {formatWeight(profile?.weight || 75, unitSystem === 'imperial')}
                </Text>
                <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
                  Weight
                </Text>
              </View>
              <View style={[styles.statDivider, { backgroundColor: theme.colors.cardBorder }]} />
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: theme.colors.textPrimary }]}>
                  {profile?.age}
                </Text>
                <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
                  Age
                </Text>
              </View>
              <View style={[styles.statDivider, { backgroundColor: theme.colors.cardBorder }]} />
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: theme.colors.textPrimary }]}>
                  {profile?.bodyFat}%
                </Text>
                <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
                  Body Fat
                </Text>
              </View>
            </View>
            
            <View style={styles.goalsSection}>
              <Text style={[styles.goalsLabel, { color: theme.colors.textSecondary }]}>
                Goals
              </Text>
              <View style={styles.goalsTags}>
                {profile?.fitnessGoals?.map((goal, i) => (
                  <View key={i} style={[styles.goalTag, { backgroundColor: accentColor + '20' }]}>
                    <Text style={[styles.goalTagText, { color: accentColor }]}>
                      {goal}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          </MetallicCard>
        </TouchableOpacity>
        
        {/* Body Composition Card */}
        <TouchableOpacity onPress={() => router.push('/body-composition')} activeOpacity={0.7}>
          <MetallicCard style={styles.bodyCompCard}>
            <View style={styles.bodyCompRow}>
              <View style={[styles.bodyCompIcon, { backgroundColor: accentColor + '15' }]}>
                <Ionicons name="body" size={22} color={accentColor} />
              </View>
              <View style={styles.bodyCompInfo}>
                <Text style={[styles.bodyCompTitle, { color: theme.colors.textPrimary }]}>Body Composition</Text>
                <Text style={[styles.bodyCompSubtitle, { color: theme.colors.textMuted }]}>
                  {hasActiveGoalLayeringPlan && secondaryGoal?.isActive
                    ? 'Goal layering active'
                    : 'View analysis & set goals'}
                </Text>
              </View>
              {hasActiveGoalLayeringPlan && (
                <View style={[styles.activeIndicator, { backgroundColor: accentColor }]} />
              )}
              <Ionicons name="chevron-forward" size={20} color={theme.colors.textSecondary} />
            </View>
          </MetallicCard>
        </TouchableOpacity>
        
        {/* Training Preferences */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>
            Training Preferences
          </Text>
          
          {/* Training Frequency */}
          <TouchableOpacity onPress={() => router.push('/training-frequency')} activeOpacity={0.7}>
            <MetallicCard style={styles.integrationCard}>
              <View style={styles.integrationRow}>
                <View style={styles.integrationInfo}>
                  <View style={[styles.bodyCompIcon, { backgroundColor: accentColor + '15' }]}>
                    <Ionicons name="repeat" size={20} color={accentColor} />
                  </View>
                  <View style={styles.integrationText}>
                    <Text style={[styles.integrationName, { color: theme.colors.textPrimary }]}>
                      Training Frequency
                    </Text>
                    <Text style={[styles.integrationStatus, { color: theme.colors.textMuted }]}>
                      {profile?.trainingFrequency
                        ? `${profile.trainingFrequency} days/week`
                        : 'Not set — tap to choose'}
                    </Text>
                  </View>
                </View>
                {profile?.trainingFrequency && (
                  <View style={[styles.connectionBadge, { backgroundColor: accentColor + '20' }]}>
                    <Text style={[styles.connectionText, { color: accentColor }]}>
                      {profile.trainingFrequency}x/week
                    </Text>
                  </View>
                )}
                <Ionicons name="chevron-forward" size={20} color={theme.colors.textSecondary} />
              </View>
            </MetallicCard>
          </TouchableOpacity>
          
          {/* Training Style */}
          <TouchableOpacity onPress={() => router.push('/training-style')} activeOpacity={0.7}>
            <MetallicCard style={styles.integrationCard}>
              <View style={styles.integrationRow}>
                <View style={styles.integrationInfo}>
                  <View style={[styles.bodyCompIcon, { backgroundColor: accentColor + '15' }]}>
                    <Ionicons name="barbell" size={20} color={accentColor} />
                  </View>
                  <View style={styles.integrationText}>
                    <Text style={[styles.integrationName, { color: theme.colors.textPrimary }]}>
                      Training Style
                    </Text>
                    <Text style={[styles.integrationStatus, { color: theme.colors.textMuted }]}>
                      {profile?.trainingStyle
                        ? TRAINING_STYLES.find(s => s.key === profile.trainingStyle)?.name || 'Not set'
                        : 'Not set — tap to choose'}
                    </Text>
                  </View>
                </View>
                {profile?.trainingStyle && (
                  <View style={[styles.connectionBadge, { backgroundColor: accentColor + '20' }]}>
                    <Text style={[styles.connectionText, { color: accentColor }]}>
                      {TRAINING_STYLES.find(s => s.key === profile.trainingStyle)?.name}
                    </Text>
                  </View>
                )}
                <Ionicons name="chevron-forward" size={20} color={theme.colors.textSecondary} />
              </View>
            </MetallicCard>
          </TouchableOpacity>
          
          {/* Training Split */}
          <TouchableOpacity onPress={() => router.push('/training-split')} activeOpacity={0.7}>
            <MetallicCard style={styles.integrationCard}>
              <View style={styles.integrationRow}>
                <View style={styles.integrationInfo}>
                  <View style={[styles.bodyCompIcon, { backgroundColor: accentColor + '15' }]}>
                    <Ionicons name="calendar" size={20} color={accentColor} />
                  </View>
                  <View style={styles.integrationText}>
                    <Text style={[styles.integrationName, { color: theme.colors.textPrimary }]}>
                      Training Split
                    </Text>
                    <Text style={[styles.integrationStatus, { color: theme.colors.textMuted }]}>
                      {profile?.trainingSplit
                        ? TRAINING_SPLITS.find(s => s.key === profile.trainingSplit)?.name || 'Not set'
                        : 'Not set — tap to choose'}
                    </Text>
                  </View>
                </View>
                {profile?.trainingSplit && (
                  <View style={[styles.connectionBadge, { backgroundColor: accentColor + '20' }]}>
                    <Text style={[styles.connectionText, { color: accentColor }]}>
                      {TRAINING_SPLITS.find(s => s.key === profile.trainingSplit)?.name}
                    </Text>
                  </View>
                )}
                <Ionicons name="chevron-forward" size={20} color={theme.colors.textSecondary} />
              </View>
            </MetallicCard>
          </TouchableOpacity>
        </View>
        
        {/* Health Integration */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>
            Health Integration
          </Text>
          <MetallicCard style={styles.integrationCard}>
            <View style={styles.integrationRow}>
              <View style={styles.integrationInfo}>
                <Ionicons name="watch" size={24} color={accentColor} />
                <View style={styles.integrationText}>
                  <Text style={[styles.integrationName, { color: theme.colors.textPrimary }]}>
                    Samsung Health
                  </Text>
                  <Text style={[styles.integrationStatus, { color: theme.colors.success }]}>
                    Simulated Mode
                  </Text>
                </View>
              </View>
              <View style={[styles.connectionBadge, { backgroundColor: theme.colors.success + '20' }]}>
                <Text style={[styles.connectionText, { color: theme.colors.success }]}>
                  Active
                </Text>
              </View>
            </View>
          </MetallicCard>
          
          <MetallicCard style={styles.integrationCard}>
            <View style={styles.integrationRow}>
              <View style={styles.integrationInfo}>
                <Ionicons name="fitness" size={24} color={theme.colors.textSecondary} />
                <View style={styles.integrationText}>
                  <Text style={[styles.integrationName, { color: theme.colors.textPrimary }]}>
                    Health Connect
                  </Text>
                  <Text style={[styles.integrationStatus, { color: theme.colors.textMuted }]}>
                    Ready for device connection
                  </Text>
                </View>
              </View>
              <TouchableOpacity style={[styles.connectButton, { borderColor: accentColor }]}>
                <Text style={[styles.connectButtonText, { color: accentColor }]}>
                  Setup
                </Text>
              </TouchableOpacity>
            </View>
          </MetallicCard>
          
          <MetallicCard style={styles.integrationCard}>
            <View style={styles.integrationRow}>
              <View style={styles.integrationInfo}>
                <Ionicons name="logo-apple" size={24} color={theme.colors.textSecondary} />
                <View style={styles.integrationText}>
                  <Text style={[styles.integrationName, { color: theme.colors.textPrimary }]}>
                    Apple Health
                  </Text>
                  <Text style={[styles.integrationStatus, { color: theme.colors.textMuted }]}>
                    Available on iOS devices
                  </Text>
                </View>
              </View>
              <TouchableOpacity style={[styles.connectButton, { borderColor: accentColor }]}>
                <Text style={[styles.connectButtonText, { color: accentColor }]}>
                  Setup
                </Text>
              </TouchableOpacity>
            </View>
          </MetallicCard>
        </View>
        
        {/* Theme Customization */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>
            Appearance
          </Text>
          
          {/* Theme Toggle */}
          <MetallicCard style={styles.settingCard}>
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Ionicons name={themeName === 'dark' ? 'moon' : 'sunny'} size={22} color={accentColor} />
                <Text style={[styles.settingLabel, { color: theme.colors.textPrimary }]}>
                  Theme
                </Text>
              </View>
              <View style={styles.unitToggleContainer}>
                <TouchableOpacity
                  style={[
                    styles.unitOption,
                    themeName === 'dark' && { backgroundColor: accentColor + '25', borderColor: accentColor },
                  ]}
                  onPress={() => setTheme('dark')}
                >
                  <Text style={[
                    styles.unitOptionText,
                    { color: themeName === 'dark' ? accentColor : theme.colors.textSecondary },
                  ]}>
                    DARK
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.unitOption,
                    themeName === 'light' && { backgroundColor: accentColor + '25', borderColor: accentColor },
                  ]}
                  onPress={() => setTheme('light')}
                >
                  <Text style={[
                    styles.unitOptionText,
                    { color: themeName === 'light' ? accentColor : theme.colors.textSecondary },
                  ]}>
                    LIGHT
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </MetallicCard>
          
          {/* Accent Color */}
          <TouchableOpacity onPress={() => openColorPicker()}>
            <MetallicCard style={styles.settingCard}>
              <View style={styles.settingRow}>
                <View style={styles.settingInfo}>
                  <Ionicons name="color-palette" size={22} color={accentColor} />
                  <Text style={[styles.settingLabel, { color: theme.colors.textPrimary }]}>
                    Accent Color
                  </Text>
                </View>
                <View style={styles.colorPreview}>
                  <View style={[styles.colorDot, { backgroundColor: accentColor }]} />
                  <Ionicons name="chevron-forward" size={20} color={theme.colors.textSecondary} />
                </View>
              </View>
            </MetallicCard>
          </TouchableOpacity>
          
        </View>
        
        {/* Notifications */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>
            Notifications
          </Text>
          
          <MetallicCard style={styles.settingCard}>
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Ionicons name="notifications" size={22} color={accentColor} />
                <Text style={[styles.settingLabel, { color: theme.colors.textPrimary }]}>
                  Workout Reminders
                </Text>
              </View>
              <TouchableOpacity
                style={[
                  styles.customToggle,
                  { backgroundColor: settings.workoutReminders ? accentColor : '#3a3a3a' },
                ]}
                onPress={() => updateSettings({ workoutReminders: !settings.workoutReminders })}
                activeOpacity={0.8}
              >
                <View style={[
                  styles.customToggleThumb,
                  settings.workoutReminders && styles.customToggleThumbActive,
                ]} />
              </TouchableOpacity>
            </View>
          </MetallicCard>
          
          <MetallicCard style={styles.settingCard}>
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Ionicons name="pulse" size={22} color={accentColor} />
                <Text style={[styles.settingLabel, { color: theme.colors.textPrimary }]}>
                  Recovery Alerts
                </Text>
              </View>
              <TouchableOpacity
                style={[
                  styles.customToggle,
                  { backgroundColor: settings.recoveryAlerts ? accentColor : '#3a3a3a' },
                ]}
                onPress={() => updateSettings({ recoveryAlerts: !settings.recoveryAlerts })}
                activeOpacity={0.8}
              >
                <View style={[
                  styles.customToggleThumb,
                  settings.recoveryAlerts && styles.customToggleThumbActive,
                ]} />
              </TouchableOpacity>
            </View>
          </MetallicCard>
          
          <MetallicCard style={styles.settingCard}>
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Ionicons name="sparkles" size={22} color={accentColor} />
                <Text style={[styles.settingLabel, { color: theme.colors.textPrimary }]}>
                  Coach Suggestions
                </Text>
              </View>
              <TouchableOpacity
                style={[
                  styles.customToggle,
                  { backgroundColor: settings.coachSuggestions ? accentColor : '#3a3a3a' },
                ]}
                onPress={() => updateSettings({ coachSuggestions: !settings.coachSuggestions })}
                activeOpacity={0.8}
              >
                <View style={[
                  styles.customToggleThumb,
                  settings.coachSuggestions && styles.customToggleThumbActive,
                ]} />
              </TouchableOpacity>
            </View>
          </MetallicCard>
        </View>
        
        {/* Danger Zone */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: '#c0392b' }]}>DANGER ZONE</Text>
          <TouchableOpacity
            style={styles.resetButton}
            onPress={() => setResetStep(1)}
            activeOpacity={0.7}
          >
            <Ionicons name="trash-outline" size={18} color="#c0392b" />
            <Text style={styles.resetButtonText}>Reset My Information</Text>
          </TouchableOpacity>
        </View>
        
        {/* App Info */}
        <View style={styles.appInfo}>
          <Text style={[styles.appName, { color: theme.colors.textSecondary }]}>
            APEX AI FITNESS
          </Text>
          <Text style={[styles.appVersion, { color: theme.colors.textMuted }]}>
            v1.0.0
          </Text>
        </View>
        
        <View style={styles.bottomSpacer} />
      </ScrollView>
      
      {/* Color Picker Modal with Color Wheel */}
      <Modal
        visible={showColorPicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowColorPicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.colorPickerModal, { backgroundColor: theme.colors.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.colors.textPrimary }]}>
                Accent Color
              </Text>
              <TouchableOpacity onPress={() => setShowColorPicker(false)}>
                <Ionicons name="close" size={24} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            </View>
            
            {/* Color Wheel */}
            <View style={styles.wheelContainer}>
              <ColorPicker
                value={pickerColor}
                onComplete={onColorComplete}
                style={styles.colorPickerWheel}
              >
                <Panel5 style={styles.wheelPanel} />
                <BrightnessSlider
                  style={styles.brightnessSlider}
                  thumbShape="circle"
                  thumbSize={24}
                />
                <Preview
                  style={styles.colorPreviewBar}
                  hideInitialColor
                  textStyle={{ color: theme.colors.textPrimary, fontSize: 14, fontWeight: '600' }}
                />
              </ColorPicker>
            </View>
            
            {/* Apply Custom Color */}
            <TouchableOpacity
              style={[styles.applyColorButton, { backgroundColor: pickerColor }]}
              onPress={applyPickerColor}
            >
              <Text style={styles.applyColorText}>Apply Color</Text>
            </TouchableOpacity>
            
            {/* Divider */}
            <View style={[styles.pickerDivider, { backgroundColor: theme.colors.cardBorder }]} />
            
            {/* Quick Presets */}
            <Text style={[styles.presetsLabel, { color: theme.colors.textSecondary }]}>
              PRESETS
            </Text>
            <View style={styles.colorGrid}>
              {ACCENT_PRESETS.map((preset) => (
                <TouchableOpacity
                  key={preset.color}
                  style={[
                    styles.colorOption,
                    { backgroundColor: preset.color },
                    accentColor === preset.color && styles.colorSelected,
                  ]}
                  onPress={() => {
                    setAccentColor(preset.color);
                    setShowColorPicker(false);
                  }}
                >
                  {accentColor === preset.color && (
                    <Ionicons name="checkmark" size={20} color="#FFFFFF" />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </Modal>
      
      {/* Edit Profile Modal */}
      <Modal
        visible={showEditProfile}
        transparent
        animationType="slide"
        onRequestClose={() => setShowEditProfile(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.editProfileModal, { backgroundColor: theme.colors.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.colors.textPrimary }]}>
                Edit Profile
              </Text>
              <TouchableOpacity onPress={() => setShowEditProfile(false)}>
                <Ionicons name="close" size={24} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            </View>
            
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: theme.colors.textSecondary }]}>
                Name
              </Text>
              <TextInput
                style={[
                  styles.textInput,
                  { backgroundColor: theme.colors.backgroundSecondary, color: theme.colors.textPrimary },
                ]}
                value={editName}
                onChangeText={setEditName}
                placeholder="Your name"
                placeholderTextColor={theme.colors.textMuted}
              />
            </View>
            
            {/* Gender Selection */}
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: theme.colors.textSecondary }]}>
                Gender
              </Text>
              <View style={styles.genderRow}>
                <TouchableOpacity
                  style={[
                    styles.genderButton,
                    { borderColor: theme.colors.cardBorder },
                    editGender === 'male' && { borderColor: accentColor, backgroundColor: accentColor + '15' },
                  ]}
                  onPress={() => setEditGender('male')}
                >
                  <Ionicons 
                    name="male" 
                    size={20} 
                    color={editGender === 'male' ? accentColor : theme.colors.textSecondary} 
                  />
                  <Text style={[
                    styles.genderButtonText,
                    { color: editGender === 'male' ? accentColor : theme.colors.textSecondary },
                  ]}>
                    Male
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.genderButton,
                    { borderColor: theme.colors.cardBorder },
                    editGender === 'female' && { borderColor: accentColor, backgroundColor: accentColor + '15' },
                  ]}
                  onPress={() => setEditGender('female')}
                >
                  <Ionicons 
                    name="female" 
                    size={20} 
                    color={editGender === 'female' ? accentColor : theme.colors.textSecondary} 
                  />
                  <Text style={[
                    styles.genderButtonText,
                    { color: editGender === 'female' ? accentColor : theme.colors.textSecondary },
                  ]}>
                    Female
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
            
            {/* Height & Weight Inputs */}
            {unitSystem === 'imperial' ? (
              <>
                {/* Imperial Height: ft + in */}
                <View style={styles.inputGroup}>
                  <Text style={[styles.inputLabel, { color: theme.colors.textSecondary }]}>
                    Height
                  </Text>
                  <View style={styles.pickerRow}>
                    <View style={styles.imperialFieldGroup}>
                      <TextInput
                        style={[
                          styles.imperialInput,
                          { backgroundColor: theme.colors.backgroundSecondary, color: theme.colors.textPrimary, borderColor: theme.colors.cardBorder },
                        ]}
                        value={editHeightFt}
                        onChangeText={setEditHeightFt}
                        keyboardType="numeric"
                        placeholder="5"
                        placeholderTextColor={theme.colors.textMuted}
                        maxLength={1}
                      />
                      <Text style={[styles.imperialUnitLabel, { color: theme.colors.textSecondary }]}>ft</Text>
                    </View>
                    <View style={styles.imperialFieldGroup}>
                      <TextInput
                        style={[
                          styles.imperialInput,
                          { backgroundColor: theme.colors.backgroundSecondary, color: theme.colors.textPrimary, borderColor: theme.colors.cardBorder },
                        ]}
                        value={editHeightIn}
                        onChangeText={setEditHeightIn}
                        keyboardType="numeric"
                        placeholder="10"
                        placeholderTextColor={theme.colors.textMuted}
                        maxLength={2}
                      />
                      <Text style={[styles.imperialUnitLabel, { color: theme.colors.textSecondary }]}>in</Text>
                    </View>
                  </View>
                </View>

                {/* Imperial Weight */}
                <View style={styles.inputGroup}>
                  <Text style={[styles.inputLabel, { color: theme.colors.textSecondary }]}>
                    Weight
                  </Text>
                  <View style={styles.metricInputRow}>
                    <TextInput
                      style={[
                        styles.metricInput,
                        { backgroundColor: theme.colors.backgroundSecondary, color: theme.colors.textPrimary, borderColor: theme.colors.cardBorder },
                      ]}
                      value={editWeight}
                      onChangeText={setEditWeight}
                      keyboardType="numeric"
                      placeholder="165"
                      placeholderTextColor={theme.colors.textMuted}
                      maxLength={4}
                    />
                    <Text style={[styles.unitLabel, { color: theme.colors.textSecondary }]}>lbs</Text>
                  </View>
                </View>
              </>
            ) : (
              <>
                {/* Metric Height */}
                <View style={styles.inputGroup}>
                  <Text style={[styles.inputLabel, { color: theme.colors.textSecondary }]}>
                    Height
                  </Text>
                  <View style={styles.metricInputRow}>
                    <TextInput
                      style={[
                        styles.metricInput,
                        { backgroundColor: theme.colors.backgroundSecondary, color: theme.colors.textPrimary, borderColor: theme.colors.cardBorder },
                      ]}
                      value={editHeight}
                      onChangeText={setEditHeight}
                      keyboardType="numeric"
                      placeholder="178"
                      placeholderTextColor={theme.colors.textMuted}
                      maxLength={3}
                    />
                    <Text style={[styles.unitLabel, { color: theme.colors.textSecondary }]}>cm</Text>
                  </View>
                </View>

                {/* Metric Weight */}
                <View style={styles.inputGroup}>
                  <Text style={[styles.inputLabel, { color: theme.colors.textSecondary }]}>
                    Weight
                  </Text>
                  <View style={styles.metricInputRow}>
                    <TextInput
                      style={[
                        styles.metricInput,
                        { backgroundColor: theme.colors.backgroundSecondary, color: theme.colors.textPrimary, borderColor: theme.colors.cardBorder },
                      ]}
                      value={editWeight}
                      onChangeText={setEditWeight}
                      keyboardType="numeric"
                      placeholder="75"
                      placeholderTextColor={theme.colors.textMuted}
                      maxLength={4}
                    />
                    <Text style={[styles.unitLabel, { color: theme.colors.textSecondary }]}>kg</Text>
                  </View>
                </View>
              </>
            )}
            
            {/* Unit System Toggle */}
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: theme.colors.textSecondary }]}>
                Units
              </Text>
              <View style={styles.genderRow}>
                <TouchableOpacity
                  style={[
                    styles.genderButton,
                    { borderColor: theme.colors.cardBorder },
                    unitSystem === 'metric' && { borderColor: accentColor, backgroundColor: accentColor + '15' },
                  ]}
                  onPress={() => setUnitSystem('metric')}
                >
                  <Text style={[
                    styles.genderButtonText,
                    { color: unitSystem === 'metric' ? accentColor : theme.colors.textSecondary },
                  ]}>
                    Metric
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.genderButton,
                    { borderColor: theme.colors.cardBorder },
                    unitSystem === 'imperial' && { borderColor: accentColor, backgroundColor: accentColor + '15' },
                  ]}
                  onPress={() => setUnitSystem('imperial')}
                >
                  <Text style={[
                    styles.genderButtonText,
                    { color: unitSystem === 'imperial' ? accentColor : theme.colors.textSecondary },
                  ]}>
                    Imperial
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
            
            <TouchableOpacity
              style={[styles.saveButton, { backgroundColor: accentColor }]}
              onPress={handleSaveProfile}
            >
              <Text style={styles.saveButtonText}>Save Changes</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ─── Reset Confirmation Modals ──── */}
      {/* Step 1: First Warning */}
      <Modal visible={resetStep === 1} transparent animationType="fade" onRequestClose={closeResetFlow}>
        <View style={styles.resetOverlay}>
          <View style={styles.resetModal}>
            <Text style={styles.resetModalTitle}>Reset Your Information?</Text>
            <Text style={styles.resetModalBody}>
              This will delete your profile, workout history, body composition data, goals, and Coach memory. You will be taken back to the onboarding screen to start fresh.
            </Text>
            <View style={styles.resetModalButtons}>
              <TouchableOpacity style={styles.resetCancelBtn} onPress={closeResetFlow}>
                <Text style={styles.resetCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.resetContinueBtn} onPress={() => { setResetCheckbox(false); setResetStep(2); }}>
                <Text style={styles.resetContinueText}>Continue</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Step 2: Second Warning */}
      <Modal visible={resetStep === 2} transparent animationType="fade" onRequestClose={closeResetFlow}>
        <View style={styles.resetOverlay}>
          <View style={styles.resetModal}>
            <Text style={styles.resetModalTitle}>Are You Sure?</Text>
            <Text style={styles.resetModalBody}>
              {'⚠️ This action will permanently delete all of your personal data including your workout history, progress tracking, body composition measurements, and all Coach conversations. This cannot be undone.'}
            </Text>
            <TouchableOpacity style={styles.checkboxRow} onPress={() => setResetCheckbox(!resetCheckbox)} activeOpacity={0.7}>
              <View style={[styles.checkbox, resetCheckbox && styles.checkboxChecked]}>
                {resetCheckbox && <Ionicons name="checkmark" size={14} color="#fff" />}
              </View>
              <Text style={styles.checkboxLabel}>I understand my data will be permanently deleted</Text>
            </TouchableOpacity>
            <View style={styles.resetModalButtons}>
              <TouchableOpacity style={styles.resetCancelBtn} onPress={() => setResetStep(1)}>
                <Text style={styles.resetCancelText}>Go Back</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.resetDestroyBtn, !resetCheckbox && styles.resetBtnDisabled]}
                onPress={() => resetCheckbox && setResetStep(3)}
                disabled={!resetCheckbox}
              >
                <Text style={[styles.resetDestroyText, !resetCheckbox && { opacity: 0.4 }]}>Yes, Delete Everything</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Step 3: Final Confirmation with Countdown */}
      <Modal visible={resetStep === 3} transparent animationType="fade" onRequestClose={closeResetFlow}>
        <View style={styles.resetOverlay}>
          <View style={styles.resetModal}>
            <Text style={styles.resetModalTitle}>Last Chance</Text>
            <Text style={styles.resetModalBody}>
              Once you confirm, your information will be deleted immediately and cannot be recovered. Are you absolutely sure you want to start over?
            </Text>
            <View style={styles.resetModalButtons}>
              <TouchableOpacity style={styles.resetCancelBtn} onPress={closeResetFlow}>
                <Text style={styles.resetCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.resetDestroyBtn, resetCountdown > 0 && styles.resetBtnDisabled]}
                onPress={() => resetCountdown === 0 && handleResetAll()}
                disabled={resetCountdown > 0}
              >
                <Text style={[styles.resetDestroyText, resetCountdown > 0 && { opacity: 0.4 }]}>
                  {resetCountdown > 0 ? `Wait ${resetCountdown}...` : 'Delete and Start Over'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Resetting overlay */}
      {isResetting && (
        <Animated.View style={[styles.resetFullOverlay, { opacity: fadeAnim }]}>
          <ActivityIndicator size="large" color="#fff" />
          <Text style={styles.resetFullText}>Resetting...</Text>
        </Animated.View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  header: {
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 1.5,
    marginTop: 4,
  },
  profileCard: {
    marginBottom: 12,
  },
  bodyCompCard: {
    marginBottom: 24,
  },
  bodyCompRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  bodyCompIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bodyCompInfo: {
    flex: 1,
  },
  bodyCompTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  bodyCompSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  activeIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '700',
  },
  profileInfo: {
    flex: 1,
    marginLeft: 16,
  },
  profileName: {
    fontSize: 22,
    fontWeight: '700',
  },
  profileLevel: {
    fontSize: 13,
    marginTop: 2,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 11,
    marginTop: 4,
  },
  statDivider: {
    width: 1,
    height: 30,
  },
  goalsSection: {},
  goalsLabel: {
    fontSize: 12,
    marginBottom: 8,
  },
  goalsTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  goalTag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  goalTagText: {
    fontSize: 12,
    fontWeight: '500',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 1.5,
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  integrationCard: {
    marginBottom: 10,
  },
  integrationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  integrationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  integrationText: {
    marginLeft: 12,
  },
  integrationName: {
    fontSize: 15,
    fontWeight: '600',
  },
  integrationStatus: {
    fontSize: 12,
    marginTop: 2,
  },
  connectionBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  connectionText: {
    fontSize: 11,
    fontWeight: '600',
  },
  connectButton: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  connectButtonText: {
    fontSize: 12,
    fontWeight: '600',
  },
  settingCard: {
    marginBottom: 10,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  settingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  settingLabel: {
    fontSize: 15,
    fontWeight: '500',
  },
  colorPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  colorDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  coachStyleCard: {
    marginBottom: 10,
  },
  coachStyleLabel: {
    fontSize: 13,
    marginBottom: 12,
  },
  coachStyleOptions: {
    gap: 10,
  },
  coachStyleOption: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  coachStyleName: {
    fontSize: 15,
    fontWeight: '600',
  },
  coachStyleDesc: {
    fontSize: 12,
    marginTop: 4,
  },
  appInfo: {
    alignItems: 'center',
    paddingTop: 20,
  },
  appName: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 4,
  },
  appVersion: {
    fontSize: 12,
    marginTop: 4,
  },
  bottomSpacer: {
    height: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  colorPickerModal: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  // Color Wheel styles
  wheelContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  colorPickerWheel: {
    width: '100%',
    alignItems: 'center',
    gap: 16,
  },
  wheelPanel: {
    width: 240,
    height: 240,
    borderRadius: 120,
  },
  brightnessSlider: {
    width: '90%',
    height: 32,
    borderRadius: 16,
  },
  colorPreviewBar: {
    width: '90%',
    height: 44,
    borderRadius: 14,
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'center',
  },
  colorOption: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorSelected: {
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  colorNote: {
    textAlign: 'center',
    fontSize: 12,
    marginTop: 20,
  },
  // Unit system toggle
  unitToggleContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  unitOption: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'transparent',
    borderRadius: 10,
  },
  unitOptionText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
  },
  applyColorButton: {
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    marginBottom: 16,
  },
  applyColorText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  pickerDivider: {
    height: 1,
    marginBottom: 16,
  },
  presetsLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 2,
    marginBottom: 12,
    textAlign: 'center',
  },
  editProfileModal: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 13,
    marginBottom: 8,
  },
  textInput: {
    padding: 14,
    borderRadius: 12,
    fontSize: 16,
  },
  inputRow: {
    flexDirection: 'row',
  },
  pickerRow: {
    flexDirection: 'row',
    gap: 16,
    alignItems: 'flex-start',
  },
  imperialFieldGroup: {
    flex: 1,
    alignItems: 'center',
  },
  imperialInput: {
    fontSize: 22,
    fontWeight: '700',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: 0.5,
    textAlign: 'center',
    width: '100%',
  },
  imperialUnitLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 6,
    letterSpacing: 1,
  },
  metricInput: {
    fontSize: 22,
    fontWeight: '700',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: 0.5,
    textAlign: 'center',
    flex: 1,
  },
  unitLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
    minWidth: 24,
  },
  metricInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  genderRow: {
    flexDirection: 'row',
    gap: 12,
  },
  genderButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  genderButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
  speedOptionsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  speedOption: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1.5,
    alignItems: 'center',
  },
  speedOptionText: {
    fontSize: 12,
    fontWeight: '700',
  },
  saveButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  customToggle: {
    width: 52,
    height: 30,
    borderRadius: 15,
    padding: 3,
    justifyContent: 'center',
  },
  customToggleThumb: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#ffffff',
    alignSelf: 'flex-start',
  },
  customToggleThumbActive: {
    alignSelf: 'flex-end',
  },
  // Reset / Danger Zone styles
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: 0.5,
    borderColor: '#c0392b40',
  },
  resetButtonText: {
    color: '#c0392b',
    fontSize: 14,
    fontWeight: '600',
  },
  resetOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  resetModal: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#000000',
    borderRadius: 20,
    borderWidth: 0.5,
    borderColor: '#2a2a2a',
    padding: 24,
  },
  resetModalTitle: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 12,
  },
  resetModalBody: {
    color: '#8a8a8a',
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 20,
  },
  resetModalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  resetCancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 0.5,
    borderColor: '#2a2a2a',
    alignItems: 'center',
  },
  resetCancelText: {
    color: '#8a8a8a',
    fontSize: 14,
    fontWeight: '600',
  },
  resetContinueBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 0.5,
    borderColor: '#c0392b',
    alignItems: 'center',
  },
  resetContinueText: {
    color: '#c0392b',
    fontSize: 14,
    fontWeight: '600',
  },
  resetDestroyBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#e74c3c',
    alignItems: 'center',
  },
  resetDestroyText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  resetBtnDisabled: {
    backgroundColor: '#3a1515',
    opacity: 0.6,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
    paddingVertical: 8,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: '#2a2a2a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#e74c3c',
    borderColor: '#e74c3c',
  },
  checkboxLabel: {
    color: '#8a8a8a',
    fontSize: 13,
    flex: 1,
  },
  resetFullOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
    gap: 16,
  },
  resetFullText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
  },
});
