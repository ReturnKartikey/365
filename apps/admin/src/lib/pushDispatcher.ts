import { supabase, isSupabaseConfigured } from './supabase';

export interface DailyReleasePushParams {
  dayNumber: number;
  song: {
    id: string;
    title: string;
    artist: string;
    album?: string;
    albumArt?: string;
  };
  submitterId?: string | null;
  submitterUsername?: string | null;
}

export interface ExpoPushMessage {
  to: string | string[];
  title: string;
  subtitle?: string;
  body: string;
  data?: Record<string, any>;
  sound?: 'default' | null;
  channelId?: string;
  priority?: 'default' | 'normal' | 'high';
  color?: string;
  badge?: number;
}

export const PushDispatcher = {
  /**
   * Dispatches push notifications for a new daily release:
   * 1. Community ritual alert to all subscribed listeners.
   * 2. Dedicated submitter alert if the song came from a community queue submission.
   */
  async dispatchDailyRelease(params: DailyReleasePushParams): Promise<{
    success: boolean;
    communityTokensSent: number;
    submitterNotified: boolean;
    errors?: string[];
  }> {
    const { dayNumber, song, submitterId } = params;
    const errors: string[] = [];
    let communityTokensSent = 0;
    let submitterNotified = false;

    if (!isSupabaseConfigured) {
      console.info('[PushDispatcher] Supabase not configured. Push dispatch skipped.');
      return { success: true, communityTokensSent: 0, submitterNotified: false };
    }

    try {
      // 1. Fetch all users eligible for daily release notifications
      const { data: users, error: usersErr } = await supabase
        .from('users')
        .select('id, push_tokens, notification_prefs');

      if (usersErr) {
        console.error('[PushDispatcher] Error querying users for push notifications:', usersErr);
        errors.push(usersErr.message);
        return { success: false, communityTokensSent: 0, submitterNotified: false, errors };
      }

      const communityTokens: string[] = [];
      const submitterTokens: string[] = [];

      for (const u of users || []) {
        const tokens: string[] = u.push_tokens || [];
        if (!tokens.length) continue;

        // Check user's notification preference for dailyRelease
        const prefs = u.notification_prefs || {};
        const dailySubscribed =
          prefs.dailyRelease !== false && prefs.daily_release !== false;

        if (dailySubscribed) {
          communityTokens.push(...tokens);
        }

        // Check if this user is the submitter
        if (submitterId && u.id === submitterId) {
          const songSubscribed =
            prefs.songSelected !== false && prefs.song_selected !== false;
          if (songSubscribed) {
            submitterTokens.push(...tokens);
          }
        }
      }

      // 2. Dispatch Submitter Alert if queued song was chosen
      if (submitterTokens.length > 0) {
        const submitterMessage: ExpoPushMessage = {
          to: submitterTokens,
          title: "🎉 Your song was chosen as today's 365!",
          subtitle: 'Community Queue Selection',
          body: `"${song.title}" by ${song.artist} is now playing for the entire 365 community today.`,
          sound: 'default',
          channelId: 'song-selected',
          priority: 'high',
          color: '#E09F3E',
          badge: 1,
          data: {
            type: 'song_selected',
            dayNumber,
            songId: song.id,
            songTitle: song.title,
            artist: song.artist,
            artworkUrl: song.albumArt,
          },
        };

        const res = await this.sendExpoPush([submitterMessage]);
        submitterNotified = res.success;
        if (!res.success && res.error) errors.push(res.error);
      }

      // 3. Dispatch Community Ritual Alert to all listeners
      if (communityTokens.length > 0) {
        // Filter out duplicates
        const uniqueTokens = Array.from(new Set(communityTokens));
        communityTokensSent = uniqueTokens.length;

        const communityMessage: ExpoPushMessage = {
          to: uniqueTokens,
          title: '365',
          subtitle: `Day ${dayNumber} has arrived • 7:00 PM IST`,
          body: `🎧 Today's 365 is here. ${song.title} — ${song.artist}`,
          sound: 'default',
          channelId: 'daily-release',
          priority: 'high',
          color: '#E09F3E',
          badge: 1,
          data: {
            type: 'daily_release',
            dayNumber,
            songId: song.id,
            songTitle: song.title,
            artist: song.artist,
            artworkUrl: song.albumArt,
          },
        };

        const res = await this.sendExpoPush([communityMessage]);
        if (!res.success && res.error) errors.push(res.error);
      }

      console.info(
        `[PushDispatcher] Dispatched release Day ${dayNumber}: ${communityTokensSent} community listeners, submitter notified: ${submitterNotified}`
      );

      return {
        success: errors.length === 0,
        communityTokensSent,
        submitterNotified,
        errors: errors.length ? errors : undefined,
      };
    } catch (e: any) {
      console.error('[PushDispatcher] Unexpected error in dispatchDailyRelease:', e);
      return {
        success: false,
        communityTokensSent,
        submitterNotified,
        errors: [e?.message || 'Unknown push dispatch error'],
      };
    }
  },

  /**
   * Sends batches of push messages via the Expo Push API.
   */
  async sendExpoPush(messages: ExpoPushMessage[]): Promise<{ success: boolean; error?: string }> {
    try {
      // Flatten messages if "to" is an array
      const flattened: any[] = [];
      for (const m of messages) {
        if (Array.isArray(m.to)) {
          // Expo accepts up to 100 recipients per message or batch
          const chunkSize = 90;
          for (let i = 0; i < m.to.length; i += chunkSize) {
            const chunk = m.to.slice(i, i + chunkSize);
            flattened.push({ ...m, to: chunk });
          }
        } else {
          flattened.push(m);
        }
      }

      if (flattened.length === 0) return { success: true };

      const response = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Accept-Encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(flattened),
      });

      const data = await response.json();
      if (!response.ok) {
        return {
          success: false,
          error: data?.errors?.[0]?.message || `HTTP ${response.status} from Expo Push API`,
        };
      }

      return { success: true };
    } catch (err: any) {
      console.warn('[PushDispatcher] sendExpoPush network error:', err);
      return { success: false, error: err?.message || 'Network error reaching Expo Push API' };
    }
  },
};
