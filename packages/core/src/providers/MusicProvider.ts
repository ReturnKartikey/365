import { Song, MusicProviderType } from '../types/index.js';

export interface CatalogSearchOptions {
  limit?: number;
  offset?: number;
  market?: string;
}

export interface MusicProvider {
  readonly providerName: MusicProviderType;

  /**
   * Search for tracks by track title, artist, or album.
   */
  searchTracks(query: string, options?: CatalogSearchOptions): Promise<Song[]>;

  /**
   * Fetch single track details by provider ID.
   */
  getTrack(trackId: string): Promise<Song | null>;

  /**
   * Generate canonical deterministic song ID.
   * e.g. "spotify_4cOdK2wGLETKBW3PvgPWqT"
   */
  getDeterministicId(providerSongId: string): string;

  /**
   * Get direct deep link / web link for track.
   */
  getListenUrl(song: Song): string;
}
