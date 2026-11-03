import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  ScrollView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useTheme } from '../theme/useTheme';
import { FONTS } from '../theme/typography';
import { DotMatrixBackground } from '../components/common/DotMatrixBackground';
import { CadenceTabBar, NavTab } from '../navigation/CadenceTabBar';
import { RhythmSetupModal } from '../components/energy/RhythmSetupModal';
import { useAuthStore } from '../store/useAuthStore';
import { useEnergyStore } from '../store/useEnergyStore';
import { syncService } from '../services/syncService';

interface ProfileScreenProps {
  onNavigateTab?: (tab: NavTab) => void;
  onLongPressAi?: () => void;
  onOpenAuth?: () => void;
  onResetOnboarding?: () => void;
}

export const ProfileScreen: React.FC<ProfileScreenProps> = ({
  onNavigateTab,
  onLongPressAi,
  onOpenAuth,
  onResetOnboarding,
}) => {
  const { theme, isDark, toggleTheme } = useTheme();
  const { user, profile, signOut, status } = useAuthStore();
  const { activeRoutineAtom } = useEnergyStore();

  const [showRhythmModal, setShowRhythmModal] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  const isGuest = profile?.isGuest ?? (user?.user_metadata?.isGuest ?? false);
  const userEmail = user?.email || profile?.email || (isGuest ? 'Guest Explorer' : 'Signed In User');

  const chronotypeLabel =
    activeRoutineAtom?.chronotype === 'EARLY_BIRD'
      ? '🌅 Morning Lark'
      : activeRoutineAtom?.chronotype === 'NIGHT_OWL'
      ? '🌙 Night Owl'
      : '☀️ Intermediate (Third Bird)';

  const handleSyncAll = async () => {
    setIsSyncing(true);
    try {
      await syncService.syncAll();
    } catch (e) {
      console.warn('Sync error:', e);
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <DotMatrixBackground />

      <SafeAreaView style={styles.safeArea}>
        {/* Top Header */}
        <View style={styles.topHeaderRow}>
          <Text style={[styles.screenHeading, { color: theme.text, fontFamily: FONTS.urbanistLight }]}>
            Profile
          </Text>

          <TouchableOpacity
            style={[
              styles.iconBtn,
              { backgroundColor: theme.primarySurface, borderColor: theme.border },
            ]}
            onPress={toggleTheme}
            activeOpacity={0.8}
          >
            <Text style={{ fontSize: 16 }}>{isDark ? '🌙' : '☀️'}</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* User Account Card */}
          <View
            style={[
              styles.card,
              { backgroundColor: theme.primarySurface, borderColor: theme.border },
            ]}
          >
            <View style={styles.userHeaderRow}>
              <View style={[styles.avatarCircle, { backgroundColor: theme.primaryOlive }]}>
                <Text style={styles.avatarText}>
                  {userEmail.charAt(0).toUpperCase()}
                </Text>
              </View>

              <View style={styles.userInfoCol}>
                <Text style={[styles.userNameText, { color: theme.text, fontFamily: FONTS.urbanistBold }]}>
                  {userEmail}
                </Text>
                <View style={styles.badgeRow}>
                  <View style={[styles.userBadge, { backgroundColor: isGuest ? '#334155' : '#14382B' }]}>
                    <Text style={[styles.userBadgeText, { color: isGuest ? '#94A3B8' : '#38E1B0' }]}>
                      {isGuest ? 'GUEST MODE' : 'AUTHENTICATED'}
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            {isGuest ? (
              <TouchableOpacity
                style={[styles.primaryActionBtn, { backgroundColor: theme.primaryOlive }]}
                onPress={onOpenAuth}
                activeOpacity={0.85}
              >
                <Text style={[styles.primaryActionBtnText, { fontFamily: FONTS.urbanistBold }]}>
                  Sign In or Create Account
                </Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[styles.signOutBtn, { borderColor: theme.border }]}
                onPress={signOut}
                activeOpacity={0.8}
              >
                <Text style={[styles.signOutBtnText, { color: '#F87171', fontFamily: FONTS.urbanistSemiBold }]}>
                  Sign Out
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Sleeping Habits & Chronotype Personalization Card */}
          <View
            style={[
              styles.card,
              { backgroundColor: theme.primarySurface, borderColor: theme.border },
            ]}
          >
            <View style={styles.cardTitleRow}>
              <View>
                <Text style={[styles.subBadge, { color: theme.primaryOlive, fontFamily: FONTS.urbanistBold }]}>
                  PERSONAL BIORHYTHM
                </Text>
                <Text style={[styles.cardTitle, { color: theme.text, fontFamily: FONTS.urbanistSemiBold }]}>
                  Sleeping Habits & Routine
                </Text>
              </View>

              <TouchableOpacity
                style={[styles.editPill, { backgroundColor: theme.secondarySurface, borderColor: theme.border }]}
                onPress={() => setShowRhythmModal(true)}
                activeOpacity={0.8}
              >
                <Text style={[styles.editPillText, { color: theme.primaryOlive, fontFamily: FONTS.urbanistBold }]}>
                  Edit ⚙️
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.habitsGrid}>
              <View style={[styles.habitItem, { backgroundColor: theme.secondarySurface }]}>
                <Text style={[styles.habitLabel, { color: theme.secondaryText }]}>Chronotype</Text>
                <Text style={[styles.habitValue, { color: theme.text, fontFamily: FONTS.urbanistBold }]}>
                  {chronotypeLabel}
                </Text>
              </View>

              <View style={[styles.habitItem, { backgroundColor: theme.secondarySurface }]}>
                <Text style={[styles.habitLabel, { color: theme.secondaryText }]}>Wake Time</Text>
                <Text style={[styles.habitValue, { color: theme.text, fontFamily: FONTS.dotoBold }]}>
                  {activeRoutineAtom?.wakeTime || '06:30'}
                </Text>
              </View>

              <View style={[styles.habitItem, { backgroundColor: theme.secondarySurface }]}>
                <Text style={[styles.habitLabel, { color: theme.secondaryText }]}>Bedtime</Text>
                <Text style={[styles.habitValue, { color: theme.text, fontFamily: FONTS.dotoBold }]}>
                  {activeRoutineAtom?.sleepTime || '22:30'}
                </Text>
              </View>

              <View style={[styles.habitItem, { backgroundColor: theme.secondarySurface }]}>
                <Text style={[styles.habitLabel, { color: theme.secondaryText }]}>Afternoon Slump</Text>
                <Text style={[styles.habitValue, { color: theme.text, fontFamily: FONTS.dotoBold }]}>
                  13:00 – 15:00
                </Text>
              </View>

              <View style={[styles.habitItem, { backgroundColor: theme.secondarySurface }]}>
                <Text style={[styles.habitLabel, { color: theme.secondaryText }]}>Second Wind</Text>
                <Text style={[styles.habitValue, { color: theme.text, fontFamily: FONTS.dotoBold }]}>
                  {activeRoutineAtom?.secondWindStart || '16:30'} – {activeRoutineAtom?.secondWindEnd || '18:00'}
                </Text>
              </View>

              <View style={[styles.habitItem, { backgroundColor: theme.secondarySurface }]}>
                <Text style={[styles.habitLabel, { color: theme.secondaryText }]}>Caffeine Cutoff</Text>
                <Text style={[styles.habitValue, { color: theme.text, fontFamily: FONTS.dotoBold }]}>
                  {activeRoutineAtom?.caffeineCutoff || '14:00'}
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={[styles.customizeHabitsBtn, { backgroundColor: theme.primaryOlive }]}
              onPress={() => setShowRhythmModal(true)}
              activeOpacity={0.85}
            >
              <Text style={[styles.customizeHabitsBtnText, { fontFamily: FONTS.urbanistBold }]}>
                Update My Sleep & Energy Parameters
              </Text>
            </TouchableOpacity>
          </View>

          {/* Sync All Devices Card */}
          <View
            style={[
              styles.card,
              { backgroundColor: theme.primarySurface, borderColor: theme.border },
            ]}
          >
            <Text style={[styles.cardTitle, { color: theme.text, fontFamily: FONTS.urbanistSemiBold }]}>
              Device Integrations
            </Text>
            <Text style={[styles.cardSubtitle, { color: theme.secondaryText, fontFamily: FONTS.urbanistRegular }]}>
              Health Connect, Google Calendar & Biometrics
            </Text>

            <TouchableOpacity
              style={[styles.syncBtn, { backgroundColor: theme.secondarySurface, borderColor: theme.border }]}
              onPress={handleSyncAll}
              disabled={isSyncing}
              activeOpacity={0.8}
            >
              {isSyncing ? (
                <ActivityIndicator size="small" color={theme.primaryOlive} />
              ) : (
                <Text style={[styles.syncBtnText, { color: theme.text, fontFamily: FONTS.urbanistSemiBold }]}>
                  🔄 Sync All Integrations Now
                </Text>
              )}
            </TouchableOpacity>

            {onResetOnboarding && (
              <TouchableOpacity
                style={styles.onboardingResetLink}
                onPress={onResetOnboarding}
                activeOpacity={0.7}
              >
                <Text style={[styles.onboardingResetText, { color: theme.secondaryText }]}>
                  Restart Onboarding & Device Setup →
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </ScrollView>

        {/* Floating Bottom Tab Bar */}
        <CadenceTabBar
          activeTab="Profile"
          onSelectTab={onNavigateTab || (() => {})}
          onLongPressAi={onLongPressAi}
        />

        {/* Chronotype & Sleeping Habits Setup Modal */}
        <RhythmSetupModal
          visible={showRhythmModal}
          onClose={() => setShowRhythmModal(false)}
        />
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 28) + 8 : 0,
  },
  topHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
  },
  screenHeading: {
    fontSize: 32,
  },
  iconBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 110,
    gap: 16,
  },
  card: {
    borderRadius: 22,
    borderWidth: 1,
    padding: 18,
  },
  userHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 16,
  },
  avatarCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0A0B0D',
  },
  userInfoCol: {
    flex: 1,
  },
  userNameText: {
    fontSize: 16,
    marginBottom: 4,
  },
  badgeRow: {
    flexDirection: 'row',
  },
  userBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  userBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
  },
  primaryActionBtn: {
    height: 46,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryActionBtnText: {
    color: '#0A0B0D',
    fontSize: 15,
  },
  signOutBtn: {
    height: 44,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  signOutBtnText: {
    fontSize: 14,
  },
  cardTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  subBadge: {
    fontSize: 10.5,
    letterSpacing: 1.2,
    marginBottom: 2,
  },
  cardTitle: {
    fontSize: 17,
  },
  cardSubtitle: {
    fontSize: 13,
    marginTop: 2,
    marginBottom: 14,
  },
  editPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
  },
  editPillText: {
    fontSize: 12,
  },
  habitsGrid: {
    gap: 8,
    marginBottom: 16,
  },
  habitItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
  },
  habitLabel: {
    fontSize: 13,
  },
  habitValue: {
    fontSize: 13,
  },
  customizeHabitsBtn: {
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  customizeHabitsBtnText: {
    color: '#0A0B0D',
    fontSize: 14,
  },
  syncBtn: {
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  syncBtnText: {
    fontSize: 14,
  },
  onboardingResetLink: {
    marginTop: 14,
    alignItems: 'center',
  },
  onboardingResetText: {
    fontSize: 12.5,
  },
});
