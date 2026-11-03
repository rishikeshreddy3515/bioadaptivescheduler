import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { useAuthStore } from '../store/useAuthStore';
import { supabase, isSupabaseConfigured } from '../api/supabaseClient';
import { storage, STORAGE_KEYS } from '../utils/storage';

interface AuthScreenProps {
  onAuthSuccess?: (hasCompletedOnboarding: boolean) => void;
  onClose?: () => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ onAuthSuccess, onClose }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [noticeMessage, setNoticeMessage] = useState<string | null>(null);

  const {
    signInWithPassword,
    signUpWithPassword,
    signInWithGoogle,
    signInAsGuest,
    isLoading,
    error,
    clearError,
    setError,
  } = useAuthStore();

  const isSignUp = authMode === 'signup';

  const verifyOnboardingAndProceed = async () => {
    const activeUser = useAuthStore.getState().user;
    let hasCompleted = false;

    if (activeUser?.id && isSupabaseConfigured() && !useAuthStore.getState().profile?.isGuest) {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('has_completed_onboarding')
          .eq('id', activeUser.id)
          .maybeSingle();

        if (data && !error) {
          hasCompleted = Boolean(data.has_completed_onboarding);
        }
      } catch (err) {
        console.warn('[AuthScreen] Error checking profiles.has_completed_onboarding:', err);
      }
    } else {
      const localCompleted = await storage.get<boolean>(STORAGE_KEYS.hasCompletedOnboarding);
      hasCompleted = Boolean(localCompleted);
    }

    await storage.set(STORAGE_KEYS.hasCompletedOnboarding, hasCompleted);
    useAuthStore.setState((prev) => ({
      profile: prev.profile
        ? { ...prev.profile, has_completed_onboarding: hasCompleted }
        : null,
    }));

    onAuthSuccess?.(hasCompleted);
  };

  const handleAuthAction = async () => {
    clearError();
    setNoticeMessage(null);

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setError('Please enter a valid email address.');
      return;
    }

    if (!password || password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    if (isSignUp) {
      const { error: signUpError } = await signUpWithPassword(trimmedEmail, password);
      if (!signUpError) {
        if (useAuthStore.getState().status !== 'authenticated') {
          await signInWithPassword(trimmedEmail, password);
        }
      }
    } else {
      await signInWithPassword(trimmedEmail, password);
    }

    if (useAuthStore.getState().status === 'authenticated') {
      await verifyOnboardingAndProceed();
    }
  };

  const handleGoogleSignIn = async () => {
    clearError();
    setNoticeMessage(null);
    await signInWithGoogle();
    if (useAuthStore.getState().status === 'authenticated') {
      await verifyOnboardingAndProceed();
    }
  };

  const handleDemoSignIn = async () => {
    clearError();
    setNoticeMessage(null);
    await signInAsGuest();
    await verifyOnboardingAndProceed();
  };

  const switchMode = (mode: 'signin' | 'signup') => {
    clearError();
    setNoticeMessage(null);
    setAuthMode(mode);
  };

  const hasConfig = isSupabaseConfigured();

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" />
      <KeyboardAvoidingView
        style={styles.keyboardContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.headerContainer}>
            <View style={styles.headerTopRow}>
              <View style={styles.badgeContainer}>
                <Text style={styles.badgeText}>LIFESTACK · CADENCE</Text>
              </View>

              <TouchableOpacity
                style={styles.closeBackBtn}
                onPress={onClose || handleDemoSignIn}
                activeOpacity={0.7}
              >
                <Text style={styles.closeBackText}>✕ Close</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.title}>
              {isSignUp ? 'Create account' : 'Welcome back'}
            </Text>
            <Text style={styles.subtitle}>
              {isSignUp
                ? 'Sign up to personalize your circadian energy curve.'
                : 'Sign in to access your synchronized schedule & rhythms.'}
            </Text>
          </View>

          {/* Sorted Segmented Tab Control: Sign In vs Create Account */}
          <View style={styles.segmentedControlWrapper}>
            <TouchableOpacity
              style={[
                styles.segmentTab,
                !isSignUp && styles.segmentTabActive,
              ]}
              onPress={() => switchMode('signin')}
              activeOpacity={0.85}
            >
              <Text style={[styles.segmentTabText, !isSignUp && styles.segmentTabTextActive]}>
                Sign In
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.segmentTab,
                isSignUp && styles.segmentTabActive,
              ]}
              onPress={() => switchMode('signup')}
              activeOpacity={0.85}
            >
              <Text style={[styles.segmentTabText, isSignUp && styles.segmentTabTextActive]}>
                Create Account
              </Text>
            </TouchableOpacity>
          </View>

          {/* Configuration Warning Banner if .env is missing keys */}
          {!hasConfig && (
            <View style={styles.warningBanner}>
              <Text style={styles.warningTitle}>⚠️ Supabase Configuration Required</Text>
              <Text style={styles.warningText}>
                Please configure EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY in your .env file.
              </Text>
            </View>
          )}

          {/* Error Message Banner */}
          {error && (
            <View style={styles.errorBanner}>
              <View style={styles.errorTextContainer}>
                <Text style={styles.errorTitle}>Authentication Error</Text>
                <Text style={styles.errorMessage}>{error}</Text>
              </View>
              <TouchableOpacity onPress={clearError} style={styles.dismissButton}>
                <Text style={styles.dismissText}>✕</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Success / Notice Banner */}
          {noticeMessage && (
            <View style={styles.noticeBanner}>
              <Text style={styles.noticeText}>{noticeMessage}</Text>
            </View>
          )}

          {/* Form Card */}
          <View style={styles.formContainer}>
            {/* 1. Leading One-Tap Option: Continue with Google */}
            <TouchableOpacity
              style={[styles.googleButton, isLoading && styles.buttonDisabled]}
              onPress={handleGoogleSignIn}
              disabled={isLoading}
              activeOpacity={0.85}
            >
              <View style={styles.googleIconContainer}>
                <Text style={styles.googleIconText}>G</Text>
              </View>
              <Text style={styles.googleButtonText}>Continue with Google</Text>
            </TouchableOpacity>

            {/* Divider */}
            <View style={styles.dividerContainer}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>OR WITH EMAIL</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Email Field */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email Address</Text>
              <TextInput
                style={styles.input}
                placeholder="name@example.com"
                placeholderTextColor="#64748B"
                value={email}
                onChangeText={(text) => {
                  if (error) clearError();
                  setEmail(text);
                }}
                autoCapitalize="none"
                keyboardType="email-address"
                autoCorrect={false}
                editable={!isLoading}
              />
            </View>

            {/* Password Field */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Password</Text>
              <View style={styles.passwordInputWrapper}>
                <TextInput
                  style={styles.passwordInput}
                  placeholder="••••••••"
                  placeholderTextColor="#64748B"
                  value={password}
                  onChangeText={(text) => {
                    if (error) clearError();
                    setPassword(text);
                  }}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!isLoading}
                />
                <TouchableOpacity
                  style={styles.eyeToggleBtn}
                  onPress={() => setShowPassword((prev) => !prev)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.eyeToggleText}>{showPassword ? 'Hide' : 'Show'}</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Primary Action Button (Sign In or Create Account) */}
            <TouchableOpacity
              style={[styles.primaryButton, isLoading && styles.buttonDisabled]}
              onPress={handleAuthAction}
              disabled={isLoading}
              activeOpacity={0.85}
            >
              {isLoading ? (
                <ActivityIndicator color="#0A0B0D" />
              ) : (
                <Text style={styles.primaryButtonText}>
                  {isSignUp ? 'Create My Account' : 'Sign In'}
                </Text>
              )}
            </TouchableOpacity>

            {/* Divider */}
            <View style={styles.dividerContainer}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>OR EXPLORE OFFLINE</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* 3. Sorted Option: One-tap Demo Account */}
            <TouchableOpacity
              style={[styles.demoButton, isLoading && styles.buttonDisabled]}
              onPress={handleDemoSignIn}
              disabled={isLoading}
              activeOpacity={0.85}
            >
              <Text style={styles.demoButtonIcon}>✨</Text>
              <Text style={styles.demoButtonText}>Continue with Demo Account</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0F172A',
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 28) + 8 : 0,
  },
  keyboardContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 48,
  },
  headerContainer: {
    marginBottom: 20,
  },
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  badgeContainer: {
    backgroundColor: '#1E293B',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  badgeText: {
    color: '#38E1B0',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.4,
  },
  closeBackBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: '#1E293B',
  },
  closeBackText: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '600',
  },
  title: {
    fontSize: 30,
    fontWeight: '700',
    color: '#F8FAFC',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: '#94A3B8',
    lineHeight: 20,
  },
  segmentedControlWrapper: {
    flexDirection: 'row',
    backgroundColor: '#1E293B',
    borderRadius: 14,
    padding: 4,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#334155',
  },
  segmentTab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
  },
  segmentTabActive: {
    backgroundColor: '#38E1B0',
  },
  segmentTabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#94A3B8',
  },
  segmentTabTextActive: {
    color: '#0A0B0D',
    fontWeight: '700',
  },
  warningBanner: {
    backgroundColor: '#78350F',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },
  warningTitle: {
    color: '#FDE68A',
    fontWeight: '700',
    fontSize: 13,
    marginBottom: 4,
  },
  warningText: {
    color: '#FDE68A',
    fontSize: 12,
  },
  errorBanner: {
    backgroundColor: '#7F1D1D',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  errorTextContainer: {
    flex: 1,
  },
  errorTitle: {
    color: '#FECACA',
    fontWeight: '700',
    fontSize: 13,
    marginBottom: 2,
  },
  errorMessage: {
    color: '#FCA5A5',
    fontSize: 12,
  },
  dismissButton: {
    padding: 6,
  },
  dismissText: {
    color: '#FECACA',
    fontSize: 14,
    fontWeight: '700',
  },
  noticeBanner: {
    backgroundColor: '#064E3B',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },
  noticeText: {
    color: '#A7F3D0',
    fontSize: 13,
  },
  formContainer: {
    gap: 16,
  },
  inputGroup: {
    gap: 6,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: '#CBD5E1',
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: '#1E293B',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#334155',
    paddingHorizontal: 16,
    height: 52,
    color: '#FFFFFF',
    fontSize: 15,
  },
  passwordInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#334155',
    height: 52,
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: 16,
    color: '#FFFFFF',
    fontSize: 15,
  },
  eyeToggleBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  eyeToggleText: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '600',
  },
  primaryButton: {
    backgroundColor: '#38E1B0',
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
    shadowColor: '#38E1B0',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 4,
  },
  primaryButtonText: {
    color: '#0A0B0D',
    fontSize: 16,
    fontWeight: '700',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 12,
    gap: 10,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#334155',
  },
  dividerText: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    height: 52,
    borderRadius: 14,
    gap: 10,
  },
  googleIconContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#4285F4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleIconText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 14,
  },
  googleButtonText: {
    color: '#0F172A',
    fontSize: 15,
    fontWeight: '700',
  },
  demoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1E293B',
    height: 50,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(56, 225, 176, 0.4)',
    gap: 8,
  },
  demoButtonIcon: {
    fontSize: 16,
  },
  demoButtonText: {
    color: '#38E1B0',
    fontSize: 14,
    fontWeight: '600',
  },
  guestLinkBtn: {
    alignItems: 'center',
    paddingVertical: 10,
    marginTop: 4,
  },
  guestLinkText: {
    color: '#64748B',
    fontSize: 13,
  },
});
