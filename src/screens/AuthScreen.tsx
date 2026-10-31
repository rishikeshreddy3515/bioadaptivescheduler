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
} from 'react-native';
import { useAuthStore } from '../store/useAuthStore';
import { isSupabaseConfigured } from '../api/supabaseClient';

export const AuthScreen: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
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
        // If not already authenticated, immediately sign in with password to avoid web confirmation
        if (useAuthStore.getState().status !== 'authenticated') {
          await signInWithPassword(trimmedEmail, password);
        }
      }
    } else {
      await signInWithPassword(trimmedEmail, password);
    }
  };

  const handleGoogleSignIn = async () => {
    clearError();
    setNoticeMessage(null);
    await signInWithGoogle();
  };

  const toggleMode = () => {
    clearError();
    setNoticeMessage(null);
    setIsSignUp((prev) => !prev);
  };

  const hasConfig = isSupabaseConfigured();

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.keyboardContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <View style={styles.headerContainer}>
            <View style={styles.headerTopRow}>
              <View style={styles.badgeContainer}>
                <Text style={styles.badgeText}>LIFESTACK</Text>
              </View>

              <TouchableOpacity
                style={styles.closeBackBtn}
                onPress={signInAsGuest}
                activeOpacity={0.7}
              >
                <Text style={styles.closeBackText}>✕ Close</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.title}>
              {isSignUp ? 'Create your account' : 'Welcome back'}
            </Text>
            <Text style={styles.subtitle}>
              {isSignUp
                ? 'Sign up to start planning your schedule around your energy.'
                : 'Sign in to access your calendar, tasks, and circadian rhythms.'}
            </Text>
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

          {/* Input Form */}
          <View style={styles.formContainer}>
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

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Password</Text>
              <TextInput
                style={styles.input}
                placeholder="••••••••"
                placeholderTextColor="#64748B"
                value={password}
                onChangeText={(text) => {
                  if (error) clearError();
                  setPassword(text);
                }}
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
                editable={!isLoading}
              />
            </View>

            {/* Email Submit Button */}
            <TouchableOpacity
              style={[styles.primaryButton, isLoading && styles.buttonDisabled]}
              onPress={handleAuthAction}
              disabled={isLoading}
              activeOpacity={0.8}
            >
              {isLoading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.primaryButtonText}>
                  {isSignUp ? 'Create Account' : 'Sign In'}
                </Text>
              )}
            </TouchableOpacity>

            {/* Divider */}
            <View style={styles.dividerContainer}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>OR</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Google OAuth Button (Section 3.3.A) */}
            <TouchableOpacity
              style={[styles.googleButton, isLoading && styles.buttonDisabled]}
              onPress={handleGoogleSignIn}
              disabled={isLoading}
              activeOpacity={0.8}
            >
              <View style={styles.googleIconContainer}>
                <Text style={styles.googleIconText}>G</Text>
              </View>
              <Text style={styles.googleButtonText}>Sign in with Google</Text>
            </TouchableOpacity>

            {/* Guest Login Option (Instant bypass) */}
            <TouchableOpacity
              style={[styles.guestButton, isLoading && styles.buttonDisabled]}
              onPress={signInAsGuest}
              disabled={isLoading}
              activeOpacity={0.8}
            >
              <Text style={styles.guestButtonText}>⚡ Continue as Guest (Skip Sign In)</Text>
            </TouchableOpacity>

            {/* Toggle Mode */}
            <View style={styles.switchContainer}>
              <Text style={styles.switchPromptText}>
                {isSignUp ? 'Already have an account?' : "Don't have an account yet?"}
              </Text>
              <TouchableOpacity onPress={toggleMode} disabled={isLoading}>
                <Text style={styles.switchActionText}>
                  {isSignUp ? ' Sign In' : ' Create Account'}
                </Text>
              </TouchableOpacity>
            </View>
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
  },
  keyboardContainer: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 36,
  },
  headerContainer: {
    marginBottom: 28,
  },
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  closeBackBtn: {
    backgroundColor: '#1E293B',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#334155',
  },
  closeBackText: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '600',
  },
  badgeContainer: {
    alignSelf: 'flex-start',
    backgroundColor: '#1E293B',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#334155',
  },
  badgeText: {
    color: '#38BDF8',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#F8FAFC',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: '#94A3B8',
    lineHeight: 22,
  },
  warningBanner: {
    backgroundColor: 'rgba(234, 179, 8, 0.12)',
    borderWidth: 1,
    borderColor: '#EAB308',
    borderRadius: 10,
    padding: 14,
    marginBottom: 20,
  },
  warningTitle: {
    color: '#FDE047',
    fontWeight: '700',
    fontSize: 14,
    marginBottom: 4,
  },
  warningText: {
    color: '#FEF08A',
    fontSize: 13,
    lineHeight: 18,
  },
  errorBanner: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderWidth: 1,
    borderColor: '#EF4444',
    borderRadius: 10,
    padding: 14,
    marginBottom: 20,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  errorTextContainer: {
    flex: 1,
    marginRight: 12,
  },
  errorTitle: {
    color: '#F87171',
    fontWeight: '700',
    fontSize: 13,
    marginBottom: 2,
  },
  errorMessage: {
    color: '#FCA5A5',
    fontSize: 13,
    lineHeight: 18,
  },
  dismissButton: {
    padding: 4,
  },
  dismissText: {
    color: '#F87171',
    fontSize: 16,
    fontWeight: '700',
  },
  noticeBanner: {
    backgroundColor: 'rgba(34, 197, 94, 0.12)',
    borderWidth: 1,
    borderColor: '#22C55E',
    borderRadius: 10,
    padding: 14,
    marginBottom: 20,
  },
  noticeText: {
    color: '#86EFAC',
    fontSize: 13,
    lineHeight: 18,
  },
  formContainer: {
    gap: 16,
  },
  inputGroup: {
    gap: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#CBD5E1',
  },
  input: {
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#F8FAFC',
  },
  primaryButton: {
    backgroundColor: '#3B82F6',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 4,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#334155',
  },
  dividerText: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '700',
    paddingHorizontal: 12,
    letterSpacing: 0.8,
  },
  googleButton: {
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 10,
    paddingVertical: 13,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  googleIconContainer: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#EA4335',
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleIconText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 13,
  },
  googleButtonText: {
    color: '#F8FAFC',
    fontSize: 15,
    fontWeight: '600',
  },
  guestButton: {
    backgroundColor: '#1E293B',
    borderWidth: 1.5,
    borderColor: '#38BDF8',
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  guestButtonText: {
    color: '#38BDF8',
    fontSize: 15,
    fontWeight: '700',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  switchPromptText: {
    color: '#94A3B8',
    fontSize: 14,
  },
  switchActionText: {
    color: '#38BDF8',
    fontSize: 14,
    fontWeight: '700',
  },
});
