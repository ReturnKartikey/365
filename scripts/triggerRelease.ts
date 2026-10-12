/**
 * Triggers the 365 daily release stored procedure on Supabase.
 * Usage: node dist/scripts/triggerRelease.js
 */
async function triggerRelease() {
  // Load .env automatically
  try {
    const fs = require('fs');
    const path = require('path');
    const envPaths = [
      path.resolve(__dirname, '../../../../.env'),
      path.resolve(__dirname, '../../../.env'),
      path.resolve(__dirname, '../../.env'),
      path.resolve(process.cwd(), '.env'),
    ];
    for (const p of envPaths) {
      if (fs.existsSync(p)) {
        if (typeof (process as any).loadEnvFile === 'function') {
          (process as any).loadEnvFile(p);
        } else {
          // Manual fallback parser
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
        }
        break;
      }
    }
  } catch {}

  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !anonKey) {
    console.error('Error: EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY must be set.');
    process.exit(1);
  }

  console.log(`[365 Release] Triggering daily release at ${supabaseUrl}...`);
  try {
    const res = await fetch(`${supabaseUrl}/rest/v1/rpc/execute_daily_release`, {
      method: 'POST',
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${anonKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}),
    });

    const data = await res.json();
    console.log('[365 Release] Response:', JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('[365 Release] Execution failed:', err);
    process.exit(1);
  }
}

triggerRelease();
