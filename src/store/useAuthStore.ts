import { create } from 'zustand';
import { Session, User } from '@supabase/supabase-js';
import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import * as Linking from 'expo-linking';
import { supabase, isSupabaseConfigured, getAuthRedirectUri } from '../api/supabaseClient';
import { storage, STORAGE_KEYS } from '../utils/storage';

WebBrowser.maybeCompleteAuthSession();

export type AuthStatus = 'idle' | 'loading' | 'authenticated' | 'unauthenticated';

export interface UserProfile {
  id: string;
  email?: string;
  fullName?: string;
  avatarUrl?: string;
  isGuest?: boolean;
  [key: string]: any;
}

const GUEST_USER: User = {
  id: 'guest-user-12345',
  app_metadata: { provider: 'guest' },
  user_metadata: {
    fullName: 'Guest Explorer',
    isGuest: true,
  },
  aud: 'authenticated',
  created_at: new Date().toISOString(),
  email: 'guest@lifestack.app',
} as User;

const GUEST_PROFILE: UserProfile = {
  id: 'guest-user-12345',
  email: 'guest@lifestack.app',
  fullName: 'Guest Explorer',
  isGuest: true,
};

interface AuthState {
  status: AuthStatus;
  session: Session | null;
  user: User | null;
  profile: UserProfile | null;
  error: string | null;
  isLoading: boolean;
  initialize: () => Promise<() => void>;
  signInWithPassword: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUpWithPassword: (email: string, password: string) => Promise<{ error: Error | null; user: User | null }>;
  signInWithGoogle: () => Promise<{ error: Error | null }>;
  signInAsGuest: () => Promise<void>;
  openAuthScreen: () => void;
  signOut: () => Promise<void>;
  clearError: () => void;
  setError: (error: string | null) => void;
}

const syncSessionToStorage = async (session: Session | null) => {
  if (session) {
    await Promise.all([
      storage.set(STORAGE_KEYS.userToken, session.access_token),
      storage.set(STORAGE_KEYS.refreshToken, session.refresh_token),
      storage.set(STORAGE_KEYS.userId, session.user.id),
    ]);
  } else {
    await Promise.all([
      storage.remove(STORAGE_KEYS.userToken),
      storage.remove(STORAGE_KEYS.refreshToken),
      storage.remove(STORAGE_KEYS.userId),
    ]);
  }
};

/**
 * Robustly parses parameters from both query string and hash fragment of incoming auth URLs
 * Pure string splitting on '?' and '#' - completely resilient on Hermes engine.
 */
