import React, { createContext, useContext, useState, useEffect } from 'react';
import type { UserProfile } from '@365/core';
import { supabase, isSupabaseConfigured } from './supabase';
import { createClient } from '@supabase/supabase-js';
import { AppStorage } from './storage';
import { Platform } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import queryString from 'query-string';

// Complete any pending browser auth sessions on load
WebBrowser.maybeCompleteAuthSession();

interface AuthContextType {
  user: UserProfile | null;
  isLoading: boolean;
  signInWithGoogle: () => Promise<UserProfile>;
  signInWithVerifiedEmail: (email: string) => Promise<UserProfile>;
  signInAsGuest: () => Promise<UserProfile>;
  signOut: () => Promise<void>;
  updateNotificationPrefs: (prefs: Partial<UserProfile['notificationPrefs']>) => Promise<void>;
}

const STORAGE_KEY = '365_user_session';

const GUEST_ADJECTIVES = [
  'cosmic', 'vinyl', 'echo', 'analog', 'sonic', 'velvet', 'groove',
  'ambient', 'midnight', 'retro', 'indigo', 'neon', 'mellow',
  'harmonic', 'astral', 'golden', 'stellar', 'lunar', 'vintage',
  'drift', 'mystic', 'solitary', 'silent', 'reverie',
];

const GUEST_NOUNS = [
  'wanderer', 'listener', 'seeker', 'scout', 'curator', 'voyager',
  'drifter', 'tuner', 'nomad', 'spirit', 'cadence', 'audiophile',
  'groover', 'strummer', 'selector', 'chaser', 'weaver',
];

export function generateRandomGuestIdentity(): { username: string; displayName: string } {
  const adj = GUEST_ADJECTIVES[Math.floor(Math.random() * GUEST_ADJECTIVES.length)];
  const noun = GUEST_NOUNS[Math.floor(Math.random() * GUEST_NOUNS.length)];
  const num = Math.floor(100 + Math.random() * 900);

  const username = `${adj}_${noun}_${num}`;
  const displayName = `${adj.charAt(0).toUpperCase() + adj.slice(1)} ${noun.charAt(0).toUpperCase() + noun.slice(1)}`;

  return { username, displayName };
}

