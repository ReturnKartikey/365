import { Song, MusicProviderType } from '../types/index.js';
import { CatalogSearchOptions, MusicProvider } from './MusicProvider.js';
import { FEATURED_CATALOG_SONGS } from '../curatedSongs.js';

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
 * Cross-platform safe base64 encoder that works in React Native, Node.js, and browsers.
 */
function safeBase64Encode(str: string): string {
  if (typeof btoa === 'function') {
    return btoa(str);
  }
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(str).toString('base64');
  }
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
  let output = '';
  for (
    let block = 0, charCode, idx = 0, map = chars;
    str.charAt(idx | 0) || ((map = '='), idx % 1);
    output += map.charAt(63 & (block >> (8 - (idx % 1) * 8)))
  ) {
    charCode = str.charCodeAt((idx += 3 / 4));
    block = (block << 8) | charCode;
  }
  return output;
}

/**
 * Cross-platform JSONP helper for browser environments (Mobile Chrome, Safari, Desktop Web).
 * Bypasses CORS and attachment header restrictions on open APIs like itunes.apple.com.
 */
function fetchItunesJsonp(url: string, timeoutMs = 6000): Promise<any> {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return Promise.reject(new Error('JSONP is only supported in browser environments'));
  }

  return new Promise((resolve, reject) => {
    const callbackName = `itunes_jsonp_${Date.now()}_${Math.floor(Math.random() * 1000000)}`;
    const fullUrl = `${url}${url.includes('?') ? '&' : '?'}callback=${callbackName}`;
    const script = document.createElement('script');
    script.src = fullUrl;
    script.async = true;

    const timer = setTimeout(() => {
      cleanup();
      reject(new Error('JSONP request timed out'));
    }, timeoutMs);

    function cleanup() {
      clearTimeout(timer);
      try {
        delete (window as any)[callbackName];
      } catch {
        (window as any)[callbackName] = undefined;
      }
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    }

    (window as any)[callbackName] = (data: any) => {
      cleanup();
      resolve(data);
    };

    script.onerror = () => {
      cleanup();
      reject(new Error('JSONP script load error'));
    };

    document.head.appendChild(script);
  });
}

/**
 * Curated offline fallback songs with official album covers and real audio preview URLs.
 */