const extractParamsFromUrl = (urlString: string): Map<string, string> => {
  const params = new Map<string, string>();
  if (!urlString) return params;

  const segments = urlString.split(/[?#]/);
  for (let i = 1; i < segments.length; i++) {
    const pairStrings = segments[i].split('&');
    for (const pair of pairStrings) {
      if (!pair) continue;
      const eqIdx = pair.indexOf('=');
      if (eqIdx !== -1) {
        const key = decodeURIComponent(pair.substring(0, eqIdx));
        const val = decodeURIComponent(pair.substring(eqIdx + 1));
        params.set(key, val);
      } else {
        params.set(decodeURIComponent(pair), '');
      }
    }
  }
  return params;
};

/**
 * Automatically seeds initial user profile, CADENCE chronobiology routine, and baseline biometrics in Supabase
 */
export const ensureUserSeeded = async (user: User | null): Promise<void> => {
  if (!user || !isSupabaseConfigured()) return;

  try {
    // 1. Upsert public.profiles
    try {
      await supabase.from('profiles').upsert(
        {
          id: user.id,
          email: user.email,
          full_name: user.user_metadata?.fullName || user.user_metadata?.full_name || 'Cadence User',
          avatar_url: user.user_metadata?.avatar_url || null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'id' }
      );
    } catch (profileErr: any) {
      console.log('[Auth] Profile upsert note:', profileErr?.message);
    }

    // 2. Ensure public.routines row exists
    try {
      const { data: routineData } = await supabase
        .from('routines')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!routineData) {
        await supabase.from('routines').insert({
          user_id: user.id,
          wake_time: '06:30:00',
          wind_down_time: '21:30:00',
          caffeine_cutoff: '14:00:00',
          second_wind_start: '16:30:00',
          second_wind_end: '18:00:00',
        });
      }
    } catch (routineErr: any) {
      console.log('[Auth] Routine seed note:', routineErr?.message);
    }

    // 3. Ensure today's public.biometrics_daily_metrics row exists
    try {
      const today = new Date().toISOString().split('T')[0];
      const { data: bioData } = await supabase
        .from('biometrics_daily_metrics')
        .select('id')
        .eq('user_id', user.id)
        .eq('date', today)
        .maybeSingle();

      if (!bioData) {
        await supabase.from('biometrics_daily_metrics').insert({
          user_id: user.id,
          date: today,
          sleep_hours: 7.2,
          hrv_ms: 64,
          resting_hr_bpm: 64,
          readiness_score: 82,
        });
      }
    } catch (bioErr: any) {
      console.log('[Auth] Biometrics seed note:', bioErr?.message);
    }
  } catch (seedErr) {
    console.log('[Auth] User seed non-blocking warning:', seedErr);
  }
};

/**
 * Handles incoming authentication URLs (from WebBrowser callback, deep link event, or initial URL)
 */
const handleAuthUrl = async (url: string, set: any): Promise<boolean> => {
  if (!url) return false;
  console.log('[Auth] Processing incoming Auth URL:', url);

  const params = extractParamsFromUrl(url);
  const accessToken = params.get('access_token');
  const refreshToken = params.get('refresh_token');
  const code = params.get('code');
  const errorDescription = params.get('error_description') || params.get('error');

  if (errorDescription) {
    console.error('[Auth] Deep link error:', errorDescription);
    set({ error: errorDescription, isLoading: false });
    return false;
  }

  if (accessToken && refreshToken) {
    console.log('[Auth] Setting session from access/refresh tokens...');
    const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });

    if (sessionError) {
      console.error('[Auth] SetSession failed:', sessionError);
      set({ error: sessionError.message, isLoading: false });
      return false;
    }

    if (sessionData.session) {
      console.log('[Auth] Session established successfully for user:', sessionData.user?.id);
      await syncSessionToStorage(sessionData.session);
      await ensureUserSeeded(sessionData.user);
      set({
        status: 'authenticated',
        session: sessionData.session,
        user: sessionData.user,
        profile: sessionData.user
          ? {
              id: sessionData.user.id,
              email: sessionData.user.email,
              ...sessionData.user.user_metadata,
            }
          : null,
        isLoading: false,
        error: null,
      });
      return true;
    }
  } else if (code) {
    console.log('[Auth] Exchanging code for session...');
    const { data: sessionData, error: exchangeError } =
      await supabase.auth.exchangeCodeForSession(code);

    if (exchangeError) {
      console.error('[Auth] Code exchange failed:', exchangeError);
      set({ error: exchangeError.message, isLoading: false });
      return false;
    }

    if (sessionData.session) {
      console.log('[Auth] Session established via PKCE for user:', sessionData.user?.id);
      await syncSessionToStorage(sessionData.session);
      await ensureUserSeeded(sessionData.user);
      set({
        status: 'authenticated',
        session: sessionData.session,
        user: sessionData.user,
        profile: sessionData.user
          ? {
              id: sessionData.user.id,
              email: sessionData.user.email,
              ...sessionData.user.user_metadata,
            }
          : null,
        isLoading: false,
        error: null,
      });
      return true;
    }
  }

  return false;
};

