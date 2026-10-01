import React, { createContext, useContext, useState, useEffect } from 'react';
import type { UserProfile } from '@365/core';
import { supabase, isSupabaseConfigured } from './supabase';
import { AppStorage } from './storage';
import { Platform } from 'react-native';

interface AuthContextType {
  user: UserProfile | null;
  isLoading: boolean;
  signInWithGoogle: () => Promise<UserProfile>;
  signInAsGuest: () => Promise<UserProfile>;
  signOut: () => Promise<void>;
  updateNotificationPrefs: (prefs: Partial<UserProfile['notificationPrefs']>) => Promise<void>;
}

const STORAGE_KEY = '365_user_session';

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Sync Supabase user profile to UserProfile
  const fetchSupabaseProfile = async (authUserId: string, email?: string): Promise<UserProfile | null> => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', authUserId)
        .maybeSingle();

      if (data && !error) {
        return {
          id: data.id,
          authProvider: data.is_guest ? 'guest' : 'google',
          displayName: data.display_name,
          username: data.username,
          avatar: data.avatar_url,
          isGuest: data.is_guest,
          isBanned: data.is_banned,
          notificationPrefs: data.notification_prefs || {
            dailyRelease: true,
            songSelected: true,
          },
          fcmTokens: data.push_tokens || [],
          createdAt: data.created_at,
          updatedAt: data.updated_at,
        };
      }
    } catch (e) {
      console.warn('[AuthContext] Failed to fetch profile from Supabase:', e);
    }
    return null;
  };

  useEffect(() => {
    // 1. Initial load from local storage
    const loadSession = async () => {
      try {
        const stored = await AppStorage.getItem(STORAGE_KEY);

        if (stored) {
          setUser(JSON.parse(stored));
        }

        // 2. If Supabase configured, check active auth session
        if (isSupabaseConfigured) {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user) {
            const profile = await fetchSupabaseProfile(session.user.id, session.user.email);
            if (profile) {
              saveUser(profile);
            }
          }
        }
      } catch (e) {
        console.warn('Failed to restore user session:', e);
      } finally {
        setIsLoading(false);
      }
    };

    loadSession();

    // 3. Supabase Auth listener
    if (isSupabaseConfigured) {
      const { data: authListener } = supabase.auth.onAuthStateChange(async (event: any, session: any) => {
        if (session?.user) {
          const profile = await fetchSupabaseProfile(session.user.id, session.user.email);
          if (profile) {
            saveUser(profile);
          }
        } else if (event === 'SIGNED_OUT') {
          saveUser(null);
        }
      });

      return () => {
        authListener?.subscription.unsubscribe();
      };
    }
  }, []);

  const saveUser = async (newUser: UserProfile | null) => {
    setUser(newUser);
    try {
      if (newUser) {
        await AppStorage.setItem(STORAGE_KEY, JSON.stringify(newUser));
      } else {
        await AppStorage.removeItem(STORAGE_KEY);
      }
    } catch (e) {
      console.warn('Failed to save user session:', e);
    }
  };

  const signInWithGoogle = async (): Promise<UserProfile> => {
    if (isSupabaseConfigured) {
      try {
        // If web or OAuth redirect
        if (Platform.OS === 'web') {
          await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
              redirectTo: window.location.origin,
            },
          });
        } else {
          // Native Google sign-in triggers OAuth or profile creation
          const { data: { user: authUser } } = await supabase.auth.getUser();
          if (authUser) {
            const profile = await fetchSupabaseProfile(authUser.id, authUser.email);
            if (profile) {
              saveUser(profile);
              return profile;
            }
          }
        }
      } catch (e) {
        console.warn('[AuthContext] Supabase Google sign in error:', e);
      }
    }

    // Default / Offline Fallback User
    const googleUser: UserProfile = {
      id: user?.id && !user.isGuest ? user.id : `usr_g_${Date.now()}`,
      authProvider: 'google',
      googleId: `gid_${Math.random().toString(36).substring(2, 9)}`,
      displayName: 'Alex Rivers',
      username: 'alexrivers',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
      isGuest: false,
      isBanned: false,
      notificationPrefs: {
        dailyRelease: true,
        songSelected: true,
      },
      fcmTokens: [`fcm_token_${Date.now()}`],
      createdAt: user?.createdAt ?? new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await saveUser(googleUser);
    return googleUser;
  };

  const signInAsGuest = async (): Promise<UserProfile> => {
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase.auth.signInAnonymously();
        if (data?.user && !error) {
          const profile = await fetchSupabaseProfile(data.user.id);
          if (profile) {
            saveUser(profile);
            return profile;
          }
        }
      } catch (e) {
        console.warn('[AuthContext] Supabase anonymous sign in error:', e);
      }
    }

    const guestUser: UserProfile = {
      id: `usr_guest_${Date.now()}`,
      authProvider: 'guest',
      displayName: 'Guest Listener',
      username: `listener_${Math.floor(1000 + Math.random() * 9000)}`,
      isGuest: true,
      isBanned: false,
      notificationPrefs: {
        dailyRelease: false,
        songSelected: false,
      },
      fcmTokens: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await saveUser(guestUser);
    return guestUser;
  };

  const signOut = async (): Promise<void> => {
    if (isSupabaseConfigured) {
      try {
        await supabase.auth.signOut();
      } catch (e) {
        console.warn('[AuthContext] Supabase sign out error:', e);
      }
    }
    await saveUser(null);
  };

  const updateNotificationPrefs = async (prefs: Partial<UserProfile['notificationPrefs']>) => {
    if (!user) return;
    const updated: UserProfile = {
      ...user,
      notificationPrefs: {
        ...user.notificationPrefs,
        ...prefs,
      },
      updatedAt: new Date().toISOString(),
    };

    if (isSupabaseConfigured) {
      try {
        await supabase
          .from('users')
          .update({
            notification_prefs: updated.notificationPrefs,
            updated_at: new Date().toISOString(),
          })
          .eq('id', user.id);
      } catch (e) {
        console.warn('[AuthContext] Failed to update prefs in Supabase:', e);
      }
    }

    await saveUser(updated);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        signInWithGoogle,
        signInAsGuest,
        signOut,
        updateNotificationPrefs,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}
