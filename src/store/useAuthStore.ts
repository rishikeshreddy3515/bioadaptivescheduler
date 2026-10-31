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
 */
const extractParamsFromUrl = (urlString: string): URLSearchParams => {
  const params = new URLSearchParams();
  try {
    const parsed = new URL(urlString);
    if (parsed.search) {
      new URLSearchParams(parsed.search).forEach((v, k) => params.set(k, v));
    }
    if (parsed.hash) {
      const hashStr = parsed.hash.startsWith('#') ? parsed.hash.substring(1) : parsed.hash;
      new URLSearchParams(hashStr).forEach((v, k) => params.set(k, v));
    }
  } catch {
    const queryIdx = urlString.indexOf('?');
    const hashIdx = urlString.indexOf('#');
    if (queryIdx !== -1) {
      const queryPart =
        hashIdx !== -1 && hashIdx > queryIdx
          ? urlString.substring(queryIdx + 1, hashIdx)
          : urlString.substring(queryIdx + 1);
      new URLSearchParams(queryPart).forEach((v, k) => params.set(k, v));
    }
    if (hashIdx !== -1) {
      const hashPart = urlString.substring(hashIdx + 1);
      new URLSearchParams(hashPart).forEach((v, k) => params.set(k, v));
    }
  }
  return params;
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
      const redirectUrl = getAuthRedirectUri();

      // Sign up with mobile redirect URI to prevent redirecting to localhost:3000
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          emailRedirectTo: redirectUrl,
        },
      });

      if (error) {
        set({ error: error.message, isLoading: false });
        return { error, user: null };
      }

      if (data.session) {
        // Immediate session returned (email confirmations disabled)
        await syncSessionToStorage(data.session);
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
        // Sign user in directly with credentials without expecting external web confirmation
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

        if (!signInError && signInData.session) {
          await syncSessionToStorage(signInData.session);
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
          // If Supabase project still enforces email confirmation in dashboard
          const warnMsg = signInError?.message?.includes('Email not confirmed')
            ? 'Account created! If you see "Email not confirmed", toggle OFF "Confirm email" in your Supabase Dashboard (Auth -> Providers -> Email).'
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
      // Automatically generates exp://... in Expo Go and mylifestack://... in standalone builds
      const redirectUrl = AuthSession.makeRedirectUri({
        scheme: 'mylifestack',
        preferLocalhost: false,
      });
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
        const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl);
        console.log('[Auth] WebBrowser result:', result);

        if (result.type === 'success' && result.url) {
          const handled = await handleAuthUrl(result.url, set);
          if (handled) {
            return { error: null };
          }
        }
      }

      set({ isLoading: false });
      return { error: null };
    } catch (err: any) {
      console.error('[Auth] Google OAuth exception:', err);
      const message = err?.message || 'Google sign in failed';
      set({ error: message, isLoading: false });
      return { error: new Error(message) };
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
