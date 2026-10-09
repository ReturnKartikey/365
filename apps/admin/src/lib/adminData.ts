import {
  DailySong,
  Submission,
  Report,
  AppConfig,
  Song,
  SpotifyProvider,
  CURATED_DAILY_SONGS,
} from '@365/core';
import { supabase, isSupabaseConfigured } from './supabase';
import { PushDispatcher } from './pushDispatcher';

export interface AdminStats {
  totalUsers: number;
  queueSize: number;
  totalDailySongs: number;
  pendingReports: number;
}

const spotifyProvider = new SpotifyProvider({ enableFallback: true });

// In-memory cache for fast initial renders
let cachedDailySongs: DailySong[] = [
  {
    ...CURATED_DAILY_SONGS[0],
    id: '2026-10-07',
    date: '2026-10-07',
    dayNumber: 54,
  },
  ...CURATED_DAILY_SONGS.slice(1),
];
let cachedSubmissions: Submission[] = [];
let cachedReports: Report[] = [];
let cachedConfig: AppConfig = {
  releaseTime: '19:00',
  timezone: 'Asia/Kolkata',
  lastDayNumber: 54,
};
let cachedStats: AdminStats = {
  totalUsers: 10,
  queueSize: 0,
  totalDailySongs: CURATED_DAILY_SONGS.length,
  pendingReports: 0,
};

function mapDailySong(row: any): DailySong {
  return {
    id: row.id,
    date: row.date,
    dayNumber: row.day_number,
    songId: row.song_id,
    song: row.song,
    submitterId: row.submitter_id || 'usr_editorial',
    submitterUsername: row.submitter_username || 'editorial',
    submitterDisplayName: row.submitter_display_name || '365 Editorial',
    publishedAt: row.published_at,
    status: row.status,
  };
}

function mapSubmission(row: any): Submission {
  return {
    id: row.id,
    userId: row.user_id,
    songId: row.song_id,
    song: row.song,
    submitterUsername: row.submitter_username,
    submitterDisplayName: row.submitter_display_name,
    note: row.note || undefined,
    status: row.status,
    submittedAt: row.submitted_at,
    selectedDate: row.selected_date || undefined,
    rejectionReason: row.rejection_reason || undefined,
  };
}

function mapReport(row: any): Report {
  return {
    id: row.id,
    reporterId: row.reporter_id || 'anonymous',
    targetType: row.target_type,
    targetId: row.target_id,
    reason: row.reason,
    status: row.status,
    notes: row.notes || undefined,
    createdAt: row.created_at,
  };
}

