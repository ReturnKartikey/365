import { Song, MusicProviderType } from '../types/index.js';
import { CatalogSearchOptions, MusicProvider } from './MusicProvider.js';

export interface SpotifyConfig {
  clientId?: string;
  clientSecret?: string;
  customFetch?: typeof fetch;
  enableFallback?: boolean;
}

interface SpotifyTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

interface SpotifyTrackItem {
  id: string;
  name: string;
  artists: Array<{ name: string }>;
  album: {
    name: string;
    images: Array<{ url: string; height?: number; width?: number }>;
  };
  duration_ms: number;
  explicit: boolean;
  preview_url: string | null;
  external_urls: {
    spotify: string;
  };
}

interface SpotifySearchResponse {
  tracks?: {
    items: SpotifyTrackItem[];
  };
}

/**
 * Curated offline fallback songs used when Spotify credentials are not configured or in offline mode.
 */
export const SAMPLE_FALLBACK_TRACKS: Song[] = [
  {
    id: 'spotify_6rqhFgbbKwnb9MLmUQDhG6',
    title: 'Texas Sun',
    artist: 'Leon Bridges, Khruangbin',
    album: 'Texas Sun - EP',
    artworkUrl: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=800&q=80',
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
        primary: '#C67D5A',
        background: '#1A1412',
        surface: '#2B201D',
      },
    },
    createdAt: new Date().toISOString(),
  },
  {
    id: 'spotify_0VjIjW4GlUZAMYd2vXMi3b',
    title: 'Blinding Lights',
    artist: 'The Weeknd',
    album: 'After Hours',
    artworkUrl: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=800&q=80',
    provider: 'spotify',
    providerSongId: '0VjIjW4GlUZAMYd2vXMi3b',
    externalUrls: {
      spotify: 'https://open.spotify.com/track/0VjIjW4GlUZAMYd2vXMi3b',
      web: 'https://open.spotify.com/track/0VjIjW4GlUZAMYd2vXMi3b',
    },
    metadata: {
      durationMs: 200040,
      isExplicit: false,
      genre: 'Synthwave / Pop',
      releaseYear: 2019,
      palette: {
        dominant: '#C42828',
        primary: '#E03E3E',
        background: '#180B0B',
        surface: '#2E1515',
      },
    },
    createdAt: new Date().toISOString(),
  },
  {
    id: 'spotify_5HCyWlXZPP0y6Gqq8TgA20',
    title: 'Stay',
    artist: 'The Kid LAROI, Justin Bieber',
    album: 'F*CK LOVE 3+: OVER YOU',
    artworkUrl: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=800&q=80',
    provider: 'spotify',
    providerSongId: '5HCyWlXZPP0y6Gqq8TgA20',
    externalUrls: {
      spotify: 'https://open.spotify.com/track/5HCyWlXZPP0y6Gqq8TgA20',
      web: 'https://open.spotify.com/track/5HCyWlXZPP0y6Gqq8TgA20',
    },
    metadata: {
      durationMs: 141806,
      isExplicit: true,
      genre: 'Pop',
      releaseYear: 2021,
      palette: {
        dominant: '#3D5A80',
        primary: '#4D729F',
        background: '#0D131A',
        surface: '#17222E',
      },
    },
    createdAt: new Date().toISOString(),
  },
  {
    id: 'spotify_7qiZfU4dY1lWllzX7mPBI3',
    title: 'Shape of You',
    artist: 'Ed Sheeran',
    album: '÷ (Divide)',
    artworkUrl: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=800&q=80',
    provider: 'spotify',
    providerSongId: '7qiZfU4dY1lWllzX7mPBI3',
    externalUrls: {
      spotify: 'https://open.spotify.com/track/7qiZfU4dY1lWllzX7mPBI3',
      web: 'https://open.spotify.com/track/7qiZfU4dY1lWllzX7mPBI3',
    },
    metadata: {
      durationMs: 233712,
      isExplicit: false,
      genre: 'Pop',
      releaseYear: 2017,
      palette: {
        dominant: '#297373',
        primary: '#3FA7A7',
        background: '#0D1717',
        surface: '#162828',
      },
    },
    createdAt: new Date().toISOString(),
  },
  {
    id: 'spotify_2WfaOiMkCvy7Z5vo2Ycrz0',
    title: 'Says',
    artist: 'Nils Frahm',
    album: 'Spaces',
    artworkUrl: 'https://images.unsplash.com/photo-1465847899084-d164df4dedc6?auto=format&fit=crop&w=800&q=80',
    provider: 'spotify',
    providerSongId: '2WfaOiMkCvy7Z5vo2Ycrz0',
    externalUrls: {
      spotify: 'https://open.spotify.com/track/2WfaOiMkCvy7Z5vo2Ycrz0',
      web: 'https://open.spotify.com/track/2WfaOiMkCvy7Z5vo2Ycrz0',
    },
    metadata: {
      durationMs: 518000,
      isExplicit: false,
      genre: 'Modern Classical / Ambient',
      releaseYear: 2013,
      palette: {
        dominant: '#5E6B73',
        primary: '#7E8E99',
        background: '#121415',
        surface: '#1F2426',
      },
    },
    createdAt: new Date().toISOString(),
  },
];

export class SpotifyProvider implements MusicProvider {
  public readonly providerName: MusicProviderType = 'spotify';
  private clientId?: string;
  private clientSecret?: string;
  private customFetch: typeof fetch;
  private enableFallback: boolean;

  private cachedAccessToken: string | null = null;
  private tokenExpiresAt: number = 0;

  constructor(config: SpotifyConfig = {}) {
    this.clientId = config.clientId;
    this.clientSecret = config.clientSecret;
    this.customFetch = config.customFetch ?? globalThis.fetch;
    this.enableFallback = config.enableFallback ?? true;
  }