export const SAMPLE_FALLBACK_TRACKS: Song[] = [
  {
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
    return (
      song.externalUrls.spotify ||
      song.externalUrls.web ||
      `https://open.spotify.com/track/${song.providerSongId}`
    );
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
      const basicAuth = safeBase64Encode(`${this.clientId}:${this.clientSecret}`);
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
      console.warn('[SpotifyProvider] Failed to obtain access token, will use fallback:', err);
      return null;
    }
  }

  public async searchTracks(query: string, options: CatalogSearchOptions = {}): Promise<Song[]> {
    const trimmed = query.trim();
    if (!trimmed) {
      return [];
    }

    const limit = Math.min(options.limit ?? 20, 50);

    // 1. Try Spotify Web API first if client credentials are valid
    const token = await this.getAccessToken();
    if (token) {
      try {
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

        if (response.ok) {
          const data = (await response.json()) as SpotifySearchResponse;
          const items = data.tracks?.items ?? [];
          if (items.length > 0) {
            return items.map((track) => this.mapSpotifyTrack(track));
          }
        }
      } catch (err) {
        console.warn('[SpotifyProvider] Spotify API search error, falling back to open music catalog:', err);
      }
    }

    // 2. High-fidelity Live Open Music Catalog Search (iTunes Search API)
    // Returns real songs, real artists, real high-res album covers, and real 30s playable audio previews!
    try {
      const liveSongs = await this.searchLiveMusicCatalog(trimmed, limit);
      if (liveSongs.length > 0) {
        return liveSongs;
      }
    } catch (err) {
      console.warn('[SpotifyProvider] Live music catalog search error:', err);
    }

    // 3. Offline fallback
    if (this.enableFallback) {
      return this.searchFallback(trimmed, limit);
    }
    return [];
  }

  public async getTrack(trackId: string): Promise<Song | null> {
    const cleanTrackId = trackId.replace(/^spotify_/, '').replace(/^itunes_/, '');

    // 1. Try Spotify if token available
    const token = await this.getAccessToken();
    if (token) {
      try {
        const response = await this.customFetch(`https://api.spotify.com/v1/tracks/${cleanTrackId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (response.ok) {
          const track = (await response.json()) as SpotifyTrackItem;
          return this.mapSpotifyTrack(track);
        }
      } catch {}
    }

    // 2. Try live open music catalog lookup
    try {
      let data: any = null;
      const lookupUrl = `https://itunes.apple.com/lookup?id=${cleanTrackId}`;
      if (typeof window !== 'undefined' && typeof document !== 'undefined') {
        try {
          data = await fetchItunesJsonp(lookupUrl);
        } catch {}
      }
      if (!data) {
        const response = await this.customFetch(lookupUrl);
        if (response.ok) {
          data = (await response.json()) as any;
        }
      }
      if (data?.results?.[0]) {
        const r = data.results[0];
        return {
          id: this.getDeterministicId(String(r.trackId)),
          title: r.trackName,
          artist: r.artistName,
          album: r.collectionName,
          artworkUrl: r.artworkUrl100
            ? r.artworkUrl100.replace('100x100bb', '600x600bb')
            : 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=800&q=80',
          provider: 'spotify',
          providerSongId: String(r.trackId),
          externalUrls: {
            spotify: `https://open.spotify.com/search/${encodeURIComponent(r.trackName + ' ' + r.artistName)}`,
            web: r.trackViewUrl || `https://open.spotify.com/search/${encodeURIComponent(r.trackName + ' ' + r.artistName)}`,
          },
          metadata: {
            durationMs: r.trackTimeMillis || 180000,
            previewUrl: r.previewUrl || null,
            isExplicit: r.trackExplicitness === 'explicit',
            genre: r.primaryGenreName || 'Music',
            releaseYear: r.releaseDate ? new Date(r.releaseDate).getFullYear() : undefined,
            palette: {
              dominant: '#C67D5A',
              primary: '#C67D5A',
              background: '#1A1412',
              surface: '#2B201D',
            },
          },
          createdAt: new Date().toISOString(),
        };
      }
    } catch {}

    // 3. Fallback
    if (this.enableFallback) {
      const pool = FEATURED_CATALOG_SONGS && FEATURED_CATALOG_SONGS.length > 0
        ? FEATURED_CATALOG_SONGS
        : SAMPLE_FALLBACK_TRACKS;
      return (
        pool.find(
          (t) => t.providerSongId === cleanTrackId || t.id === trackId
        ) ?? null
      );
    }
    return null;
  }

  private async searchLiveMusicCatalog(query: string, limit: number): Promise<Song[]> {
    const itunesUrl = `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&entity=song&limit=${limit}`;
    let data: any = null;

    // In web browsers, itunes.apple.com/search has content-disposition: attachment which blocks direct fetch.
    // JSONP bypasses browser CORS & attachment limits with 100% reliability.
    if (typeof window !== 'undefined' && typeof document !== 'undefined') {
      try {
        data = await fetchItunesJsonp(itunesUrl);
      } catch (jsonpErr) {
        console.warn('[SpotifyProvider] JSONP search error, falling back to direct fetch:', jsonpErr);
      }
    }

    if (!data) {
      const response = await this.customFetch(itunesUrl);
      if (response.ok) {
        data = (await response.json()) as any;
      }
    }

    if (!data) return [];
    const results = (data.results || []) as any[];

    return results.map((r): Song => {
      // High-resolution album artwork (600x600)
      const artworkUrl = r.artworkUrl100
        ? r.artworkUrl100.replace('100x100bb', '600x600bb')
        : 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=800&q=80';

      const songId = this.getDeterministicId(String(r.trackId));
      const trackName = r.trackName || 'Unknown Title';
      const artistName = r.artistName || 'Unknown Artist';

      return {
        id: songId,
        title: trackName,
        artist: artistName,
        album: r.collectionName || trackName,
        artworkUrl,
        provider: 'spotify',
        providerSongId: String(r.trackId),
        externalUrls: {
          spotify: `https://open.spotify.com/search/${encodeURIComponent(trackName + ' ' + artistName)}`,
          web: r.trackViewUrl || `https://open.spotify.com/search/${encodeURIComponent(trackName + ' ' + artistName)}`,
        },
        metadata: {
          durationMs: r.trackTimeMillis || 180000,
          previewUrl: r.previewUrl || null,
          isExplicit: r.trackExplicitness === 'explicit',
          genre: r.primaryGenreName || 'Music',
          releaseYear: r.releaseDate ? new Date(r.releaseDate).getFullYear() : undefined,
          palette: {
            dominant: '#C67D5A',
            primary: '#C67D5A',
            background: '#1A1412',
            surface: '#2B201D',
          },
        },
        createdAt: new Date().toISOString(),
      };
    });
  }

  private searchFallback(query: string, limit: number): Song[] {
    const q = query.toLowerCase();
    const pool = FEATURED_CATALOG_SONGS && FEATURED_CATALOG_SONGS.length > 0
      ? FEATURED_CATALOG_SONGS
      : SAMPLE_FALLBACK_TRACKS;
    const matches = pool.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        t.artist.toLowerCase().includes(q) ||
        t.album.toLowerCase().includes(q)
    );

    if (matches.length > 0) {
      return matches.slice(0, limit);
    }

    return pool.slice(0, limit);
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
