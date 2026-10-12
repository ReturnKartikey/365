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
    } else {
      console.warn('[365 Release] Release response:', data);
    }
  } catch (err) {
    console.error('[365 Release] Error triggering release:', err);
    process.exit(1);
  }
}

triggerRelease();