  public getDeterministicId(providerSongId: string): string {
    return `spotify_${providerSongId.trim()}`;
  }

  public getListenUrl(song: Song): string {
    return song.externalUrls.spotify || song.externalUrls.web || `https://open.spotify.com/track/${song.providerSongId}`;
  }

  private async getAccessToken(): Promise<string | null> {
    if (!this.clientId || !this.clientSecret) {
      return null;
    }

    const now = Date.now();
    if (this.cachedAccessToken && now < this.tokenExpiresAt - 60_000) {
      return this.cachedAccessToken;
    }

    try {
      const basicAuth = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');
      const response = await this.customFetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: {
          Authorization: `Basic ${basicAuth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: 'grant_type=client_credentials',
      });

      if (!response.ok) {
        throw new Error(`Spotify token error: ${response.status} ${response.statusText}`);
      }

      const data = (await response.json()) as SpotifyTokenResponse;
      this.cachedAccessToken = data.access_token;
      this.tokenExpiresAt = Date.now() + data.expires_in * 1000;
      return this.cachedAccessToken;
    } catch (err) {
      console.warn('[SpotifyProvider] Failed to obtain access token, will use fallback if enabled:', err);
      return null;
    }
  }

  public async searchTracks(query: string, options: CatalogSearchOptions = {}): Promise<Song[]> {
    const trimmed = query.trim();
    if (!trimmed) {
      return [];
    }

    const token = await this.getAccessToken();

    if (!token) {
      if (this.enableFallback) {
        return this.searchFallback(trimmed, options.limit ?? 20);
      }
      return [];
    }

    const limit = Math.min(options.limit ?? 20, 50);
    const offset = options.offset ?? 0;
    const url = new URL('https://api.spotify.com/v1/search');
    url.searchParams.set('type', 'track');
    url.searchParams.set('q', trimmed);
    url.searchParams.set('limit', limit.toString());
    url.searchParams.set('offset', offset.toString());
    if (options.market) {
      url.searchParams.set('market', options.market);
    }

    const response = await this.customFetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      console.warn(`[SpotifyProvider] Search failed with status ${response.status}`);
      if (this.enableFallback) {
        return this.searchFallback(trimmed, limit);
      }
      return [];
    }

    const data = (await response.json()) as SpotifySearchResponse;
    const items = data.tracks?.items ?? [];

    return items.map((track) => this.mapSpotifyTrack(track));
  }

  public async getTrack(trackId: string): Promise<Song | null> {
    const token = await this.getAccessToken();

    if (!token) {
      if (this.enableFallback) {
        const found = SAMPLE_FALLBACK_TRACKS.find(
          (t) => t.providerSongId === trackId || t.id === trackId
        );
        return found ?? null;
      }
      return null;
    }

    const cleanTrackId = trackId.replace(/^spotify_/, '');
    const response = await this.customFetch(`https://api.spotify.com/v1/tracks/${cleanTrackId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      if (response.status === 404) return null;
      console.warn(`[SpotifyProvider] GetTrack failed with status ${response.status}`);
      if (this.enableFallback) {
        return SAMPLE_FALLBACK_TRACKS.find((t) => t.providerSongId === cleanTrackId) ?? null;
      }
      return null;
    }

    const track = (await response.json()) as SpotifyTrackItem;
    return this.mapSpotifyTrack(track);
  }

  private searchFallback(query: string, limit: number): Song[] {
    const q = query.toLowerCase();
    const matches = SAMPLE_FALLBACK_TRACKS.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        t.artist.toLowerCase().includes(q) ||
        t.album.toLowerCase().includes(q)
    );

    if (matches.length > 0) {
      return matches.slice(0, limit);
    }

    // If query didn't match the sample list, return a mock result modeled on the user query
    // so testers can always interact with the search UI even offline
    const syntheticTrack: Song = {
      id: this.getDeterministicId(`sim_${encodeURIComponent(query.slice(0, 16))}`),
      title: query.charAt(0).toUpperCase() + query.slice(1),
      artist: 'Simulated Artist',
      album: 'Discovery Edition',
      artworkUrl: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=800&q=80',
      provider: 'spotify',
      providerSongId: `sim_${encodeURIComponent(query.slice(0, 16))}`,
      externalUrls: {
        spotify: `https://open.spotify.com/search/${encodeURIComponent(query)}`,
        web: `https://open.spotify.com/search/${encodeURIComponent(query)}`,
      },
      metadata: {
        durationMs: 215000,
        isExplicit: false,
        palette: {
          dominant: '#3D5A80',
          primary: '#5C7EAA',
          background: '#0F151C',
          surface: '#1A2430',
        },
      },
      createdAt: new Date().toISOString(),
    };

    return [syntheticTrack, ...SAMPLE_FALLBACK_TRACKS.slice(0, limit - 1)];
  }

  private mapSpotifyTrack(track: SpotifyTrackItem): Song {
    const artworkUrl =
      track.album.images.length > 0
        ? track.album.images[0].url
        : 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=800&q=80';

    return {
      id: this.getDeterministicId(track.id),
      title: track.name,
      artist: track.artists.map((a) => a.name).join(', '),
      album: track.album.name,
      artworkUrl,
      provider: 'spotify',
      providerSongId: track.id,
      externalUrls: {
        spotify: track.external_urls.spotify,
        web: track.external_urls.spotify,
      },
      metadata: {
        durationMs: track.duration_ms,
        isExplicit: track.explicit,
        previewUrl: track.preview_url,
      },
      createdAt: new Date().toISOString(),
    };
  }
}
