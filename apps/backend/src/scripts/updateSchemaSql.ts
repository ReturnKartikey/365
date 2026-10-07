import { CURATED_DAILY_SONGS } from '@365/core';
import * as fs from 'fs';
import * as path from 'path';

function updateSchemaFile(filePath: string) {
  if (!fs.existsSync(filePath)) return;

  const content = fs.readFileSync(filePath, 'utf8');

  const poolSqlLines = CURATED_DAILY_SONGS.map((c) => {
    const jsonStr = JSON.stringify(c.song).replace(/'/g, "''");
    return `  ('fallback_${c.song.providerSongId}', '${jsonStr}'::jsonb, false)`;
  });

  const replacementSql = `-- 5.3 Curated Fallback Pool (25 Verified Iconic Songs with Audio Previews)
INSERT INTO public.editorial_fallback_pool (id, song, used)
VALUES
${poolSqlLines.join(',\n')}
ON CONFLICT (id) DO UPDATE SET song = EXCLUDED.song;`;

  const fallbackRegex = /-- 5\.3 Curated Fallback Pool[\s\S]*?ON CONFLICT \(id\) DO NOTHING;/;

  if (fallbackRegex.test(content)) {
    const updated = content.replace(fallbackRegex, replacementSql);
    fs.writeFileSync(filePath, updated, 'utf8');
    console.log(`Updated schema in: ${filePath}`);
  } else {
    console.warn(`Could not match fallback section in: ${filePath}`);
  }
}

const rootSchema = path.resolve(__dirname, '../../../../supabase/schema.sql');
const backendSchema = path.resolve(__dirname, '../../supabase/schema.sql');

updateSchemaFile(rootSchema);
updateSchemaFile(backendSchema);
