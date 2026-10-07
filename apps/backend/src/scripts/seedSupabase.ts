import { CURATED_DAILY_SONGS } from '@365/core';
import * as fs from 'fs';
import * as path from 'path';

// Helper to load .env
function loadEnv() {
  const envPaths = [
    path.resolve(__dirname, '../../../../.env'),
    path.resolve(__dirname, '../../../.env'),
    path.resolve(__dirname, '../../.env'),
    path.resolve(process.cwd(), '.env'),
  ];
  for (const p of envPaths) {
    if (fs.existsSync(p)) {
      const lines = fs.readFileSync(p, 'utf8').split('\n');
      for (const line of lines) {
        const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
        if (match) {
          const key = match[1];
          let val = (match[2] || '').trim();
          if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
          if (val.startsWith("'") && val.endsWith("'")) val = val.slice(1, -1);
          process.env[key] = val;
        }
      }
      break;
    }
  }
}

loadEnv();

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://yhecwvbxhrpnzxxzsgbm.supabase.co';
const serviceKey: string =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.EXPO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY ||
  '';

if (!serviceKey) {
  throw new Error('SUPABASE_SERVICE_ROLE_KEY environment variable is required.');
}

async function main() {
  console.log(`[SeedSupabase] Connecting to Supabase at: ${supabaseUrl}`);

  const headers: Record<string, string> = {
    apikey: serviceKey,
    Authorization: `Bearer ${serviceKey}`,
    'Content-Type': 'application/json',
    Prefer: 'resolution=merge-duplicates',
  };

  // 1. Clear out bad placeholder records from editorial_fallback_pool
  console.log('[SeedSupabase] Removing dummy placeholder records from editorial_fallback_pool...');
  await fetch(`${supabaseUrl}/rest/v1/editorial_fallback_pool?id=in.(fallback_01,fallback_02)`, {
    method: 'DELETE',
    headers,
  });

  // 2. Prepare 25 curated songs for editorial_fallback_pool
  console.log('[SeedSupabase] Seeding 25 curated songs into editorial_fallback_pool...');
  const poolRecords = CURATED_DAILY_SONGS.map((dailySong) => ({
    id: `fallback_${dailySong.song.providerSongId}`,
    song: dailySong.song,
    used: false,
    last_used_date: null,
  }));

  const poolRes = await fetch(`${supabaseUrl}/rest/v1/editorial_fallback_pool`, {
    method: 'POST',
    headers: {
      ...headers,
      Prefer: 'resolution=merge-duplicates',
    },
    body: JSON.stringify(poolRecords),
  });

  if (!poolRes.ok) {
    const errText = await poolRes.text();
    console.error('[SeedSupabase] Failed to seed editorial_fallback_pool:', errText);
  } else {
    console.log(`[SeedSupabase] Successfully seeded ${poolRecords.length} songs into editorial_fallback_pool.`);
  }

  // 3. Map the 25 curated songs to days leading up to today (October 7, 2026 = Day 54)
  console.log('[SeedSupabase] Updating daily_songs archive with verified audio previews...');
  // We align:
  // Day 54: 2026-10-07 (Today)
  // Day 53: 2026-10-06
  // Day 52: 2026-10-05
  // ... down to Day 30: 2026-09-13
  const targetDay = 54;
  const baseDate = new Date('2026-10-07T12:00:00Z');

  const dailySongRecords = CURATED_DAILY_SONGS.map((curated, idx) => {
    const dayNumber = targetDay - idx;
    const dateObj = new Date(baseDate);
    dateObj.setUTCDate(baseDate.getUTCDate() - idx);
    const dateStr = dateObj.toISOString().split('T')[0];

    return {
      id: dateStr,
      date: dateStr,
      day_number: dayNumber,
      song_id: curated.song.id,
      song: curated.song,
      submitter_id: null,
      submitter_username: curated.submitterUsername || '365editorial',
      submitter_display_name: curated.submitterDisplayName || '365 Editorial',
      status: 'published',
      published_at: `${dateStr}T13:30:00Z`,
      like_count: Math.floor(10 + Math.random() * 45),
    };
  });

  const dailyRes = await fetch(`${supabaseUrl}/rest/v1/daily_songs`, {
    method: 'POST',
    headers: {
      ...headers,
      Prefer: 'resolution=merge-duplicates',
    },
    body: JSON.stringify(dailySongRecords),
  });

  if (!dailyRes.ok) {
    const errText = await dailyRes.text();
    console.error('[SeedSupabase] Failed to upsert daily_songs:', errText);
  } else {
    console.log(`[SeedSupabase] Successfully seeded ${dailySongRecords.length} daily_songs (Day ${targetDay} down to Day ${targetDay - dailySongRecords.length + 1}).`);
  }

  // 4. Update config table to set last_day_number = 54
  console.log('[SeedSupabase] Updating config table last_day_number to 54...');
  const configRes = await fetch(`${supabaseUrl}/rest/v1/config?id=eq.app`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({
      last_day_number: targetDay,
      updated_at: new Date().toISOString(),
    }),
  });

  if (!configRes.ok) {
    const errText = await configRes.text();
    console.warn('[SeedSupabase] Config update note:', errText);
  } else {
    console.log('[SeedSupabase] Config table updated successfully.');
  }

  console.log('[SeedSupabase] Seeding completed successfully!');
}

main().catch((e) => {
  console.error('[SeedSupabase] Fatal error:', e);
  process.exit(1);
});
