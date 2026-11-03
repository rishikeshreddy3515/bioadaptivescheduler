import React, { useState, useEffect } from 'react';
import { StyleSheet, View, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as WebBrowser from 'expo-web-browser';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import {
  useFonts,
  Urbanist_300Light,
  Urbanist_400Regular,
  Urbanist_500Medium,
  Urbanist_600SemiBold,
  Urbanist_700Bold,
} from '@expo-google-fonts/urbanist';
import {
  Doto_400Regular,
  Doto_600SemiBold,
  Doto_700Bold,
} from '@expo-google-fonts/doto';

WebBrowser.maybeCompleteAuthSession();

import { useAuthStore } from './src/store/useAuthStore';
import { useSystemStore } from './src/store/useSystemStore';
import { useEnergyStore } from './src/store/useEnergyStore';
import { useTaskStore } from './src/store/useTaskStore';
import { useTheme } from './src/theme/useTheme';
import { STORAGE_KEYS, storage } from './src/utils/storage';
import { NavTab } from './src/navigation/CadenceTabBar';

// Screens
import { OnboardingScreen } from './src/screens/OnboardingScreen';
import { ConnectScreen } from './src/screens/ConnectScreen';
import { TodayScreen } from './src/screens/TodayScreen';
import { TasksScreen } from './src/screens/TasksScreen';
import { NewTaskScreen } from './src/screens/NewTaskScreen';
import { ReplanScreen } from './src/screens/ReplanScreen';
import { EnergyStatusScreen } from './src/screens/EnergyStatusScreen';
import { CircadianRhythmScreen } from './src/screens/CircadianRhythmScreen';
import { ProfileScreen } from './src/screens/ProfileScreen';
import { AuthScreen } from './src/screens/AuthScreen';
import { supabase, isSupabaseConfigured } from './src/api/supabaseClient';

// AI Trigger Modal
import { AskCadenceModal } from './src/components/ai/AskCadenceModal';

export default function App() {
  const { theme, isDark } = useTheme();
  const { initialize: initializeAuth } = useAuthStore();
  const { hydrate: hydrateSystem, setCurrentRouteName } = useSystemStore();
  const { hydrate: hydrateEnergy } = useEnergyStore();
  const { hydrate: hydrateTasks } = useTaskStore();

  const [fontsLoaded] = useFonts({
    Urbanist_300Light,
    Urbanist_400Regular,
    Urbanist_500Medium,
    Urbanist_600SemiBold,
    Urbanist_700Bold,
    Doto_400Regular,
    Doto_600SemiBold,
    Doto_700Bold,
  });

  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState<boolean | null>(null);
  const [currentTab, setCurrentTab] = useState<NavTab>('Today');
  const [showCircadianDetail, setShowCircadianDetail] = useState(false);
  const [showNewTaskModal, setShowNewTaskModal] = useState(false);
  const [showReplanModal, setShowReplanModal] = useState(false);
  const [replanReason, setReplanReason] = useState<string | undefined>(undefined);
  const [showAiModal, setShowAiModal] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);

  useEffect(() => {
    // Hydrate persistent stores
    hydrateSystem();
    hydrateEnergy();
    hydrateTasks();

    // Check onboarding completion from storage & Supabase
    storage.get<boolean>(STORAGE_KEYS.hasCompletedOnboarding).then((completed) => {
      setHasCompletedOnboarding(!!completed);
    });

    if (isSupabaseConfigured()) {
      supabase.auth.getUser().then(({ data }) => {
        if (data?.user) {
          supabase
            .from('profiles')
            .select('has_completed_onboarding')
            .eq('id', data.user.id)
            .maybeSingle()
            .then(({ data: profileData }) => {
              if (profileData && profileData.has_completed_onboarding !== undefined) {
                const isDone = Boolean(profileData.has_completed_onboarding);
                setHasCompletedOnboarding(isDone);
                storage.set(STORAGE_KEYS.hasCompletedOnboarding, isDone);
              }
            });
        }
      });
    }

    let unsubscribe: (() => void) | undefined;
    initializeAuth().then((cleanup) => {
      unsubscribe = cleanup;
    }).catch(() => {});

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [initializeAuth, hydrateSystem, hydrateEnergy, hydrateTasks]);

  useEffect(() => {
    if (hasCompletedOnboarding) {
      if (showNewTaskModal) setCurrentRouteName('NewTask');
      else if (showReplanModal) setCurrentRouteName('Replan');
      else if (currentTab === 'Energy' && showCircadianDetail) setCurrentRouteName('CircadianRhythm');
      else setCurrentRouteName(currentTab);
    } else {
      setCurrentRouteName('Connect');
    }
  }, [
    hasCompletedOnboarding,
    currentTab,
    showCircadianDetail,
    showNewTaskModal,
    showReplanModal,
    setCurrentRouteName,
  ]);

  const handleFinishOnboarding = () => {
    storage.set(STORAGE_KEYS.hasCompletedOnboarding, true);
    setHasCompletedOnboarding(true);
    useEnergyStore.getState().fetchRoutine();
    useEnergyStore.getState().fetchDailyBiometrics();
    useTaskStore.getState().fetchTasks();
  };

  const handleResetOnboarding = () => {
    storage.set(STORAGE_KEYS.hasCompletedOnboarding, false);
    setHasCompletedOnboarding(false);
    setCurrentTab('Today');
    setShowCircadianDetail(false);
    setShowNewTaskModal(false);
    setShowReplanModal(false);
  };

  const handleTabChange = (tab: NavTab) => {
    if (tab !== 'Energy') {
      setShowCircadianDetail(false);
    }
    setCurrentTab(tab);
  };

  if (!fontsLoaded || hasCompletedOnboarding === null) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primaryOlive} />
        <StatusBar style={isDark ? 'light' : 'dark'} />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={[styles.rootContainer, { backgroundColor: theme.background }]}>
      <BottomSheetModalProvider>
        <StatusBar style={isDark ? 'light' : 'dark'} />

        {!hasCompletedOnboarding ? (
          <OnboardingScreen onComplete={handleFinishOnboarding} />
        ) : (
          <View style={styles.appContainer}>
            {/* Screen 2: Today Dashboard */}
            {currentTab === 'Today' && (
              <TodayScreen
                onNavigateTab={handleTabChange}
                onAddTask={() => setShowNewTaskModal(true)}
                onReplan={() => setShowReplanModal(true)}
                onViewTasks={() => handleTabChange('Tasks')}
                onResetOnboarding={handleResetOnboarding}
                onLongPressAi={() => setShowAiModal(true)}
              />
            )}

            {/* Screen 6: Tasks & Backlog */}
            {currentTab === 'Tasks' && (
              <TasksScreen
                onAddTask={() => setShowNewTaskModal(true)}
                onNavigateTab={handleTabChange}
                onLongPressAi={() => setShowAiModal(true)}
              />
            )}

            {/* Screen 7: Circadian Rhythm Detail (Primary Energy Screen matching LifeStack Image 2) */}
            {currentTab === 'Energy' && (
              <CircadianRhythmScreen
                onBack={() => handleTabChange('Today')}
                onNavigateTab={handleTabChange}
                onLongPressAi={() => setShowAiModal(true)}
              />
            )}

            {/* Screen 8: Profile & Circadian Customization */}
            {currentTab === 'Profile' && (
              <ProfileScreen
                onNavigateTab={handleTabChange}
                onLongPressAi={() => setShowAiModal(true)}
                onOpenAuth={() => setShowAuthModal(true)}
                onResetOnboarding={handleResetOnboarding}
              />
            )}

            {/* Screen 3: New Task Modal */}
            {showNewTaskModal && (
              <View style={StyleSheet.absoluteFill}>
                <NewTaskScreen
                  onClose={() => setShowNewTaskModal(false)}
                  onScheduled={() => {
                    setShowNewTaskModal(false);
                  }}
                />
              </View>
            )}

            {/* Screen 4: AI Replan Modal */}
            {showReplanModal && (
              <View style={StyleSheet.absoluteFill}>
                <ReplanScreen
                  slipReason={replanReason || 'Design review ran 30 min over'}
                  onClose={() => {
                    setShowReplanModal(false);
                    setReplanReason(undefined);
                  }}
                  onApplyReplan={() => {
                    setShowReplanModal(false);
                    setReplanReason(undefined);
                  }}
                />
              </View>
            )}

            {/* Ask Cadence AI Bottom Sheet Modal */}
            <AskCadenceModal
              visible={showAiModal}
              onClose={() => setShowAiModal(false)}
              onReplanRequested={(reason) => {
                setReplanReason(reason);
                setShowReplanModal(true);
              }}
            />

            {/* Auth Modal Overlay */}
            {showAuthModal && (
              <View style={StyleSheet.absoluteFill}>
                <AuthScreen
                  onAuthSuccess={(completed) => {
                    setShowAuthModal(false);
                    setHasCompletedOnboarding(completed);
                    useEnergyStore.getState().fetchRoutine();
                    useEnergyStore.getState().fetchDailyBiometrics();
                    useTaskStore.getState().fetchTasks();
                    if (completed) {
                      setCurrentTab('Today');
                    }
                  }}
                  onClose={() => setShowAuthModal(false)}
                />
              </View>
            )}
          </View>
        )}
      </BottomSheetModalProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  rootContainer: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  appContainer: {
    flex: 1,
  },
});
