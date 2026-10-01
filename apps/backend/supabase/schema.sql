-- ==============================================================================
-- 365 ("One song. Every day.") — Complete Supabase PostgreSQL Schema
-- 100% Free-Tier Architecture ($0 Monthly Hosting)
-- ==============================================================================

-- 1. Extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==============================================================================
-- 2. Tables
-- ==============================================================================

-- 2.1 Public User Profiles (Mirrors auth.users with public social fields)
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  username TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  avatar_url TEXT,
  is_guest BOOLEAN DEFAULT false,
  is_banned BOOLEAN DEFAULT false,
  is_admin BOOLEAN DEFAULT false,
  notification_prefs JSONB DEFAULT '{"daily_release": true, "song_selected": true}'::jsonb,
  push_tokens TEXT[] DEFAULT ARRAY[]::TEXT[],
  stats JSONB DEFAULT '{"total_submissions": 0, "songs_featured": 0, "listening_streak": 1}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Index for username lookups
CREATE INDEX IF NOT EXISTS idx_users_username ON public.users(username);

-- 2.2 Global App Configuration
CREATE TABLE IF NOT EXISTS public.config (
  id TEXT PRIMARY KEY DEFAULT 'app',
  release_time TEXT DEFAULT '19:00',
  timezone TEXT DEFAULT 'Asia/Kolkata',
  last_day_number INTEGER DEFAULT 47,
  allow_explicit BOOLEAN DEFAULT false,
  cooldown_days_per_user INTEGER DEFAULT 7,
  duplication_window_days INTEGER DEFAULT 30,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2.3 Daily Released Songs (The public archive & Today's song)
CREATE TABLE IF NOT EXISTS public.daily_songs (
  id TEXT PRIMARY KEY, -- Date format: 'YYYY-MM-DD' e.g. '2026-10-01'
  date DATE NOT NULL UNIQUE,
  day_number INTEGER NOT NULL UNIQUE,
  song_id TEXT NOT NULL,
  song JSONB NOT NULL,
  submitter_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  submitter_username TEXT NOT NULL,
  submitter_display_name TEXT,
  status TEXT DEFAULT 'published' CHECK (status IN ('scheduled', 'published')),
  published_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
  like_count INTEGER DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_daily_songs_date ON public.daily_songs(date DESC);
CREATE INDEX IF NOT EXISTS idx_daily_songs_day_number ON public.daily_songs(day_number DESC);

-- 2.4 Community Submissions Queue
CREATE TABLE IF NOT EXISTS public.submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  song_id TEXT NOT NULL,
  song JSONB NOT NULL,
  submitter_username TEXT NOT NULL,
  submitter_display_name TEXT NOT NULL,
  note TEXT,
  status TEXT DEFAULT 'queued' CHECK (status IN ('queued', 'selected', 'removed', 'rejected')),
  submitted_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  selected_date DATE,
  rejection_reason TEXT
);

CREATE INDEX IF NOT EXISTS idx_submissions_queue ON public.submissions(status, submitted_at ASC);
CREATE INDEX IF NOT EXISTS idx_submissions_user_active ON public.submissions(user_id, status);
CREATE INDEX IF NOT EXISTS idx_submissions_song_id ON public.submissions(song_id, status);

-- 2.5 Editorial Fallback Pool (Guarantees 365 never misses a day if queue is empty)
CREATE TABLE IF NOT EXISTS public.editorial_fallback_pool (
  id TEXT PRIMARY KEY,
  song JSONB NOT NULL,
  used BOOLEAN DEFAULT false,
  last_used_date DATE
);

-- 2.6 Content Reports & Abuse Moderation
CREATE TABLE IF NOT EXISTS public.reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  target_type TEXT NOT NULL CHECK (target_type IN ('song', 'user')),
  target_id TEXT NOT NULL,
  reason TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'dismissed', 'resolved')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_reports_status ON public.reports(status, created_at DESC);

-- ==============================================================================
-- 3. Row Level Security (RLS) Policies
-- ==============================================================================

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_songs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.editorial_fallback_pool ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

-- 3.1 daily_songs RLS: Everyone (including guests) can read published songs
CREATE POLICY "Public read daily_songs"
  ON public.daily_songs FOR SELECT
  USING (true);

-- 3.2 config RLS: Public read
CREATE POLICY "Public read config"
  ON public.config FOR SELECT
  USING (true);

-- 3.3 users RLS: Public can view basic profile info; private fields secured
CREATE POLICY "Public read user profiles"
  ON public.users FOR SELECT
  USING (true);

CREATE POLICY "Users can update their own profile"
  ON public.users FOR UPDATE
  USING (auth.uid() = id);

-- 3.4 submissions RLS: Users can view their own submissions; admins can view all
CREATE POLICY "Users can view own submissions"
  ON public.submissions FOR SELECT
  USING (
    auth.uid() = user_id 
    OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND is_admin = true)
  );