export function formatEmailToUsernameAndDisplayName(email: string): { username: string; displayName: string } {
  const local = (email.split('@')[0] || 'listener').trim().toLowerCase();
  
  // Strip trailing numbers (e.g. kartikeynegi2000 -> kartikeynegi, yss27008 -> yss)
  let nameWithoutTrailingNumbers = local.replace(/\d+$/, '');
  if (!nameWithoutTrailingNumbers || nameWithoutTrailingNumbers.length < 2) {
    nameWithoutTrailingNumbers = local;
  }
  
  // Clean alphanumeric + underscore
  let username = nameWithoutTrailingNumbers.replace(/[^a-z0-9_]/g, '');
  if (!username || username.length < 2) {
    username = local.replace(/[^a-z0-9_]/g, '') || `user_${Math.floor(1000 + Math.random() * 9000)}`;
  }
  
  // Format Display Name
  let nameParts = (nameWithoutTrailingNumbers || local)
    .replace(/[._\-+]/g, ' ')
    .trim()
    .split(/\s+/);
  
  let displayName = nameParts
    .filter(Boolean)
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(' ');
    
  if (!displayName) {
    displayName = username.charAt(0).toUpperCase() + username.slice(1);
  }

  return { username, displayName };
}

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

    // 3. Deep link listener for OAuth redirect (e.g. from Google login)
    const handleDeepLink = async (event: { url: string }) => {
      try {
        const url = event.url;
        if (!url || (!url.includes('access_token') && !url.includes('code='))) return;

        const hash = url.split('#')[1] || '';
        const hashParams = queryString.parse(hash);
        const parsedUrl = queryString.parseUrl(url);
        const code = parsedUrl.query.code as string | undefined;

        if (hashParams.access_token && hashParams.refresh_token) {
          const { data: sessionData } = await supabase.auth.setSession({
            access_token: hashParams.access_token as string,
            refresh_token: hashParams.refresh_token as string,
          });
          if (sessionData?.user) {
            const profile = await fetchSupabaseProfile(sessionData.user.id, sessionData.user.email);
            if (profile) saveUser(profile);
          }
        } else if (code) {
          const { data: sessionData } = await supabase.auth.exchangeCodeForSession(code);
          if (sessionData?.user) {
            const profile = await fetchSupabaseProfile(sessionData.user.id, sessionData.user.email);
            if (profile) saveUser(profile);
          }
        }
      } catch (err) {
        console.warn('[AuthContext] Deep link auth handle error:', err);
      }
    };

    const linkSub = Linking.addEventListener('url', handleDeepLink);
    Linking.getInitialURL().then((url) => {
      if (url) handleDeepLink({ url });
    });

    // 4. Supabase Auth listener
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
        linkSub.remove();
        authListener?.subscription.unsubscribe();
      };
    }

    return () => {
      linkSub.remove();
    };
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
      if (Platform.OS === 'web') {
        const redirectUrl = typeof window !== 'undefined'
          ? `${window.location.origin}/auth-callback`
          : undefined;

        const { error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: redirectUrl,
          },
        });
        if (error) throw error;
        return new Promise(() => {});
      } else {
        // Native mobile OAuth using WebBrowser and Expo Linking
        const redirectUrl = Linking.createURL('auth-callback');
        const { data, error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: redirectUrl,
            skipBrowserRedirect: true,
          },
        });

        if (error) {
          console.warn('[AuthContext] Supabase OAuth initiation error:', error);
          throw error;
        }

        if (data?.url) {
          const authResult = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl);
          if (authResult.type === 'success' && authResult.url) {
            const url = authResult.url;
            const hash = url.split('#')[1] || '';
            const hashParams = queryString.parse(hash);
            const parsedUrl = queryString.parseUrl(url);
            const code = parsedUrl.query.code as string | undefined;

            if (hashParams.access_token && hashParams.refresh_token) {
              const { data: sessionData } = await supabase.auth.setSession({
                access_token: hashParams.access_token as string,
                refresh_token: hashParams.refresh_token as string,
              });
              if (sessionData?.user) {
                const profile = await fetchSupabaseProfile(sessionData.user.id, sessionData.user.email);
                if (profile) {
                  await saveUser(profile);
                  return profile;
                }
              }
            } else if (code) {
              const { data: sessionData } = await supabase.auth.exchangeCodeForSession(code);
              if (sessionData?.user) {
                const profile = await fetchSupabaseProfile(sessionData.user.id, sessionData.user.email);
                if (profile) {
                  await saveUser(profile);
                  return profile;
                }
              }
            }
          }
        }
      }
    }

    // Default / Offline Fallback User (only reached if Supabase is completely unconfigured)
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

  const signInWithVerifiedEmail = async (email: string): Promise<UserProfile> => {
    if (isSupabaseConfigured) {
      const serviceKey =
        process.env.EXPO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY ||
        process.env.SUPABASE_SERVICE_ROLE_KEY;
      if (serviceKey) {
        const adminClient = createClient(
          process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://yhecwvbxhrpnzxxzsgbm.supabase.co',
          serviceKey
        );
        const { data: linkData, error: linkErr } = await adminClient.auth.admin.generateLink({
          type: 'magiclink',
          email,
        });

        if (!linkErr && linkData?.properties?.hashed_token) {
          const { data: sessionData, error: sessionErr } = await supabase.auth.verifyOtp({
            token_hash: linkData.properties.hashed_token,
            type: 'magiclink',
          });

          if (!sessionErr && sessionData?.user) {
            const userId = sessionData.user.id;

            // Check if profile in public.users has a proper username or needs a clean identity
            const { data: existingUser } = await adminClient
              .from('users')
              .select('*')
              .eq('id', userId)
              .maybeSingle();

            const { username: cleanUsername, displayName: cleanDisplayName } =
              formatEmailToUsernameAndDisplayName(email);

            if (!existingUser) {
              await adminClient.from('users').insert({
                id: userId,
                email,
                username: cleanUsername,
                display_name: cleanDisplayName,
                is_guest: false,
                is_banned: false,
                is_admin: false,
                notification_prefs: { dailyRelease: true, songSelected: true },
                push_tokens: [],
                stats: { songs_featured: 0, listening_streak: 1, total_submissions: 0 },
              });
            } else if (
              !existingUser.username ||
              existingUser.username.startsWith('listener_') ||
              existingUser.username === email
            ) {
              await adminClient
                .from('users')
                .update({
                  username: cleanUsername,
                  display_name:
                    existingUser.display_name && existingUser.display_name !== existingUser.username
                      ? existingUser.display_name
                      : cleanDisplayName,
                  is_guest: false,
                  updated_at: new Date().toISOString(),
                })
                .eq('id', userId);
            }

            const profile = await fetchSupabaseProfile(userId, email);
            if (profile) {
              await saveUser(profile);
              return profile;
            }
          }
        }
      }
    }
    throw new Error('Failed to sign in with verified email');
  };

  const signInAsGuest = async (): Promise<UserProfile> => {
    const { username: guestUsername, displayName: guestDisplayName } = generateRandomGuestIdentity();

    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase.auth.signInAnonymously();
        if (data?.user && !error) {
          // Sync creative guest identity into Supabase
          await supabase
            .from('users')
            .update({
              username: guestUsername,
              display_name: guestDisplayName,
              is_guest: true,
            })
            .eq('id', data.user.id);

          const profile = await fetchSupabaseProfile(data.user.id);
          if (profile) {
            await saveUser(profile);
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
      displayName: guestDisplayName,
      username: guestUsername,
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
        console.warn('Supabase sign out error:', e);
      }
    }
    await saveUser(null);
  };

  const updateNotificationPrefs = async (prefs: Partial<UserProfile['notificationPrefs']>) => {
    if (!user) return;
    const updated = {
      ...user,
      notificationPrefs: {
        ...user.notificationPrefs,
        ...prefs,
      },
      updatedAt: new Date().toISOString(),
    };
    await saveUser(updated);

    if (isSupabaseConfigured && !user.isGuest) {
      try {
        await supabase
          .from('users')
          .update({
            notification_prefs: updated.notificationPrefs,
            updated_at: updated.updatedAt,
          })
          .eq('id', user.id);
      } catch (e) {
        console.warn('Failed to sync notification prefs to Supabase:', e);
      }
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        signInWithGoogle,
        signInWithVerifiedEmail,
        signInAsGuest,
        signOut,
        updateNotificationPrefs,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
