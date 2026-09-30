import {
  DailySong,
  Song,
  Submission,
  UserProfile,
  SpotifyProvider,
  validateSubmissionEligibility,
  Report,
} from '@365/core';

const spotifyProvider = new SpotifyProvider({ enableFallback: true });

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
      artworkUrl: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=1200&q=85',
      provider: 'spotify',
      providerSongId: '6rqhFgbbKwnb9MLmUQDhG6',
      externalUrls: {
        spotify: 'https://open.spotify.com/track/6rqhFgbbKwnb9MLmUQDhG6',
        web: 'https://open.spotify.com/track/6rqhFgbbKwnb9MLmUQDhG6',
      },
      metadata: {
        durationMs: 252000,
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
      artworkUrl: 'https://images.unsplash.com/photo-1465847899084-d164df4dedc6?auto=format&fit=crop&w=1200&q=85',
      provider: 'spotify',
      providerSongId: '2WfaOiMkCvy7Z5vo2Ycrz0',
      externalUrls: {
        spotify: 'https://open.spotify.com/track/2WfaOiMkCvy7Z5vo2Ycrz0',
        web: 'https://open.spotify.com/track/2WfaOiMkCvy7Z5vo2Ycrz0',
      },
      metadata: {
        durationMs: 518000,
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
      artworkUrl: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=1200&q=85',
      provider: 'spotify',
      providerSongId: '0VjIjW4GlUZAMYd2vXMi3b',
      externalUrls: {
        spotify: 'https://open.spotify.com/track/0VjIjW4GlUZAMYd2vXMi3b',
        web: 'https://open.spotify.com/track/0VjIjW4GlUZAMYd2vXMi3b',
      },
      metadata: {
        durationMs: 200040,
        isExplicit: false,
        genre: 'Synthwave',
        releaseYear: 2019,
        palette: {
          dominant: '#C42828',
        },
      },
      createdAt: '2026-09-28T13:30:00Z',
    },
    submitterId: 'usr_tariq',
    submitterUsername: 'tariq',
    submitterDisplayName: 'Tariq N',
    publishedAt: '2026-09-28T13:30:00Z',
    status: 'published',
  },
  {
    id: '2026-09-27',
    date: '2026-09-27',
    dayNumber: 44,
    songId: 'spotify_7qiZfU4dY1lWllzX7mPBI3',
    song: {
      id: 'spotify_7qiZfU4dY1lWllzX7mPBI3',
      title: 'Shape of You',
      artist: 'Ed Sheeran',
      album: '÷ (Divide)',
      artworkUrl: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=1200&q=85',
      provider: 'spotify',
      providerSongId: '7qiZfU4dY1lWllzX7mPBI3',
      externalUrls: {
        spotify: 'https://open.spotify.com/track/7qiZfU4dY1lWllzX7mPBI3',
        web: 'https://open.spotify.com/track/7qiZfU4dY1lWllzX7mPBI3',
      },
      metadata: {
        durationMs: 233712,
        isExplicit: false,
        palette: {
          dominant: '#297373',
        },
      },
      createdAt: '2026-09-27T13:30:00Z',
    },
    submitterId: 'usr_zoe',
    submitterUsername: 'zoe_m',
    submitterDisplayName: 'Zoe Miller',
    publishedAt: '2026-09-27T13:30:00Z',
    status: 'published',
  },
];

let inMemoryDailySongs = [...INITIAL_DAILY_SONGS];
let inMemorySubmissions: Submission[] = [];
let inMemoryReports: Report[] = [];

export const SongDataService = {
  getTodaySong(): DailySong {
    return inMemoryDailySongs[0];
  },

  getHistory(): DailySong[] {
    return inMemoryDailySongs;
  },

  getDaySong(dayNumber: number): DailySong | null {
    return inMemoryDailySongs.find((d) => d.dayNumber === dayNumber) ?? null;
  },

  async searchCatalog(query: string): Promise<Song[]> {
    return spotifyProvider.searchTracks(query);
  },

  getActiveSubmissions(): Submission[] {
    return inMemorySubmissions.filter((s) => s.status === 'queued');
  },

  getUserSubmission(userId: string): Submission | null {
    return inMemorySubmissions.find((s) => s.userId === userId && s.status === 'queued') ?? null;
  },

  submitSong(song: Song, user: UserProfile): { success: boolean; error?: string; submission?: Submission } {
    const eligibility = validateSubmissionEligibility(
      user,
      song.id,
      inMemorySubmissions,
      inMemorySubmissions
    );

    if (!eligibility.canSubmit) {
      return { success: false, error: eligibility.message };
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
    };

    inMemorySubmissions.push(newSubmission);
    return { success: true, submission: newSubmission };
  },

  reportContent(report: Omit<Report, 'id' | 'createdAt' | 'status'>): Report {
    const newReport: Report = {
      ...report,
      id: `rep_${Date.now()}`,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };
    inMemoryReports.push(newReport);
    return newReport;
  },
};