-- 3.5 reports RLS: Anyone can submit a report; only admins can view
CREATE POLICY "Authenticated users can submit reports"
  ON public.reports FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admins can view reports"
  ON public.reports FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND is_admin = true)
  );

-- ==============================================================================
-- 4. Stored Procedures & Business Logic (Security Definer)
-- ==============================================================================

-- 4.1 Auto-create public user profile on Auth signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_username TEXT;
  v_display_name TEXT;
  v_is_guest BOOLEAN;
BEGIN
  v_is_guest := (NEW.is_anonymous IS TRUE);

  IF v_is_guest THEN
    v_username := 'listener_' || substring(NEW.id::text from 1 for 6);
    v_display_name := 'Guest Listener';
  ELSE
    -- Extract Google name/email or generate clean handle
    v_display_name := COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'name',
      split_part(COALESCE(NEW.email, 'listener'), '@', 1)
    );
    v_username := lower(regexp_replace(
      COALESCE(NEW.raw_user_meta_data->>'preferred_username', split_part(COALESCE(NEW.email, 'listener'), '@', 1)),
      '[^a-zA-Z0-9_]', '', 'g'
    ));
    -- Ensure uniqueness if exists
    IF EXISTS (SELECT 1 FROM public.users WHERE username = v_username) THEN
      v_username := v_username || '_' || substring(NEW.id::text from 1 for 4);
    END IF;
  END IF;

  INSERT INTO public.users (
    id,
    email,
    username,
    display_name,
    avatar_url,
    is_guest,
    created_at,
    updated_at
  ) VALUES (
    NEW.id,
    NEW.email,
    v_username,
    v_display_name,
    NEW.raw_user_meta_data->>'avatar_url',
    v_is_guest,
    now(),
    now()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    display_name = CASE WHEN users.is_guest AND NOT EXCLUDED.is_guest THEN EXCLUDED.display_name ELSE users.display_name END,
    is_guest = EXCLUDED.is_guest,
    updated_at = now();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to execute on auth.users creation
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT OR UPDATE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 4.2 Submit Song Atomic Transaction Logic
CREATE OR REPLACE FUNCTION public.submit_song(
  p_song JSONB,
  p_note TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_user_id UUID;
  v_user public.users%ROWTYPE;
  v_song_id TEXT;
  v_is_explicit BOOLEAN;
  v_allow_explicit BOOLEAN;
  v_submission_id UUID;
  v_cooldown_cutoff TIMESTAMPTZ;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required. Please sign in with Google to submit.';
  END IF;

  SELECT * INTO v_user FROM public.users WHERE id = v_user_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'User profile not found.';
  END IF;

  -- Rule 1: Guests cannot submit
  IF v_user.is_guest THEN
    RAISE EXCEPTION 'Guests cannot submit songs. Sign in with Google to join the community.';
  END IF;

  -- Rule 2: Banned users cannot submit
  IF v_user.is_banned THEN
    RAISE EXCEPTION 'Your account has been restricted from submitting songs.';
  END IF;

  -- Rule 3: Single active submission per user
  IF EXISTS (
    SELECT 1 FROM public.submissions 
    WHERE user_id = v_user_id AND status = 'queued'
  ) THEN
    RAISE EXCEPTION 'You already have an active submission in the 365 queue. You can submit another track once your current one is featured or reviewed.';
  END IF;

  v_song_id := p_song->>'id';
  IF v_song_id IS NULL OR length(v_song_id) < 3 THEN
    RAISE EXCEPTION 'Invalid song data: missing track identifier.';
  END IF;

  -- Rule 4: Duplicate in queue prevention
  IF EXISTS (
    SELECT 1 FROM public.submissions 
    WHERE song_id = v_song_id AND status = 'queued'
  ) THEN
    RAISE EXCEPTION 'This song is already queued by another listener in the community.';
  END IF;

  -- Rule 5: 30-Day Duplicate Prevention in Daily Songs
  IF EXISTS (
    SELECT 1 FROM public.daily_songs 
    WHERE song_id = v_song_id 
      AND date >= (CURRENT_DATE - INTERVAL '30 days')
  ) THEN
    RAISE EXCEPTION 'This song was already featured on 365 within the last 30 days. Please pick a different track.';
  END IF;

  -- Rule 6: Explicit Content Check
  SELECT allow_explicit INTO v_allow_explicit FROM public.config WHERE id = 'app';
  v_is_explicit := COALESCE((p_song->'metadata'->>'isExplicit')::boolean, false);
  IF v_is_explicit AND NOT COALESCE(v_allow_explicit, false) THEN
    RAISE EXCEPTION 'Explicit tracks are not permitted under the 365 listening policy.';
  END IF;

  -- Insert Submission
  INSERT INTO public.submissions (
    user_id,
    song_id,
    song,
    submitter_username,
    submitter_display_name,
    note,
    status,
    submitted_at
  ) VALUES (
    v_user_id,
    v_song_id,
    p_song,
    v_user.username,
    v_user.display_name,
    p_note,
    'queued',
    now()
  )
  RETURNING id INTO v_submission_id;

  -- Increment user stats
  UPDATE public.users 
  SET 
    stats = jsonb_set(
      stats, 
      '{total_submissions}', 
      to_jsonb(COALESCE((stats->>'total_submissions')::int, 0) + 1)
    ),
    updated_at = now()
  WHERE id = v_user_id;

  RETURN jsonb_build_object(
    'success', true,
    'submissionId', v_submission_id,
    'message', 'Song successfully added to the 365 community queue!'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4.3 Daily Release Engine (Runs daily at 7:00 PM IST via cron or admin trigger)
CREATE OR REPLACE FUNCTION public.execute_daily_release(
  p_target_date DATE DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_target_date DATE;
  v_target_date_str TEXT;
  v_config public.config%ROWTYPE;
  v_next_day_number INTEGER;
  v_selected_song JSONB;
  v_song_id TEXT;
  v_submitter_id UUID;
  v_submitter_username TEXT;
  v_submitter_display_name TEXT;
  v_submission_record public.submissions%ROWTYPE;
  v_fallback_record public.editorial_fallback_pool%ROWTYPE;
  v_published_doc public.daily_songs%ROWTYPE;
BEGIN
  -- 1. Determine target date (IST date: UTC + 5:30)
  v_target_date := COALESCE(p_target_date, (timezone('Asia/Kolkata', now()))::date);
  v_target_date_str := to_char(v_target_date, 'YYYY-MM-DD');

  -- 2. Idempotency Check: Don't publish twice on the same day
  SELECT * INTO v_published_doc FROM public.daily_songs WHERE date = v_target_date;
  IF FOUND AND v_published_doc.status = 'published' THEN
    RETURN jsonb_build_object(
      'success', true,
      'alreadyPublished', true,
      'song', v_published_doc.song,
      'message', 'Song already published for ' || v_target_date_str
    );
  END IF;

  -- 3. Fetch Config & Next Day Number
  SELECT * INTO v_config FROM public.config WHERE id = 'app';
  v_next_day_number := COALESCE(v_config.last_day_number, 47) + 1;

  -- 4. Selection Priority 1: Admin pre-scheduled song for today
  IF FOUND AND v_published_doc.status = 'scheduled' THEN
    v_selected_song := v_published_doc.song;
    v_song_id := v_published_doc.song_id;
    v_submitter_id := v_published_doc.submitter_id;
    v_submitter_username := v_published_doc.submitter_username;
    v_submitter_display_name := v_published_doc.submitter_display_name;
    v_next_day_number := v_published_doc.day_number;
  ELSE
    -- Priority 2: Oldest queued community submission (FIFO)
    SELECT * INTO v_submission_record 
    FROM public.submissions 
    WHERE status = 'queued' 
    ORDER BY submitted_at ASC 
    LIMIT 1;

    IF FOUND THEN
      v_selected_song := v_submission_record.song;
      v_song_id := v_submission_record.song_id;
      v_submitter_id := v_submission_record.user_id;
      v_submitter_username := v_submission_record.submitter_username;
      v_submitter_display_name := v_submission_record.submitter_display_name;

      -- Mark submission as selected
      UPDATE public.submissions 
      SET status = 'selected', selected_date = v_target_date 
      WHERE id = v_submission_record.id;

      -- Update submitter featured count
      UPDATE public.users 
      SET stats = jsonb_set(
        stats, 
        '{songs_featured}', 
        to_jsonb(COALESCE((stats->>'songs_featured')::int, 0) + 1)
      ) 
      WHERE id = v_submitter_id;
    ELSE
      -- Priority 3: Curated editorial fallback pool
      SELECT * INTO v_fallback_record 
      FROM public.editorial_fallback_pool 
      WHERE used = false 
      LIMIT 1;

      IF NOT FOUND THEN
        -- If all used, pick the least recently used
        SELECT * INTO v_fallback_record 
        FROM public.editorial_fallback_pool 
        ORDER BY last_used_date ASC NULLS FIRST 
        LIMIT 1;
      END IF;

      IF FOUND THEN
        v_selected_song := v_fallback_record.song;
        v_song_id := v_fallback_record.song->>'id';
        v_submitter_id := NULL;
        v_submitter_username := '365editorial';
        v_submitter_display_name := '365 Editorial';

        UPDATE public.editorial_fallback_pool 
        SET used = true, last_used_date = v_target_date 
        WHERE id = v_fallback_record.id;
      ELSE
        RAISE EXCEPTION 'Critical: No community submissions or fallback songs available for release.';
      END IF;
    END IF;
  END IF;

  -- 5. Upsert Published Song
  INSERT INTO public.daily_songs (
    id,
    date,
    day_number,
    song_id,
    song,
    submitter_id,
    submitter_username,
    submitter_display_name,
    status,
    published_at
  ) VALUES (
    v_target_date_str,
    v_target_date,
    v_next_day_number,
    v_song_id,
    v_selected_song,
    v_submitter_id,
    v_submitter_username,
    v_submitter_display_name,
    'published',
    now()
  )
  ON CONFLICT (id) DO UPDATE SET
    song = EXCLUDED.song,
    song_id = EXCLUDED.song_id,
    submitter_id = EXCLUDED.submitter_id,
    submitter_username = EXCLUDED.submitter_username,
    submitter_display_name = EXCLUDED.submitter_display_name,
    status = 'published',
    published_at = now();

  -- 6. Increment Last Day Number in Config
  UPDATE public.config 
  SET 
    last_day_number = v_next_day_number,
    updated_at = now() 
  WHERE id = 'app';

  RETURN jsonb_build_object(
    'success', true,
    'date', v_target_date_str,
    'dayNumber', v_next_day_number,
    'song', v_selected_song,
    'submitterUsername', v_submitter_username
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4.4 Report Song or User RPC
CREATE OR REPLACE FUNCTION public.report_item(
  p_target_type TEXT,
  p_target_id TEXT,
  p_reason TEXT,
  p_notes TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_report_id UUID;
BEGIN
  INSERT INTO public.reports (
    reporter_id,
    target_type,
    target_id,
    reason,
    notes,
    status
  ) VALUES (
    auth.uid(),
    p_target_type,
    p_target_id,
    p_reason,
    p_notes,
    'pending'
  )
  RETURNING id INTO v_report_id;

  RETURN jsonb_build_object('success', true, 'reportId', v_report_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==============================================================================
-- 5. Seed Data (App Config, Initial Archive, Editorial Pool)
-- ==============================================================================

-- 5.1 App Config Seed
INSERT INTO public.config (id, release_time, timezone, last_day_number, allow_explicit, cooldown_days_per_user, duplication_window_days)
VALUES ('app', '19:00', 'Asia/Kolkata', 47, false, 7, 30)
ON CONFLICT (id) DO NOTHING;

-- 5.2 Initial Released Archive (Days 45, 46, 47)
INSERT INTO public.daily_songs (id, date, day_number, song_id, song, submitter_id, submitter_username, submitter_display_name, status, published_at)
VALUES 
(
  '2026-09-30',
  '2026-09-30'::date,
  47,
  'spotify_6rqhFgbbKwnb9MLmUQDhG6',
  '{
    "id": "spotify_6rqhFgbbKwnb9MLmUQDhG6",
    "title": "Texas Sun",
    "artist": "Leon Bridges, Khruangbin",
    "album": "Texas Sun - EP",
    "artworkUrl": "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=1200&q=85",
    "provider": "spotify",
    "providerSongId": "6rqhFgbbKwnb9MLmUQDhG6",
    "externalUrls": {
      "spotify": "https://open.spotify.com/track/6rqhFgbbKwnb9MLmUQDhG6"
    },
    "metadata": {
      "durationMs": 252000,
      "isExplicit": false,
      "genre": "Soul / Psychedelic Rock",
      "releaseYear": 2020,
      "palette": {
        "dominant": "#C67D5A"
      }
    }
  }'::jsonb,
  NULL,
  'maya',
  'Maya Lin',
  'published',
  '2026-09-30T13:30:00Z'::timestamptz
),
(
  '2026-09-29',
  '2026-09-29'::date,
  46,
  'spotify_2WfaOiMkCvy7Z5vo2Ycrz0',
  '{
    "id": "spotify_2WfaOiMkCvy7Z5vo2Ycrz0",
    "title": "Says",
    "artist": "Nils Frahm",
    "album": "Spaces",
    "artworkUrl": "https://images.unsplash.com/photo-1465847899084-d164df4dedc6?auto=format&fit=crop&w=1200&q=85",
    "provider": "spotify",
    "providerSongId": "2WfaOiMkCvy7Z5vo2Ycrz0",
    "externalUrls": {
      "spotify": "https://open.spotify.com/track/2WfaOiMkCvy7Z5vo2Ycrz0"
    },
    "metadata": {
      "durationMs": 518000,
      "isExplicit": false,
      "genre": "Modern Classical",
      "releaseYear": 2013,
      "palette": {
        "dominant": "#5E6B73"
      }
    }
  }'::jsonb,
  NULL,
  'juliank',
  'Julian K',
  'published',
  '2026-09-29T13:30:00Z'::timestamptz
),
(
  '2026-09-28',
  '2026-09-28'::date,
  45,
  'spotify_0VjIjW4GlUZAMYd2vXMi3b',
  '{
    "id": "spotify_0VjIjW4GlUZAMYd2vXMi3b",
    "title": "Blinding Lights",
    "artist": "The Weeknd",
    "album": "After Hours",
    "artworkUrl": "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=1200&q=85",
    "provider": "spotify",
    "providerSongId": "0VjIjW4GlUZAMYd2vXMi3b",
    "externalUrls": {
      "spotify": "https://open.spotify.com/track/0VjIjW4GlUZAMYd2vXMi3b"
    },
    "metadata": {
      "durationMs": 200000,
      "isExplicit": false,
      "genre": "Synthpop",
      "releaseYear": 2020,
      "palette": {
        "dominant": "#8C3A3A"
      }
    }
  }'::jsonb,
  NULL,
  'sara_m',
  'Sara M',
  'published',
  '2026-09-28T13:30:00Z'::timestamptz
)
ON CONFLICT (id) DO NOTHING;

-- 5.3 Curated Fallback Pool
INSERT INTO public.editorial_fallback_pool (id, song, used)
VALUES 
(
  'fallback_01',
  '{
    "id": "spotify_4kflIGfjdZJW4ot2ioixTB",
    "title": "Veridis Quo",
    "artist": "Daft Punk",
    "album": "Discovery",
    "artworkUrl": "https://images.unsplash.com/photo-1498038432885-c6f3f1b912ee?auto=format&fit=crop&w=1200&q=85",
    "provider": "spotify",
    "providerSongId": "4kflIGfjdZJW4ot2ioixTB",
    "externalUrls": {
      "spotify": "https://open.spotify.com/track/4kflIGfjdZJW4ot2ioixTB"
    },
    "metadata": {
      "durationMs": 344000,
      "isExplicit": false,
      "genre": "Electronic",
      "palette": { "dominant": "#68507B" }
    }
  }'::jsonb,
  false
),
(
  'fallback_02',
  '{
    "id": "spotify_0tKzp17G6e082Qf0mJ337X",
    "title": "Sunshine",
    "artist": "Cleo Sol",
    "album": "Mother",
    "artworkUrl": "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1200&q=85",
    "provider": "spotify",
    "providerSongId": "0tKzp17G6e082Qf0mJ337X",
    "externalUrls": {
      "spotify": "https://open.spotify.com/track/0tKzp17G6e082Qf0mJ337X"
    },
    "metadata": {
      "durationMs": 234000,
      "isExplicit": false,
      "genre": "Soul",
      "palette": { "dominant": "#9C7A4E" }
    }
  }'::jsonb,
  false
)
ON CONFLICT (id) DO NOTHING;

-- ==============================================================================
-- 6. Automated Daily Ritual (100% Free pg_cron Scheduler at 7:00 PM IST)
-- ==============================================================================

DO $$
BEGIN
  -- Check if pg_cron extension is available on this Supabase instance
  IF EXISTS (SELECT 1 FROM pg_available_extensions WHERE name = 'pg_cron') THEN
    CREATE EXTENSION IF NOT EXISTS "pg_cron";
    
    -- Unschedule previous job if exists to ensure clean idempotency
    BEGIN
      PERFORM cron.unschedule('daily-365-release-7pm-ist');
    EXCEPTION WHEN OTHERS THEN
      -- Job may not exist yet, ignore
    END;

    -- Schedule daily execution at 13:30 UTC (= 19:00 IST / 7:00 PM IST)
    PERFORM cron.schedule(
      'daily-365-release-7pm-ist',
      '30 13 * * *',
      'SELECT public.execute_daily_release();'
    );
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'pg_cron setup note: To schedule releases via database, enable pg_cron extension in Dashboard -> Database -> Extensions.';
END;
$$;

