import { Platform } from 'react-native';
import Constants from 'expo-constants';
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

// Offline/Fallback provider without client secret
const fallbackSpotifyProvider = new SpotifyProvider({
  clientId: process.env.EXPO_PUBLIC_SPOTIFY_CLIENT_ID,
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

          if (inMemoryDailySongs.length > 0 && inMemoryDailySongs[0].id !== liveSong.id) {
            const existingIdx = inMemoryDailySongs.findIndex((s) => s.id === liveSong.id);
            if (existingIdx > 0) inMemoryDailySongs.splice(existingIdx, 1);
            inMemoryDailySongs.unshift(liveSong);
          } else {
            inMemoryDailySongs[0] = liveSong;
          }
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
   * Search track catalog using secure server-side Spotify API proxy.
   * Shields credentials and falls back gracefully to offline catalog.
   */
  async searchCatalog(query: string): Promise<Song[]> {
    if (!query || !query.trim()) return [];

    try {
      const hostUri = Constants.expoConfig?.hostUri;
      const hostIp = hostUri ? hostUri.split(':')[0] : null;
      const apiHost =
        hostIp && hostIp !== 'localhost' && hostIp !== '127.0.0.1'
          ? hostIp
          : Platform.OS === 'android'
          ? '10.0.2.2'
          : 'localhost';

      const searchUrl = `http://${apiHost}:3001/api/spotify/search?q=${encodeURIComponent(query.trim())}`;
      const res = await fetch(searchUrl);

      if (res.ok) {
        const json = await res.json();
        if (Array.isArray(json?.tracks) && json.tracks.length > 0) {
          return json.tracks;
        }
      }
    } catch (err) {
      console.warn('[SongDataService] Server Spotify search proxy unavailable, falling back:', err);
    }

    // Graceful offline fallback
    return fallbackSpotifyProvider.searchTracks(query);
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

  /**
   * Retrieves array of liked daily song IDs stored locally.
   */
  async getLikedSongIds(): Promise<string[]> {
    try {
      const stored = await AppStorage.getItem('365_liked_song_ids');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  },

  /**
   * Returns true if a given song or daily release ID has been liked.
   */
  async isSongLiked(id: string): Promise<boolean> {
    const list = await this.getLikedSongIds();
    return list.includes(id);
  },

  /**
   * Toggles like state for a daily song release.
   */
  async toggleLikeSong(dailyId: string): Promise<{ isLiked: boolean; newCount?: number }> {
    let list = await this.getLikedSongIds();
    let isNowLiked = false;

    if (list.includes(dailyId)) {
      list = list.filter((item) => item !== dailyId);
      isNowLiked = false;
    } else {
      list.push(dailyId);
      isNowLiked = true;
    }

    try {
      await AppStorage.setItem('365_liked_song_ids', JSON.stringify(list));
    } catch (e) {
      console.warn('[SongDataService] Error saving liked song:', e);
    }

    // Best-effort like sync to Supabase daily_songs
    if (isSupabaseConfigured) {
      try {
        const { data: current } = await supabase
          .from('daily_songs')
          .select('like_count')
          .eq('id', dailyId)
          .maybeSingle();

        const curCount = current?.like_count || 0;
        const newCount = Math.max(0, curCount + (isNowLiked ? 1 : -1));

        await supabase
          .from('daily_songs')
          .update({ like_count: newCount })
          .eq('id', dailyId);

        return { isLiked: isNowLiked, newCount };
      } catch (err) {
        console.warn('[SongDataService] Like count sync error:', err);
      }
    }

    return { isLiked: isNowLiked };
  },
};
