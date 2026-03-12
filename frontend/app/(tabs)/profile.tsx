import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  TextInput,
  Modal,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import { useThemeStore, formatWeight, formatHeight } from '../../src/store/themeStore';
import { WheelPicker } from '../../src/components/WheelPicker';
import { useUserStore, CoachStyle } from '../../src/store/userStore';
import { MetallicCard } from '../../src/components/MetallicCard';
import { ACCENT_PRESETS } from '../../src/constants/theme';
import ColorPicker, { Panel5, BrightnessSlider, Preview } from 'reanimated-color-picker';

export default function ProfileScreen() {
  const { theme, themeName, accentColor, unitSystem, setTheme, setAccentColor, setUnitSystem } = useThemeStore();
  const { profile, settings, updateSettings, setProfile, gender, setGender } = useUserStore();
  
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [editName, setEditName] = useState(profile?.name || '');
  const [editWeight, setEditWeight] = useState(profile?.weight?.toString() || '');
  const [editHeight, setEditHeight] = useState(profile?.height?.toString() || '');
  const [editGender, setEditGender] = useState<'male' | 'female'>(gender || 'male');
  const [pickerColor, setPickerColor] = useState(accentColor);
  
  // Scroll wheel picker states
  const [pickerHeightCm, setPickerHeightCm] = useState(profile?.height || 178);
  const [pickerHeightFt, setPickerHeightFt] = useState(5);
  const [pickerHeightIn, setPickerHeightIn] = useState(10);
  const [pickerWeightKg, setPickerWeightKg] = useState(profile?.weight || 75);
  const [pickerWeightLbs, setPickerWeightLbs] = useState(165);
  
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
      setPickerHeightFt(Math.floor(totalInches / 12));
      setPickerHeightIn(totalInches % 12);
      setPickerWeightLbs(Math.round(weightKg * 2.20462 / 5) * 5);
    } else {
      setPickerHeightCm(Math.round(heightCm));
      setPickerWeightKg(Math.round(weightKg));
    }
    
    setEditWeight(weightKg.toString());
    setEditHeight(heightCm.toString());
    setShowEditProfile(true);
  };

  const handleSaveProfile = () => {
    if (profile) {
      const isImperial = unitSystem === 'imperial';
      let saveWeight: number;
      let saveHeight: number;
      
      if (isImperial) {
        // Convert imperial picker values back to metric for storage
        saveHeight = Math.round((pickerHeightFt * 12 + pickerHeightIn) * 2.54);
        saveWeight = Math.round(pickerWeightLbs / 2.20462 * 10) / 10;
      } else {
        saveHeight = pickerHeightCm;
        saveWeight = pickerWeightKg;
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
  
  const coachStyles: { key: CoachStyle; label: string; desc: string }[] = [
    { key: 'neutral', label: 'Neutral', desc: 'Professional & balanced' },
    { key: 'direct', label: 'Direct', desc: 'Short & performance-focused' },
    { key: 'supportive', label: 'Supportive', desc: 'Encouraging & motivating' },
  ];
  
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: '#000000' }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: '#ffffff' }]}>
            Profile
          </Text>
          <Text style={[styles.headerSubtitle, { color: '#555555' }]}>
            SETTINGS
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
                <Ionicons name="moon" size={22} color={accentColor} />
                <Text style={[styles.settingLabel, { color: theme.colors.textPrimary }]}>
                  Dark Metallic
                </Text>
              </View>
              <Switch
                value={themeName === 'dark'}
                onValueChange={(value) => setTheme(value ? 'dark' : 'light')}
                trackColor={{ false: theme.colors.metallic, true: accentColor + '60' }}
                thumbColor={themeName === 'dark' ? accentColor : theme.colors.metallicLight}
              />
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
          
          {/* Unit System Toggle */}
          <MetallicCard style={styles.settingCard}>
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Ionicons name="resize" size={22} color={accentColor} />
                <View>
                  <Text style={[styles.settingLabel, { color: theme.colors.textPrimary }]}>
                    Units
                  </Text>
                </View>
              </View>
              <View style={styles.unitToggleContainer}>
                <TouchableOpacity
                  style={[
                    styles.unitOption,
                    unitSystem === 'metric' && { backgroundColor: accentColor + '25', borderColor: accentColor },
                  ]}
                  onPress={() => setUnitSystem('metric')}
                >
                  <Text style={[
                    styles.unitOptionText,
                    { color: unitSystem === 'metric' ? accentColor : theme.colors.textSecondary },
                  ]}>
                    METRIC
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.unitOption,
                    unitSystem === 'imperial' && { backgroundColor: accentColor + '25', borderColor: accentColor },
                  ]}
                  onPress={() => setUnitSystem('imperial')}
                >
                  <Text style={[
                    styles.unitOptionText,
                    { color: unitSystem === 'imperial' ? accentColor : theme.colors.textSecondary },
                  ]}>
                    IMPERIAL
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </MetallicCard>
        </View>
        
        {/* Coach Settings */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>
            Coach Settings
          </Text>
          
          {/* Coach Style */}
          <MetallicCard style={styles.coachStyleCard}>
            <Text style={[styles.coachStyleLabel, { color: theme.colors.textSecondary }]}>
              Communication Style
            </Text>
            <View style={styles.coachStyleOptions}>
              {coachStyles.map((style) => (
                <TouchableOpacity
                  key={style.key}
                  style={[
                    styles.coachStyleOption,
                    {
                      backgroundColor:
                        settings.coachStyle === style.key
                          ? accentColor + '20'
                          : 'transparent',
                      borderColor:
                        settings.coachStyle === style.key
                          ? accentColor
                          : theme.colors.cardBorder,
                    },
                  ]}
                  onPress={() => updateSettings({ coachStyle: style.key })}
                >
                  <Text
                    style={[
                      styles.coachStyleName,
                      {
                        color:
                          settings.coachStyle === style.key
                            ? accentColor
                            : theme.colors.textPrimary,
                      },
                    ]}
                  >
                    {style.label}
                  </Text>
                  <Text style={[styles.coachStyleDesc, { color: theme.colors.textMuted }]}>
                    {style.desc}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </MetallicCard>
          
          {/* Voice Settings */}
          <MetallicCard style={styles.settingCard}>
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Ionicons name="volume-high" size={22} color={accentColor} />
                <Text style={[styles.settingLabel, { color: theme.colors.textPrimary }]}>
                  Voice Responses
                </Text>
              </View>
              <Switch
                value={settings.voiceEnabled}
                onValueChange={(value) => updateSettings({ voiceEnabled: value })}
                trackColor={{ false: theme.colors.metallic, true: accentColor + '60' }}
                thumbColor={settings.voiceEnabled ? accentColor : theme.colors.metallicLight}
              />
            </View>
          </MetallicCard>
          
          {/* Speech Speed - Only show when voice is enabled */}
          {settings.voiceEnabled && (
            <MetallicCard style={styles.settingCard}>
              <View style={styles.settingRow}>
                <View style={styles.settingInfo}>
                  <Ionicons name="speedometer" size={22} color={accentColor} />
                  <Text style={[styles.settingLabel, { color: theme.colors.textPrimary }]}>
                    Speech Speed
                  </Text>
                </View>
              </View>
              <View style={styles.speedOptionsRow}>
                {[
                  { label: 'Slow', value: 0.75 },
                  { label: 'Normal', value: 1.0 },
                  { label: 'Fast', value: 1.25 },
                  { label: '2x', value: 1.5 },
                ].map((opt) => (
                  <TouchableOpacity
                    key={opt.value}
                    style={[
                      styles.speedOption,
                      { borderColor: theme.colors.cardBorder },
                      (settings.speechRate || 1.0) === opt.value && {
                        borderColor: accentColor,
                        backgroundColor: accentColor + '15',
                      },
                    ]}
                    onPress={() => updateSettings({ speechRate: opt.value })}
                  >
                    <Text
                      style={[
                        styles.speedOptionText,
                        {
                          color:
                            (settings.speechRate || 1.0) === opt.value
                              ? accentColor
                              : theme.colors.textSecondary,
                        },
                      ]}
                    >
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </MetallicCard>
          )}
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
              <Switch
                value={settings.workoutReminders}
                onValueChange={(value) => updateSettings({ workoutReminders: value })}
                trackColor={{ false: theme.colors.metallic, true: accentColor + '60' }}
                thumbColor={settings.workoutReminders ? accentColor : theme.colors.metallicLight}
              />
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
              <Switch
                value={settings.recoveryAlerts}
                onValueChange={(value) => updateSettings({ recoveryAlerts: value })}
                trackColor={{ false: theme.colors.metallic, true: accentColor + '60' }}
                thumbColor={settings.recoveryAlerts ? accentColor : theme.colors.metallicLight}
              />
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
              <Switch
                value={settings.coachSuggestions}
                onValueChange={(value) => updateSettings({ coachSuggestions: value })}
                trackColor={{ false: theme.colors.metallic, true: accentColor + '60' }}
                thumbColor={settings.coachSuggestions ? accentColor : theme.colors.metallicLight}
              />
            </View>
          </MetallicCard>
        </View>
        
        {/* App Info */}
        <View style={styles.appInfo}>
          <Text style={[styles.appName, { color: theme.colors.textSecondary }]}>
            COACH
          </Text>
          <Text style={[styles.appVersion, { color: theme.colors.textMuted }]}>
            AI Fitness System v1.0.0
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
            
            {/* Height & Weight Scroll Wheels */}
            {unitSystem === 'imperial' ? (
              <>
                {/* Imperial Height: ft + in pickers */}
                <Text style={[styles.inputLabel, { color: theme.colors.textSecondary, marginBottom: 4 }]}>
                  Height (ft)
                </Text>
                <View style={styles.pickerRow}>
                  <View style={[styles.pickerContainer, { backgroundColor: theme.colors.backgroundSecondary, borderColor: theme.colors.cardBorder }]}>
                    <WheelPicker
                      data={[3, 4, 5, 6, 7].map((ft) => ({ label: `${ft} ft`, value: ft }))}
                      selectedValue={pickerHeightFt}
                      onValueChange={setPickerHeightFt}
                      selectedColor={theme.colors.textPrimary}
                      textColor={theme.colors.textMuted}
                      highlightColor={accentColor + '10'}
                    />
                  </View>
                  <View style={[styles.pickerContainer, { backgroundColor: theme.colors.backgroundSecondary, borderColor: theme.colors.cardBorder }]}>
                    <WheelPicker
                      data={Array.from({ length: 12 }, (_, i) => ({ label: `${i} in`, value: i }))}
                      selectedValue={pickerHeightIn}
                      onValueChange={setPickerHeightIn}
                      selectedColor={theme.colors.textPrimary}
                      textColor={theme.colors.textMuted}
                      highlightColor={accentColor + '10'}
                    />
                  </View>
                </View>
                
                {/* Imperial Weight: lbs picker */}
                <Text style={[styles.inputLabel, { color: theme.colors.textSecondary, marginTop: 16, marginBottom: 4 }]}>
                  Weight (lbs)
                </Text>
                <View style={[styles.pickerContainerFull, { backgroundColor: theme.colors.backgroundSecondary, borderColor: theme.colors.cardBorder }]}>
                  <WheelPicker
                    data={Array.from({ length: 65 }, (_, i) => {
                      const lbs = 80 + i * 5;
                      return { label: `${lbs} lbs`, value: lbs };
                    })}
                    selectedValue={pickerWeightLbs}
                    onValueChange={setPickerWeightLbs}
                    selectedColor={theme.colors.textPrimary}
                    textColor={theme.colors.textMuted}
                    highlightColor={accentColor + '10'}
                  />
                </View>
              </>
            ) : (
              <>
                {/* Metric Height: cm picker */}
                <Text style={[styles.inputLabel, { color: theme.colors.textSecondary, marginBottom: 4 }]}>
                  Height (cm)
                </Text>
                <View style={[styles.pickerContainerFull, { backgroundColor: theme.colors.backgroundSecondary, borderColor: theme.colors.cardBorder }]}>
                  <WheelPicker
                    data={Array.from({ length: 81 }, (_, i) => {
                      const cm = 140 + i;
                      return { label: `${cm} cm`, value: cm };
                    })}
                    selectedValue={pickerHeightCm}
                    onValueChange={setPickerHeightCm}
                    selectedColor={theme.colors.textPrimary}
                    textColor={theme.colors.textMuted}
                    highlightColor={accentColor + '10'}
                  />
                </View>
                
                {/* Metric Weight: kg picker */}
                <Text style={[styles.inputLabel, { color: theme.colors.textSecondary, marginTop: 16, marginBottom: 4 }]}>
                  Weight (kg)
                </Text>
                <View style={[styles.pickerContainerFull, { backgroundColor: theme.colors.backgroundSecondary, borderColor: theme.colors.cardBorder }]}>
                  <WheelPicker
                    data={Array.from({ length: 171 }, (_, i) => {
                      const kg = 30 + i;
                      return { label: `${kg} kg`, value: kg };
                    })}
                    selectedValue={pickerWeightKg}
                    onValueChange={setPickerWeightKg}
                    selectedColor={theme.colors.textPrimary}
                    textColor={theme.colors.textMuted}
                    highlightColor={accentColor + '10'}
                  />
                </View>
              </>
            )}
            
            <TouchableOpacity
              style={[styles.saveButton, { backgroundColor: accentColor }]}
              onPress={handleSaveProfile}
            >
              <Text style={styles.saveButtonText}>Save Changes</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
    marginBottom: 24,
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
    color: '#555555',
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
    gap: 12,
  },
  pickerContainer: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 0.5,
    overflow: 'hidden',
    height: 150,
  },
  pickerContainerFull: {
    borderRadius: 14,
    borderWidth: 0.5,
    overflow: 'hidden',
    height: 150,
  },
  picker: {
    height: 150,
    width: '100%',
    backgroundColor: 'transparent',
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
});
