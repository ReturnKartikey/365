/**
 * Triggers the 365 daily release stored procedure on Supabase.
 * Usage: node scripts/triggerRelease.js
 */
async function triggerRelease() {
  const fs = require('fs');
  const path = require('path');

  // Load .env automatically
  const envPaths = [
    path.resolve(process.cwd(), '.env'),
    path.resolve(__dirname, '../.env'),
    path.resolve(__dirname, '../apps/mobile/.env'),
    path.resolve(__dirname, '../apps/admin/.env.local'),
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
          if (!process.env[key]) process.env[key] = val;
        }
      }
    }
  }

  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || 'https://yhecwvbxhrpnzxxzsgbm.supabase.co';
  const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const authKey = serviceKey || anonKey;

  if (!supabaseUrl || !authKey) {
    console.error('Error: Supabase URL and Key must be set in .env');
    process.exit(1);
  }

  console.log(`[365 Release] Triggering atomic daily release at ${supabaseUrl}...`);
  try {
    const res = await fetch(`${supabaseUrl}/rest/v1/rpc/execute_daily_release`, {
      method: 'POST',
      headers: {
        apikey: authKey,
        Authorization: `Bearer ${authKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}),
    });

    const data = await res.json();
    console.log('[365 Release] Result:', JSON.stringify(data, null, 2));

    if (data && data.success) {
      console.log(`[365 Release] Day ${data.dayNumber} successfully processed: ${data.song?.title || 'Editorial'} by ${data.song?.artist || ''}`);

      // Dispatch Expo Push Notifications to mobile listeners
      if (data.song) {
        console.log('[365 Release] Querying registered push notification tokens...');
        try {
          const usersRes = await fetch(`${supabaseUrl}/rest/v1/users?select=id,push_tokens,notification_prefs`, {
            headers: {
              apikey: authKey,
              Authorization: `Bearer ${authKey}`,
            },
          });
          const users = await usersRes.json();
          
          if (Array.isArray(users)) {
            const communityTokens = [];
            const submitterTokens = [];
            const submitterId = data.submitterId;

            for (const u of users) {
              const tokens = u.push_tokens || [];
              if (!tokens.length) continue;
              const prefs = u.notification_prefs || {};
              const dailySubscribed = prefs.dailyRelease !== false && prefs.daily_release !== false;

              if (dailySubscribed) {
                communityTokens.push(...tokens);
              }

              if (submitterId && u.id === submitterId) {
                const songSubscribed = prefs.songSelected !== false && prefs.song_selected !== false;
                if (songSubscribed) {
                  submitterTokens.push(...tokens);
                }
              }
            }

            const uniqueTokens = Array.from(new Set(communityTokens));
            console.log(`[365 Release] Found ${uniqueTokens.length} unique listener device token(s).`);

            const messages = [];

            // 1. Dedicated submitter alert
            if (submitterTokens.length > 0) {
              messages.push({
                to: submitterTokens,
                title: "🎉 Your song was chosen as today's 365!",
                subtitle: 'Community Queue Selection',
                body: `"${data.song.title}" by ${data.song.artist} is now playing for the entire 365 community today.`,
                sound: 'default',
                channelId: 'song-selected',
                priority: 'high',
                data: {
                  type: 'song_selected',
                  dayNumber: data.dayNumber,
                  songId: data.song.id,
                  songTitle: data.song.title,
                  artist: data.song.artist,
                  artworkUrl: data.song.artworkUrl,
                },
              });
            }

            // 2. Community broadcast alert
            if (uniqueTokens.length > 0) {
              messages.push({
                to: uniqueTokens,
                title: '365',
                subtitle: `Day ${data.dayNumber || 62} has arrived • 7:00 PM IST`,
                body: `🎧 Today's 365 is here. ${data.song.title} — ${data.song.artist}`,
                sound: 'default',
                channelId: 'daily-release',
                priority: 'high',
                data: {
                  type: 'daily_release',
                  dayNumber: data.dayNumber || 62,
                  songId: data.song.id,
                  songTitle: data.song.title,
                  artist: data.song.artist,
                  artworkUrl: data.song.artworkUrl,
                },
              });
            }

            // Dispatch in chunks of 90 via Expo Push API
            if (messages.length > 0) {
              const flattened = [];
              for (const m of messages) {
                if (Array.isArray(m.to)) {
                  for (let i = 0; i < m.to.length; i += 90) {
                    flattened.push({ ...m, to: m.to.slice(i, i + 90) });
                  }
                } else {
                  flattened.push(m);
                }
              }

              const pushRes = await fetch('https://exp.host/--/api/v2/push/send', {
                method: 'POST',
                headers: {
                  Accept: 'application/json',
                  'Accept-Encoding': 'gzip, deflate',
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify(flattened),
              });
              const pushData = await pushRes.json();
              console.log('[365 Release] Push broadcast delivered:', pushData);
            }
          }
        } catch (pushErr) {
          console.warn('[365 Release] Push notification dispatch warning:', pushErr);
        }
      }
    } else {
      console.warn('[365 Release] Release response:', data);
    }
  } catch (err) {
    console.error('[365 Release] Error triggering release:', err);
    process.exit(1);
  }
}

triggerRelease();