export const useAuthStore = create<AuthState>((set, get) => ({
  status: 'authenticated', // Defaults to Guest immediately so user is NEVER blocked by sign-in!
  session: null,
  user: GUEST_USER,
  profile: GUEST_PROFILE,
  error: null,
  isLoading: false,

  openAuthScreen: () => set({ status: 'unauthenticated' }),
  clearError: () => set({ error: null }),
  setError: (error: string | null) => set({ error }),

  initialize: async () => {
    // 1. Check if the app was opened via an initial deep link (cold start from OAuth or Email confirmation)
    try {
      const initialUrl = await Linking.getInitialURL();
      if (initialUrl) {
        console.log('[Auth] App launched with initial URL:', initialUrl);
        await handleAuthUrl(initialUrl, set);
      }
    } catch (linkErr) {
      console.warn('[Auth] Error checking initial deep link:', linkErr);
    }

    // 2. Listen for deep link events while the app is active in foreground/background
    const linkSubscription = Linking.addEventListener('url', async ({ url }) => {
      console.log('[Auth] Inbound deep link received:', url);
      await handleAuthUrl(url, set);
    });

    // 3. If Supabase is configured, check for a real Supabase session
    if (isSupabaseConfigured()) {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          await syncSessionToStorage(session);
          set({
            status: 'authenticated',
            session,
            user: session.user,
            profile: {
              id: session.user.id,
              email: session.user.email,
              ...session.user.user_metadata,
            },
            isLoading: false,
            error: null,
          });
        }
      } catch (err: any) {
        console.warn('[Auth] Error checking session, staying in guest mode:', err);
      }

      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
        if (session) {
          await syncSessionToStorage(session);
          set({
            status: 'authenticated',
            session,
            user: session.user,
            profile: {
              id: session.user.id,
              email: session.user.email,
              ...session.user.user_metadata,
            },
            isLoading: false,
            error: null,
          });
        }
      });

      return () => {
        subscription.unsubscribe();
        linkSubscription.remove();
      };
    }

    return () => {
      linkSubscription.remove();
    };
  },

  signInWithPassword: async (email: string, password: string) => {
    set({ isLoading: true, error: null });

    if (!isSupabaseConfigured()) {
      const msg = 'Supabase credentials missing. Add EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY to .env';
      set({ isLoading: false, error: msg });
      return { error: new Error(msg) };
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        set({ error: error.message, isLoading: false });
        return { error };
      }

      await syncSessionToStorage(data.session);
      await ensureUserSeeded(data.user);

      set({
        status: 'authenticated',
        session: data.session,
        user: data.user,
        profile: data.user
          ? {
              id: data.user.id,
              email: data.user.email,
              ...data.user.user_metadata,
            }
          : null,
        isLoading: false,
        error: null,
      });

      return { error: null };
    } catch (err: any) {
      const message = err?.message || 'An unexpected error occurred during sign in';
      set({ error: message, isLoading: false });
      return { error: new Error(message) };
    } finally {
      set({ isLoading: false });
    }
  },

  signUpWithPassword: async (email: string, password: string) => {
    set({ isLoading: true, error: null });

    if (!isSupabaseConfigured()) {
      const msg = 'Supabase credentials missing. Add EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY to .env';
      set({ isLoading: false, error: msg });
      return { error: new Error(msg), user: null };
    }

    try {
      // Direct sign-up without external localhost redirect to prevent mobile browser hang
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
      });

      if (error) {
        // If user already registered, immediately attempt sign-in
        if (error.message?.toLowerCase().includes('already registered')) {
          const signInRes = await get().signInWithPassword(email, password);
          return { error: signInRes.error, user: get().user };
        }
        set({ error: error.message, isLoading: false });
        return { error, user: null };
      }

      if (data.session) {
        // Immediate session returned
        await syncSessionToStorage(data.session);
        await ensureUserSeeded(data.user);
        set({
          status: 'authenticated',
          session: data.session,
          user: data.user,
          profile: data.user
            ? {
                id: data.user.id,
                email: data.user.email,
                ...data.user.user_metadata,
              }
            : null,
          isLoading: false,
          error: null,
        });
        return { error: null, user: data.user };
      } else {
        // Sign user in directly with password
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

        if (!signInError && signInData.session) {
          await syncSessionToStorage(signInData.session);
          await ensureUserSeeded(signInData.user);
          set({
            status: 'authenticated',
            session: signInData.session,
            user: signInData.user,
            profile: signInData.user
              ? {
                  id: signInData.user.id,
                  email: signInData.user.email,
                  ...signInData.user.user_metadata,
                }
              : null,
            isLoading: false,
            error: null,
          });
          return { error: null, user: signInData.user };
        } else {
          const warnMsg = signInError?.message?.includes('Email not confirmed')
            ? 'Account created! If email confirmation is required, confirm via your email or disable confirmation in Supabase dashboard.'
            : (signInError?.message || 'Account created successfully.');
          
          set({
            isLoading: false,
            error: warnMsg,
          });
          return { error: signInError, user: data.user };
        }
      }
    } catch (err: any) {
      const message = err?.message || 'An unexpected error occurred during sign up';
      set({ error: message, isLoading: false });
      return { error: new Error(message), user: null };
    } finally {
      set({ isLoading: false });
    }
  },

  signInWithGoogle: async () => {
    set({ isLoading: true, error: null });

    if (!isSupabaseConfigured()) {
      const msg = 'Supabase credentials missing. Add EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY to .env';
      console.error('[Auth] ' + msg);
      set({ isLoading: false, error: msg });
      return { error: new Error(msg) };
    }

    try {
      const redirectUrl = getAuthRedirectUri();
      console.log('[Auth] Using Redirect URL:', redirectUrl);

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          skipBrowserRedirect: true,
        },
      });

      if (error) {
        console.error('[Auth] OAuth initiation error:', error);
        set({ error: error.message, isLoading: false });
        return { error };
      }

      if (data?.url) {
        console.log('[Auth] Opening WebBrowser session...');
        try {
          const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl);
          console.log('[Auth] WebBrowser result:', result);

          if (result.type === 'success' && result.url) {
            const handled = await handleAuthUrl(result.url, set);
            if (handled) {
              return { error: null };
            }
          }
        } finally {
          set({ isLoading: false });
        }
      }

      set({ isLoading: false });
      return { error: null };
    } catch (err: any) {
      console.error('[Auth] Google OAuth exception:', err);
      const message = err?.message || 'Google sign in failed';
      set({ error: message, isLoading: false });
      return { error: new Error(message) };
    } finally {
      set({ isLoading: false });
    }
  },

  signInAsGuest: async () => {
    set({ isLoading: true, error: null });
    try {
      const guestUser: User = {
        id: 'guest-user-12345',
        app_metadata: { provider: 'guest' },
        user_metadata: {
          fullName: 'Guest Explorer',
          isGuest: true,
        },
        aud: 'authenticated',
        created_at: new Date().toISOString(),
        email: 'guest@lifestack.app',
      } as User;

      await storage.set('isGuest', true);
      await storage.set(STORAGE_KEYS.userId, guestUser.id);

      set({
        status: 'authenticated',
        session: null,
        user: guestUser,
        profile: {
          id: guestUser.id,
          email: guestUser.email,
          fullName: 'Guest Explorer',
          isGuest: true,
        },
        isLoading: false,
        error: null,
      });
    } catch (err: any) {
      console.warn('Guest sign in error:', err);
      set({ isLoading: false, error: 'Failed to continue as guest' });
    }
  },

  signOut: async () => {
    set({ isLoading: true, error: null });
    try {
      await storage.remove('isGuest');
      if (isSupabaseConfigured()) {
        await supabase.auth.signOut();
      }
    } catch (err: any) {
      console.warn('Sign out warning:', err);
    } finally {
      await syncSessionToStorage(null);
      set({
        status: 'unauthenticated',
        session: null,
        user: null,
        profile: null,
        isLoading: false,
        error: null,
      });
    }
  },
}));
