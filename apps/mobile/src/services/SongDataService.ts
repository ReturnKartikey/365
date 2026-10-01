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

const CACHE_KEY_TODAY = '365_cache_today_song';
const CACHE_KEY_HISTORY = '365_cache_history_songs';

const INITIAL_DAILY_SONGS: DailySong[] = [
  {
    id: '2026-09-30',
    date: '2026-09-30',
    dayNumber: 47,
    songId: 'spotify_6rqhFgbbKwnb9MLmUQDhG6',
    song: {
      id: 'spotify_6rqhFgbbKwnb9MLmUQDhG6',
      title: 'Texas Sun',
      artist: 'Leon Bridges, Khruangbin',
      album: 'Texas Sun - EP',
      artworkUrl:
        'https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/ed/90/53/ed9053df-0476-f6aa-d7f2-8664fc589904/656605151465.jpg/600x600bb.jpg',
      provider: 'spotify',
      providerSongId: '6rqhFgbbKwnb9MLmUQDhG6',
      externalUrls: {
        spotify: 'https://open.spotify.com/track/6rqhFgbbKwnb9MLmUQDhG6',
        web: 'https://open.spotify.com/track/6rqhFgbbKwnb9MLmUQDhG6',
      },
      metadata: {
        durationMs: 252000,
        previewUrl:
          'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/64/0d/bc/640dbc64-93ac-1322-20bf-0c929bfcadb6/mzaf_10048206250487462970.plus.aac.p.m4a',
        isExplicit: false,
        genre: 'Soul / Psychedelic Rock',
        releaseYear: 2020,
        palette: {
          dominant: '#C67D5A',
        },
      },
      createdAt: '2026-09-30T13:30:00Z',
    },
    submitterId: 'usr_maya',
    submitterUsername: 'maya',
    submitterDisplayName: 'Maya Lin',
    publishedAt: '2026-09-30T13:30:00Z',
    status: 'published',
  },
  {
    id: '2026-09-29',
    date: '2026-09-29',
    dayNumber: 46,
    songId: 'spotify_2WfaOiMkCvy7Z5vo2Ycrz0',
    song: {
      id: 'spotify_2WfaOiMkCvy7Z5vo2Ycrz0',
      title: 'Says',
      artist: 'Nils Frahm',
      album: 'Spaces',
      artworkUrl:
        'https://is1-ssl.mzstatic.com/image/thumb/Music124/v4/25/3c/3e/253c3e06-cd31-0952-1b90-4de69a77def5/4050486102855_cover.jpg/600x600bb.jpg',
      provider: 'spotify',
      providerSongId: '2WfaOiMkCvy7Z5vo2Ycrz0',
      externalUrls: {
        spotify: 'https://open.spotify.com/track/2WfaOiMkCvy7Z5vo2Ycrz0',
        web: 'https://open.spotify.com/track/2WfaOiMkCvy7Z5vo2Ycrz0',
      },
      metadata: {
        durationMs: 518000,
        previewUrl:
          'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview211/v4/36/97/9c/36979c81-c97b-2323-9ada-96fa05a94785/mzaf_546068789723583981.plus.aac.p.m4a',
        isExplicit: false,
        genre: 'Modern Classical',
        releaseYear: 2013,
        palette: {
          dominant: '#5E6B73',
        },
      },
      createdAt: '2026-09-29T13:30:00Z',
    },
    submitterId: 'usr_julian',
    submitterUsername: 'juliank',
    submitterDisplayName: 'Julian K',
    publishedAt: '2026-09-29T13:30:00Z',
    status: 'published',
  },
  {
    id: '2026-09-28',
    date: '2026-09-28',
    dayNumber: 45,
    songId: 'spotify_0VjIjW4GlUZAMYd2vXMi3b',
    song: {
      id: 'spotify_0VjIjW4GlUZAMYd2vXMi3b',
      title: 'Blinding Lights',
      artist: 'The Weeknd',
      album: 'After Hours',
      artworkUrl:
        'https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/61/e7/3f/61e73f94-018d-5f50-50ec-8521952bc72e/20UM1IM11629.rgb.jpg/600x600bb.jpg',
      provider: 'spotify',
      providerSongId: '0VjIjW4GlUZAMYd2vXMi3b',
      externalUrls: {
        spotify: 'https://open.spotify.com/track/0VjIjW4GlUZAMYd2vXMi3b',
        web: 'https://open.spotify.com/track/0VjIjW4GlUZAMYd2vXMi3b',
      },
      metadata: {
        durationMs: 200040,
        previewUrl:
          'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview211/v4/12/73/ca/1273ca46-233a-5331-189b-25ac1d656533/mzaf_976341070785891411.plus.aac.p.m4a',
        isExplicit: false,
        genre: 'Synthwave',
        releaseYear: 2019,
        palette: {
          dominant: '#8C3A3A',
        },
      },
      createdAt: '2026-09-28T13:30:00Z',
    },
    submitterId: 'usr_sara',
    submitterUsername: 'sara_m',
    submitterDisplayName: 'Sara M',
    publishedAt: '2026-09-28T13:30:00Z',
    status: 'published',
  },
];

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

          inMemoryDailySongs = liveHistory;
          saveLocalCache(CACHE_KEY_HISTORY, liveHistory);
          return liveHistory;
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
