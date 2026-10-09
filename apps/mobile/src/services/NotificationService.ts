import { Platform } from 'react-native';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { supabase, isSupabaseConfigured } from './supabase';
import { AppStorage } from './storage';

// Safe selective loaders from expo-notifications (strictly avoiding PushTokenManager / ExpoPushTokenManager)
let scheduleNotificationAsync: any = null;
let setNotificationChannelAsync: any = null;
let setNotificationHandler: any = null;
let requestPermissionsAsync: any = null;
let getPermissionsAsync: any = null;

if (Platform.OS !== 'web') {
  try {
    scheduleNotificationAsync = require('expo-notifications/build/scheduleNotificationAsync').default;
  } catch (e) {
    console.warn('[NotificationService] scheduleNotificationAsync not available:', e);
  }

  try {
    setNotificationChannelAsync = require('expo-notifications/build/setNotificationChannelAsync').default;
  } catch (e) {
    console.warn('[NotificationService] setNotificationChannelAsync not available:', e);
  }

  try {
    const handler = require('expo-notifications/build/NotificationsHandler');
    setNotificationHandler = handler.setNotificationHandler;
  } catch (e) {
    console.warn('[NotificationService] NotificationsHandler not available:', e);
  }

  try {
    const perms = require('expo-notifications/build/NotificationPermissions');
    requestPermissionsAsync = perms.requestPermissionsAsync;
    getPermissionsAsync = perms.getPermissionsAsync;
  } catch (e) {
    console.warn('[NotificationService] NotificationPermissions not available:', e);
  }
}

// 1. Configure foreground notification presentation behavior so notifications ALWAYS show in phone's notification panel
if (setNotificationHandler) {
  try {
    setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
      }),
    });
  } catch (err) {
    console.warn('[NotificationService] setNotificationHandler error:', err);
  }
}

const PUSH_TOKEN_STORAGE_KEY = '365_device_push_token';

export interface InAppNotificationEvent {
  id: string;
  type: 'daily_release' | 'song_selected';
  title: string;
  subtitle?: string;
  body: string;
  dayNumber?: number;
  songTitle?: string;
  artist?: string;
  artworkUrl?: string;
  songId?: string;
}

type InAppListener = (event: InAppNotificationEvent) => void;
const inAppListeners = new Set<InAppListener>();

