import type {
  DailySong,
  Song,
  Submission,
  UserProfile,
  Report,
} from '@365/core';
import {
  SpotifyProvider,
  validateSubmissionEligibility,
} from '@365/core';
import { supabase, isSupabaseConfigured } from './supabase';
import { AppStorage } from './storage';

const spotifyProvider = new SpotifyProvider({
  clientId: process.env.EXPO_PUBLIC_SPOTIFY_CLIENT_ID || process.env.SPOTIFY_CLIENT_ID,
  clientSecret: process.env.EXPO_PUBLIC_SPOTIFY_CLIENT_SECRET || process.env.SPOTIFY_CLIENT_SECRET,
  enableFallback: true,
});

import { CURATED_DAILY_SONGS, FEATURED_CATALOG_SONGS } from './curatedSongs';

const CACHE_KEY_TODAY = '365_cache_today_song';
const CACHE_KEY_HISTORY = '365_cache_history_songs';

const INITIAL_DAILY_SONGS: DailySong[] = CURATED_DAILY_SONGS;

let inMemoryDailySongs = [...INITIAL_DAILY_SONGS];
let inMemorySubmissions: Submission[] = [];
let inMemoryReports: Report[] = [];

// Helper to save to local cache
async function saveLocalCache(key: string, data: any) {
  try {
    const serialized = JSON.stringify(data);
    await AppStorage.setItem(key, serialized);
  } catch {
    // Ignore cache error
  }
}