export const AdminDataService = {
  // Synchronous getters (return current in-memory cache)
  getStats(): AdminStats {
    return cachedStats;
  },

  getDailySongs(): DailySong[] {
    return cachedDailySongs;
  },

  getTodaySong(): DailySong | undefined {
    return cachedDailySongs.find((d) => d.status === 'published') || cachedDailySongs[0];
  },

  getSubmissions(): Submission[] {
    return cachedSubmissions;
  },

  getReports(): Report[] {
    return cachedReports;
  },

  getConfig(): AppConfig {
    return cachedConfig;
  },

  // Live Async Fetch Methods connected to Supabase
  async fetchStats(): Promise<AdminStats> {
    if (!isSupabaseConfigured) return cachedStats;

    try {
      const [usersRes, queueRes, songsRes, reportsRes] = await Promise.all([
        supabase.from('users').select('*', { count: 'exact', head: true }),
        supabase.from('submissions').select('*', { count: 'exact', head: true }).eq('status', 'queued'),
        supabase.from('daily_songs').select('*', { count: 'exact', head: true }),
        supabase.from('reports').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
      ]);

      cachedStats = {
        totalUsers: usersRes.count ?? 10,
        queueSize: queueRes.count ?? 0,
        totalDailySongs: songsRes.count ?? cachedDailySongs.length,
        pendingReports: reportsRes.count ?? 0,
      };
      return cachedStats;
    } catch (e) {
      console.warn('[AdminDataService] fetchStats error:', e);
      return cachedStats;
    }
  },

  async fetchDailySongs(): Promise<DailySong[]> {
    if (!isSupabaseConfigured) return cachedDailySongs;

    try {
      const { data, error } = await supabase
        .from('daily_songs')
        .select('*')
        .order('date', { ascending: false });

      if (data && !error && data.length > 0) {
        cachedDailySongs = data.map(mapDailySong);
      }
      return cachedDailySongs;
    } catch (e) {
      console.warn('[AdminDataService] fetchDailySongs error:', e);
      return cachedDailySongs;
    }
  },

  async fetchTodaySong(): Promise<DailySong | undefined> {
    if (!isSupabaseConfigured) return this.getTodaySong();

    try {
      const { data, error } = await supabase
        .from('daily_songs')
        .select('*')
        .eq('status', 'published')
        .order('date', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (data && !error) {
        return mapDailySong(data);
      }
    } catch (e) {
      console.warn('[AdminDataService] fetchTodaySong error:', e);
    }
    return this.getTodaySong();
  },

  async fetchSubmissions(): Promise<Submission[]> {
    if (!isSupabaseConfigured) return cachedSubmissions;

    try {
      const { data, error } = await supabase
        .from('submissions')
        .select('*')
        .order('submitted_at', { ascending: false });

      if (data && !error) {
        cachedSubmissions = data.map(mapSubmission);
      }
      return cachedSubmissions;
    } catch (e) {
      console.warn('[AdminDataService] fetchSubmissions error:', e);
      return cachedSubmissions;
    }
  },

  async fetchReports(): Promise<Report[]> {
    if (!isSupabaseConfigured) return cachedReports;

    try {
      const { data, error } = await supabase
        .from('reports')
        .select('*')
        .order('created_at', { ascending: false });

      if (data && !error) {
        cachedReports = data.map(mapReport);
      }
      return cachedReports;
    } catch (e) {
      console.warn('[AdminDataService] fetchReports error:', e);
      return cachedReports;
    }
  },

  async fetchConfig(): Promise<AppConfig> {
    if (!isSupabaseConfigured) return cachedConfig;

    try {
      const { data, error } = await supabase
        .from('config')
        .select('*')
        .eq('id', 'app')
        .maybeSingle();

      if (data && !error) {
        cachedConfig = {
          releaseTime: data.release_time || '19:00',
          timezone: data.timezone || 'Asia/Kolkata',
          lastDayNumber: data.last_day_number || 54,
        };
      }
      return cachedConfig;
    } catch (e) {
      console.warn('[AdminDataService] fetchConfig error:', e);
      return cachedConfig;
    }
  },

  async updateConfig(config: Partial<AppConfig>): Promise<AppConfig> {
    cachedConfig = { ...cachedConfig, ...config };

    if (isSupabaseConfigured) {
      try {
        await supabase
          .from('config')
          .update({
            release_time: cachedConfig.releaseTime,
            timezone: cachedConfig.timezone,
            last_day_number: cachedConfig.lastDayNumber,
            updated_at: new Date().toISOString(),
          })
          .eq('id', 'app');
      } catch (e) {
        console.warn('[AdminDataService] updateConfig error:', e);
      }
    }
    return { ...cachedConfig };
  },

  async scheduleSongForDate(
    date: string,
    song: Song,
    submitter: { id: string; username: string; displayName?: string }
  ): Promise<DailySong> {
    const existingIndex = cachedDailySongs.findIndex((d) => d.date === date);
    const dayNumber = existingIndex >= 0
      ? cachedDailySongs[existingIndex].dayNumber
      : cachedConfig.lastDayNumber + 1;

    const newDaily: DailySong = {
      id: date,
      date,
      dayNumber,
      songId: song.id,
      song,
      submitterId: submitter.id,
      submitterUsername: submitter.username,
      submitterDisplayName: submitter.displayName || submitter.username,
      publishedAt: null,
      status: 'scheduled',
    };

    if (isSupabaseConfigured) {
      try {
        await supabase.from('daily_songs').upsert({
          id: date,
          date,
          day_number: dayNumber,
          song_id: song.id,
          song,
          submitter_id: submitter.id.startsWith('usr_') || submitter.id.includes('-') ? submitter.id : null,
          submitter_username: submitter.username,
          submitter_display_name: submitter.displayName || submitter.username,
          status: 'scheduled',
        });

        // If this song was in community queue, update submission status
        await supabase
          .from('submissions')
          .update({ status: 'selected', selected_date: date })
          .eq('song_id', song.id)
          .eq('status', 'queued');
      } catch (e) {
        console.warn('[AdminDataService] scheduleSongForDate error:', e);
      }
    }

    if (existingIndex >= 0) {
      cachedDailySongs[existingIndex] = newDaily;
    } else {
      cachedDailySongs.unshift(newDaily);
    }

    return newDaily;
  },

  async removeSubmission(submissionId: string, reason?: string): Promise<void> {
    const sub = cachedSubmissions.find((s) => s.id === submissionId);
    if (sub) {
      sub.status = 'removed';
      sub.rejectionReason = reason || 'Removed by moderator';
    }

    if (isSupabaseConfigured) {
      try {
        await supabase
          .from('submissions')
          .update({
            status: 'removed',
            rejection_reason: reason || 'Removed by moderator',
          })
          .eq('id', submissionId);
      } catch (e) {
        console.warn('[AdminDataService] removeSubmission error:', e);
      }
    }
  },

  async resolveReport(reportId: string, action: 'dismissed' | 'resolved', notes?: string): Promise<void> {
    const rep = cachedReports.find((r) => r.id === reportId);
    if (rep) {
      rep.status = action;
      rep.notes = notes;
    }

    if (isSupabaseConfigured) {
      try {
        await supabase
          .from('reports')
          .update({
            status: action,
            notes: notes || null,
          })
          .eq('id', reportId);
      } catch (e) {
        console.warn('[AdminDataService] resolveReport error:', e);
      }
    }
  },

  async banUser(userId: string): Promise<void> {
    if (isSupabaseConfigured) {
      try {
        await supabase
          .from('users')
          .update({ is_banned: true })
          .eq('id', userId);

        await supabase
          .from('submissions')
          .update({
            status: 'rejected',
            rejection_reason: 'User account suspended for policy violation',
          })
          .eq('user_id', userId)
          .eq('status', 'queued');
      } catch (e) {
        console.warn('[AdminDataService] banUser error:', e);
      }
    }

    cachedSubmissions.forEach((sub) => {
      if (sub.userId === userId && sub.status === 'queued') {
        sub.status = 'rejected';
        sub.rejectionReason = 'User account suspended for policy violation';
      }
    });
  },

  /**
   * Triggers the atomic daily release stored procedure in Supabase.
   * If a target date is not provided, defaults to today in IST.
   */
  async triggerManualRelease(targetDate?: string): Promise<{
    success: boolean;
    alreadyPublished?: boolean;
    song?: any;
    message: string;
  }> {
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase.rpc('execute_daily_release', {
          p_target_date: targetDate || null,
        });

        if (error) {
          throw error;
        }

        // Refresh cached data
        await Promise.all([this.fetchStats(), this.fetchDailySongs()]);

        // Dispatch push notifications to community listeners and submitter
        if (data?.success && !data?.alreadyPublished && data?.song) {
          PushDispatcher.dispatchDailyRelease({
            dayNumber: data.dayNumber,
            song: data.song,
            submitterUsername: data.submitterUsername,
          }).catch((err) => console.warn('[AdminDataService] Push dispatch error:', err));
        }

        return {
          success: data?.success ?? true,
          alreadyPublished: data?.alreadyPublished ?? false,
          song: data?.song,
          message: data?.message || 'Daily release executed successfully with push notifications.',
        };
      } catch (e: any) {
        console.error('[AdminDataService] triggerManualRelease error:', e);
        return {
          success: false,
          message: e?.message || 'Failed to trigger manual release on Supabase.',
        };
      }
    }

    return {
      success: true,
      message: 'Demo mode: manual release simulated.',
    };
  },

  async searchCatalog(query: string): Promise<Song[]> {
    return spotifyProvider.searchTracks(query);
  },
};