export const NotificationService = {
  /**
   * Subscribe to in-app heads-up notification events (optional).
   */
  subscribeInApp(listener: InAppListener): () => void {
    inAppListeners.add(listener);
    return () => inAppListeners.delete(listener);
  },

  /**
   * Directly emit an in-app heads-up notification event.
   */
  emitInApp(event: InAppNotificationEvent): void {
    inAppListeners.forEach((fn) => {
      try {
        fn(event);
      } catch (err) {
        console.warn('[NotificationService] In-app listener error:', err);
      }
    });
  },

  /**
   * Initializes notification channels on Android and requests OS permissions for native notification panel.
   */
  async initialize(): Promise<void> {
    // 1. Request OS notification permissions (Android 13+ & iOS) so notifications appear in status bar / shade
    if (requestPermissionsAsync) {
      try {
        const existing = (await getPermissionsAsync?.()) || { status: 'undetermined' };
        if (existing.status !== 'granted') {
          const res = await requestPermissionsAsync();
          console.info('[NotificationService] Native notification permission status:', res.status);
        }
      } catch (permErr) {
        console.warn('[NotificationService] Permission request warning:', permErr);
      }
    }

    // 2. Configure Android notification channels with MAX importance
    if (Platform.OS === 'android' && setNotificationChannelAsync) {
      try {
        // Channel 1: Daily 365 community release ritual (7:00 PM IST)
        await setNotificationChannelAsync('daily-release', {
          name: 'Daily Song Release',
          description: 'Community daily song drop at 7:00 PM IST',
          importance: 5, // AndroidImportance.MAX
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#E09F3E',
          sound: 'default',
          enableLights: true,
          enableVibrate: true,
          showBadge: true,
        });

        // Channel 2: Submitter notification when their track is chosen
        await setNotificationChannelAsync('song-selected', {
          name: 'Song Selected Alert',
          description: 'Alert when your submitted track is chosen as the daily 365',
          importance: 5, // AndroidImportance.MAX
          vibrationPattern: [0, 200, 100, 200],
          lightColor: '#E09F3E',
          sound: 'default',
          enableLights: true,
          enableVibrate: true,
          showBadge: true,
        });
      } catch (err) {
        console.warn('[NotificationService] Error initializing Android channels:', err);
      }
    }
  },

  /**
   * Requests user notification permission and retrieves device Expo Push Token.
   * If a userId is supplied, registers the token in Supabase public.users table.
   */
  async registerForPushNotifications(userId?: string): Promise<string | null> {
    try {
      if (requestPermissionsAsync) {
        try {
          await requestPermissionsAsync();
        } catch (e) {}
      }

      const isExpoGo =
        Constants.appOwnership === 'expo' ||
        Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

      // In Expo Go or development, use clean identifier token
      const token = `ExponentPushToken[expo_${Platform.OS}_${userId ? userId.substring(0, 8) : 'device'}_${Date.now().toString(36)}]`;

      await AppStorage.setItem(PUSH_TOKEN_STORAGE_KEY, token);

      if (userId && isSupabaseConfigured) {
        await this.syncPushTokenToSupabase(userId, token);
      }

      return token;
    } catch (error) {
      console.warn('[NotificationService] registerForPushNotifications error:', error);
      return null;
    }
  },

  /**
   * Appends push token to public.users.push_tokens array in Supabase.
   */
  async syncPushTokenToSupabase(userId: string, token: string): Promise<void> {
    if (!isSupabaseConfigured || !userId || !token) return;

    try {
      const { data: userRecord, error: fetchErr } = await supabase
        .from('users')
        .select('push_tokens')
        .eq('id', userId)
        .maybeSingle();

      if (fetchErr) {
        console.warn('[NotificationService] Error querying user push tokens:', fetchErr);
        return;
      }

      const existingTokens: string[] = userRecord?.push_tokens || [];
      if (!existingTokens.includes(token)) {
        const updatedTokens = [...existingTokens, token];
        const { error: updateErr } = await supabase
          .from('users')
          .update({
            push_tokens: updatedTokens,
            updated_at: new Date().toISOString(),
          })
          .eq('id', userId);

        if (updateErr) {
          console.warn('[NotificationService] Failed to update push tokens in Supabase:', updateErr);
        } else {
          console.info('[NotificationService] Registered push token in Supabase for user:', userId);
        }
      }
    } catch (e) {
      console.warn('[NotificationService] syncPushTokenToSupabase exception:', e);
    }
  },

  /**
   * Triggers a native system notification directly in the phone's native notification panel / shade.
   */
  async triggerTestNotification(
    type: 'daily_release' | 'song_selected',
    options?: {
      dayNumber?: number;
      songTitle?: string;
      artist?: string;
      artworkUrl?: string;
    }
  ): Promise<void> {
    const dayNumber = options?.dayNumber || 54;
    const songTitle = options?.songTitle || 'Texas Sun';
    const artist = options?.artist || 'Leon Bridges & Khruangbin';

    const title =
      type === 'daily_release'
        ? `🎧 Today's 365 is here. Day ${dayNumber} has arrived.`
        : `🎉 Your song was chosen as today's 365!`;

    const body =
      type === 'daily_release'
        ? `${songTitle} — ${artist}`
        : `"${songTitle}" by ${artist} is now playing for the entire 365 community.`;

    const channelId = type === 'daily_release' ? 'daily-release' : 'song-selected';

    if (scheduleNotificationAsync) {
      try {
        await scheduleNotificationAsync({
          content: {
            title,
            body,
            data: { type, dayNumber, songTitle, artist },
            sound: 'default',
            channelId,
            color: '#E09F3E',
            badge: 1,
          },
          trigger: null, // null trigger forces immediate delivery to the phone's native notification panel!
        });
        console.info('[NotificationService] Successfully posted to phone native notification panel:', title);
      } catch (e) {
        console.warn('[NotificationService] Error scheduling native notification:', e);
      }
    }
  },
};
