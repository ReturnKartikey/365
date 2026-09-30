import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserProfile } from '@365/core';

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

  useEffect(() => {
    // Initial load: check for stored session
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const stored = window.localStorage.getItem(STORAGE_KEY);
        if (stored) {
          setUser(JSON.parse(stored));
        }
      }
    } catch (e) {
      console.warn('Failed to restore user session:', e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const saveUser = (newUser: UserProfile | null) => {
    setUser(newUser);
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        if (newUser) {
          window.localStorage.setItem(STORAGE_KEY, JSON.stringify(newUser));
        } else {
          window.localStorage.removeItem(STORAGE_KEY);
        }
      }
    } catch (e) {
      console.warn('Failed to save user session:', e);
    }
  };

  const signInWithGoogle = async (): Promise<UserProfile> => {
    // Create or upgrade to Google profile
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

    saveUser(googleUser);
    return googleUser;
  };

  const signInAsGuest = async (): Promise<UserProfile> => {
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

    saveUser(guestUser);
    return guestUser;
  };

  const signOut = async (): Promise<void> => {
    saveUser(null);
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
    saveUser(updated);
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
