import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  TextInput,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useThemeStore } from '../../src/store/themeStore';
import { useUserStore, CoachStyle } from '../../src/store/userStore';
import { MetallicCard } from '../../src/components/MetallicCard';
import { ACCENT_PRESETS } from '../../src/constants/theme';

export default function ProfileScreen() {
  const { theme, themeName, accentColor, setTheme, setAccentColor } = useThemeStore();
  const { profile, settings, updateSettings, setProfile } = useUserStore();
  
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [editName, setEditName] = useState(profile?.name || '');
  const [editWeight, setEditWeight] = useState(profile?.weight?.toString() || '');
  const [editHeight, setEditHeight] = useState(profile?.height?.toString() || '');
  
  const handleSaveProfile = () => {
    if (profile) {
      setProfile({
        ...profile,
        name: editName,
        weight: parseFloat(editWeight) || profile.weight,
        height: parseFloat(editHeight) || profile.height,
      });
    }
    setShowEditProfile(false);
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
            Profile
          </Text>
          <Text style={[styles.headerSubtitle, { color: theme.colors.textSecondary }]}>
            System Configuration
          </Text>
        </View>
        
        {/* User Stats */}
        <TouchableOpacity onPress={() => setShowEditProfile(true)}>
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
                  {profile?.height}cm
                </Text>
                <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
                  Height
                </Text>
              </View>
              <View style={[styles.statDivider, { backgroundColor: theme.colors.cardBorder }]} />
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: theme.colors.textPrimary }]}>
                  {profile?.weight}kg
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
          <TouchableOpacity onPress={() => setShowColorPicker(true)}>
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
      
      {/* Color Picker Modal */}
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
                    <Ionicons name="checkmark" size={24} color="#FFFFFF" />
                  )}
                </TouchableOpacity>
              ))}
            </View>
            <Text style={[styles.colorNote, { color: theme.colors.textMuted }]}>
              Changes apply to highlights, glows, and accents throughout the app
            </Text>
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
            
            <View style={styles.inputRow}>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={[styles.inputLabel, { color: theme.colors.textSecondary }]}>
                  Height (cm)
                </Text>
                <TextInput
                  style={[
                    styles.textInput,
                    { backgroundColor: theme.colors.backgroundSecondary, color: theme.colors.textPrimary },
                  ]}
                  value={editHeight}
                  onChangeText={setEditHeight}
                  keyboardType="numeric"
                  placeholder="178"
                  placeholderTextColor={theme.colors.textMuted}
                />
              </View>
              <View style={{ width: 16 }} />
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={[styles.inputLabel, { color: theme.colors.textSecondary }]}>
                  Weight (kg)
                </Text>
                <TextInput
                  style={[
                    styles.textInput,
                    { backgroundColor: theme.colors.backgroundSecondary, color: theme.colors.textPrimary },
                  ]}
                  value={editWeight}
                  onChangeText={setEditWeight}
                  keyboardType="numeric"
                  placeholder="75"
                  placeholderTextColor={theme.colors.textMuted}
                />
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
    fontSize: 32,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 14,
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
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
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
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
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
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    justifyContent: 'center',
  },
  colorOption: {
    width: 56,
    height: 56,
    borderRadius: 28,
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