export const SongDataService = {
  /**
   * Synchronously returns today's song for instant UI render,
   * with automatic background remote fetch from Supabase.
   */
  getTodaySong(): DailySong {
    return inMemoryDailySongs[0];
  },

  /**
   * Fetches the latest live Today's Song from Supabase daily_songs table.
   * Updates in-memory and local cache.
   */
  async fetchLiveTodaySong(): Promise<DailySong> {
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('daily_songs')
          .select('*')
          .eq('status', 'published')
          .order('date', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (data && !error) {
          const liveSong: DailySong = {
            id: data.id,
            date: data.date,
            dayNumber: data.day_number,
            songId: data.song_id,
            song: data.song,
            submitterId: data.submitter_id || 'usr_community',
            submitterUsername: data.submitter_username || 'listener',
            submitterDisplayName: data.submitter_display_name,
            publishedAt: data.published_at,
            status: data.status,
          };

          inMemoryDailySongs[0] = liveSong;
          saveLocalCache(CACHE_KEY_TODAY, liveSong);
          return liveSong;
        }
      } catch (e) {
        console.warn('[SongDataService] Failed to fetch live today song from Supabase:', e);
      }
    }
    return inMemoryDailySongs[0];
  },

  /**
   * Returns list of released songs in descending chronological order.
   */
  getHistory(): DailySong[] {
    return inMemoryDailySongs;
  },

  /**
   * Fetches full history archive from Supabase daily_songs table.
   */
  async fetchLiveHistory(): Promise<DailySong[]> {
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('daily_songs')
          .select('*')
          .eq('status', 'published')
          .order('date', { ascending: false })
          .limit(100);

        if (data && !error && data.length > 0) {
          const liveHistory: DailySong[] = data.map((d: any) => ({
            id: d.id,
            date: d.date,
            dayNumber: d.day_number,
            songId: d.song_id,
            song: d.song,
            submitterId: d.submitter_id || 'usr_community',
            submitterUsername: d.submitter_username || 'listener',
            submitterDisplayName: d.submitter_display_name,
            publishedAt: d.published_at,
            status: d.status,
          }));

          // Merge live Supabase songs with curated collection so full library of 25 tracks is always accessible
          const merged = [...liveHistory];
          for (const s of CURATED_DAILY_SONGS) {
            if (!merged.some((m) => m.dayNumber === s.dayNumber || m.song.title.toLowerCase() === s.song.title.toLowerCase())) {
              merged.push(s);
            }
          }
          merged.sort((a, b) => b.dayNumber - a.dayNumber);

          inMemoryDailySongs = merged;
          saveLocalCache(CACHE_KEY_HISTORY, merged);
          return merged;
        }
      } catch (e) {
        console.warn('[SongDataService] Failed to fetch live history from Supabase:', e);
      }
    }
    return inMemoryDailySongs;
  },

  getDaySong(dayNumber: number): DailySong | null {
    return inMemoryDailySongs.find((d) => d.dayNumber === dayNumber) ?? null;
  },

  /**
   * Curated featured tracks to explore and listen to immediately before searching.
   */
  getFeaturedCatalog(): Song[] {
    return FEATURED_CATALOG_SONGS;
  },

  /**
   * Search track catalog using Spotify Web API (with offline fallback)
   */
  async searchCatalog(query: string): Promise<Song[]> {
    return spotifyProvider.searchTracks(query);
  },

  getActiveSubmissions(): Submission[] {
    return inMemorySubmissions.filter((s) => s.status === 'queued');
  },

  async getUserSubmission(userId: string): Promise<Submission | null> {
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('submissions')
          .select('*')
          .eq('user_id', userId)
          .eq('status', 'queued')
          .maybeSingle();

        if (data && !error) {
          return {
            id: data.id,
            songId: data.song_id,
            song: data.song,
            userId: data.user_id,
            submitterUsername: data.submitter_username,
            submitterDisplayName: data.submitter_display_name,
            submittedAt: data.submitted_at,
            status: data.status,
            note: data.note,
          };
        }
      } catch (e) {
        console.warn('[SongDataService] Error querying user submission:', e);
      }
    }
    return inMemorySubmissions.find((s) => s.userId === userId && s.status === 'queued') ?? null;
  },

  /**
   * Submits a song to the 365 queue.
   * If Supabase is connected, calls the atomic submit_song stored procedure.
   * If offline or in demo mode, validates via @365/core submissionRules.
   */
  async submitSong(
    song: Song,
    user: UserProfile,
    note?: string
  ): Promise<{ success: boolean; error?: string; errorCode?: string; submission?: Submission }> {
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase.rpc('submit_song', {
          p_song: song,
          p_note: note || null,
        });

        if (error) {
          return {
            success: false,
            error: error.message || 'Failed to submit song to 365 queue.',
          };
        }

        const submissionId = data?.submissionId || `sub_${Date.now()}`;
        const newSubmission: Submission = {
          id: submissionId,
          songId: song.id,
          song,
          userId: user.id,
          submitterUsername: user.username,
          submitterDisplayName: user.displayName,
          submittedAt: new Date().toISOString(),
          status: 'queued',
          note,
        };

        inMemorySubmissions.push(newSubmission);
        return { success: true, submission: newSubmission };
      } catch (e: any) {
        return { success: false, error: e?.message || 'Network error submitting song.' };
      }
    }

    // Offline / Demo Fallback Mode
    const eligibility = validateSubmissionEligibility(
      user,
      song.id,
      inMemorySubmissions,
      inMemorySubmissions
    );

    if (!eligibility.canSubmit) {
      return { success: false, error: eligibility.message, errorCode: eligibility.errorCode };
    }

    const newSubmission: Submission = {
      id: `sub_${Date.now()}_${song.providerSongId}`,
      songId: song.id,
      song,
      userId: user.id,
      submitterUsername: user.username,
      submitterDisplayName: user.displayName,
      submittedAt: new Date().toISOString(),
      status: 'queued',
      note,
    };

    inMemorySubmissions.push(newSubmission);
    return { success: true, submission: newSubmission };
  },

  /**
   * Submit an inappropriate song or user report.
   */
  async reportContent(report: Omit<Report, 'id' | 'createdAt' | 'status'>): Promise<{ success: boolean; reportId?: string }> {
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase.rpc('report_item', {
          p_target_type: report.targetType,
          p_target_id: report.targetId,
          p_reason: report.reason,
          p_notes: report.notes || null,
        });

        if (!error && data?.success) {
          return { success: true, reportId: data.reportId };
        }
      } catch (e) {
        console.warn('[SongDataService] Report submission network error:', e);
      }
    }

    const newReport: Report = {
      ...report,
      id: `rep_${Date.now()}`,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };
    inMemoryReports.push(newReport);
    return { success: true, reportId: newReport.id };
  },
};
