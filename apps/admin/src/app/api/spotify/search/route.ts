import { NextResponse } from 'next/server';
import { SpotifyProvider } from '@365/core';

const clientId = process.env.SPOTIFY_CLIENT_ID || '7c34f8123e324539818512090ea20a8a';
const clientSecret = process.env.SPOTIFY_CLIENT_SECRET || 'd70e72fd2189424cb102e4128787668b';

const serverSpotifyProvider = new SpotifyProvider({
  clientId,
  clientSecret,
  enableFallback: true,
});

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}

/**
 * Server-side Spotify Search Proxy
 * Shields Spotify Client Secret from client bundles.
 * Caches access token in server memory.
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get('q') || '';
    const limit = parseInt(searchParams.get('limit') || '20', 10);

    if (!query.trim()) {
      return NextResponse.json(
        { tracks: [] },
        {
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
          },
        }
      );
    }

    const songs = await serverSpotifyProvider.searchTracks(query, { limit });

    return NextResponse.json(
      { tracks: songs },
      {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
        },
      }
    );
  } catch (error: any) {
    console.error('[API Spotify Search] Error querying tracks:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to search Spotify catalog', tracks: [] },
      {
        status: 500,
        headers: { 'Access-Control-Allow-Origin': '*' },
      }
    );
  }
}
