import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  SpotifyProvider,
  ManualSongSelector,
  validateSubmissionEligibility,
  UserProfile,
  Submission,
  DailySong,
} from '../index.js';

describe('@365/core - MusicProvider & SpotifyProvider', () => {
  const provider = new SpotifyProvider({ enableFallback: true });

  it('generates canonical deterministic song ID', () => {
    const id = provider.getDeterministicId('6rqhFgbbKwnb9MLmUQDhG6');
    assert.strictEqual(id, 'spotify_6rqhFgbbKwnb9MLmUQDhG6');
  });

  it('returns search results matching query via fallback catalog', async () => {
    const results = await provider.searchTracks('Texas Sun');
    assert.ok(results.length > 0);
    assert.strictEqual(results[0].title, 'Texas Sun');
    assert.strictEqual(results[0].provider, 'spotify');
    assert.ok(results[0].id.startsWith('spotify_'));
    assert.ok(results[0].artworkUrl.length > 0);
  });

  it('retrieves track by ID', async () => {
    const track = await provider.getTrack('spotify_1485581309');
    assert.ok(track);
    assert.strictEqual(track?.title, 'Texas Sun');
    assert.ok(provider.getListenUrl(track!).includes('spotify.com'));
  });

  it('generates valid search results for any artist query', async () => {
    const results = await provider.searchTracks('Dua Lipa');
    assert.ok(results.length > 0);
    assert.ok(results[0].artist.toLowerCase().includes('dua lipa'));
    assert.ok(results[0].metadata?.previewUrl);
  });
});

describe('@365/core - SongSelector', () => {
  const selector = new ManualSongSelector();

  const dummySong = {
    id: 'spotify_6rqhFgbbKwnb9MLmUQDhG6',
    title: 'Texas Sun',
    artist: 'Leon Bridges',
    album: 'Texas Sun',
    artworkUrl: 'https://example.com/art.jpg',
    provider: 'spotify' as const,
    providerSongId: '6rqhFgbbKwnb9MLmUQDhG6',
    externalUrls: { spotify: 'https://open.spotify.com/track/6rqhFgbbKwnb9MLmUQDhG6' },
    metadata: {},
    createdAt: new Date().toISOString(),
  };

  it('picks pre-scheduled manual song for targetDate', async () => {
    const scheduledSong: DailySong = {
      id: '2026-09-30',
      date: '2026-09-30',
      dayNumber: 47,
      songId: dummySong.id,
      song: dummySong,
      submitterId: 'user_123',
      submitterUsername: 'maya',
      publishedAt: null,
      status: 'scheduled',
    };

    const result = await selector.selectSong({
      targetDate: '2026-09-30',
      dayNumber: 47,
      scheduledSong,
      activeQueue: [],
    });

    assert.strictEqual(result.source, 'scheduled_manual');
    assert.strictEqual(result.songSelected?.songId, dummySong.id);
    assert.strictEqual(result.songSelected?.status, 'published');
  });

  it('gracefully falls back to oldest queued submission if not scheduled', async () => {
    const candidateSubmission: Submission = {
      id: 'sub_1',
      songId: dummySong.id,
      song: dummySong,
      userId: 'user_456',
      submitterUsername: 'alex',
      submitterDisplayName: 'Alex P',
      submittedAt: '2026-09-29T10:00:00Z',
      status: 'queued',
    };

    const result = await selector.selectSong({
      targetDate: '2026-09-30',
      dayNumber: 47,
      scheduledSong: null,
      activeQueue: [candidateSubmission],
    });

    assert.strictEqual(result.source, 'algorithmic_fallback');
    assert.strictEqual(result.songSelected?.submitterUsername, 'alex');
    assert.strictEqual(result.songSelected?.dayNumber, 47);
  });

  it('returns source none without crashing when queue is empty', async () => {
    const result = await selector.selectSong({
      targetDate: '2026-09-30',
      dayNumber: 47,
      scheduledSong: null,
      activeQueue: [],
    });

    assert.strictEqual(result.source, 'none');
    assert.strictEqual(result.songSelected, null);
    assert.ok(result.warningMessage);
  });
});

describe('@365/core - Submission Rules & Deduplication', () => {
  const baseUser: UserProfile = {
    id: 'user_1',
    authProvider: 'google',
    displayName: 'Sam Singer',
    username: 'samsinger',
    isGuest: false,
    isBanned: false,
    notificationPrefs: { dailyRelease: true, songSelected: true },
    fcmTokens: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  it('denies guest users from submitting with specific message', () => {
    const guestUser: UserProfile = { ...baseUser, isGuest: true, authProvider: 'guest' };
    const res = validateSubmissionEligibility(guestUser, 'spotify_123', [], []);
    assert.strictEqual(res.canSubmit, false);
    assert.strictEqual(res.errorCode, 'GUEST_UNAUTHORIZED');
    assert.strictEqual(res.message, 'Sign in with Google to submit a song.');
  });

  it('denies banned users', () => {
    const bannedUser: UserProfile = { ...baseUser, isBanned: true };
    const res = validateSubmissionEligibility(bannedUser, 'spotify_123', [], []);
    assert.strictEqual(res.canSubmit, false);
    assert.strictEqual(res.errorCode, 'USER_BANNED');
  });

  it('enforces one active submission per user', () => {
    const activeSub: Submission = {
      id: 'sub_exist',
      songId: 'spotify_999',
      song: {} as any,
      userId: baseUser.id,
      submitterUsername: 'samsinger',
      submitterDisplayName: 'Sam',
      submittedAt: new Date().toISOString(),
      status: 'queued',
    };

    const res = validateSubmissionEligibility(baseUser, 'spotify_new_song', [activeSub], []);
    assert.strictEqual(res.canSubmit, false);
    assert.strictEqual(res.errorCode, 'ACTIVE_SUBMISSION_EXISTS');
  });

  it('prevents duplicate active submission for the same song', () => {
    const existingSongSub: Submission = {
      id: 'sub_song_dup',
      songId: 'spotify_dup_id',
      song: {} as any,
      userId: 'user_other',
      submitterUsername: 'otheruser',
      submitterDisplayName: 'Other',
      submittedAt: new Date().toISOString(),
      status: 'queued',
    };

    const res = validateSubmissionEligibility(baseUser, 'spotify_dup_id', [], [existingSongSub]);
    assert.strictEqual(res.canSubmit, false);
    assert.strictEqual(res.errorCode, 'SONG_ALREADY_QUEUED');
    assert.strictEqual(res.message, 'This song is already in the 365 queue.');
  });

  it('approves valid submission when user has no active queue and song is unique', () => {
    const res = validateSubmissionEligibility(baseUser, 'spotify_fresh_track', [], []);
    assert.strictEqual(res.canSubmit, true);
  });
});
