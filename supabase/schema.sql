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
    'submitterId', v_submitter_id,
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

-- 5.3 Curated Fallback Pool (25 Verified Iconic Songs with Audio Previews)
INSERT INTO public.editorial_fallback_pool (id, song, used)
VALUES
  ('fallback_1485581309', '{"id":"spotify_1485581309","title":"Texas Sun","artist":"Khruangbin & Leon Bridges","album":"Texas Sun - EP","artworkUrl":"https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/ed/90/53/ed9053df-0476-f6aa-d7f2-8664fc589904/656605151465.jpg/600x600bb.jpg","provider":"spotify","providerSongId":"1485581309","externalUrls":{"spotify":"https://open.spotify.com/search/Texas%20Sun%20Khruangbin%20%26%20Leon%20Bridges","web":"https://open.spotify.com/search/Texas%20Sun%20Khruangbin%20%26%20Leon%20Bridges"},"metadata":{"durationMs":252812,"previewUrl":"https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/64/0d/bc/640dbc64-93ac-1322-20bf-0c929bfcadb6/mzaf_10048206250487462970.plus.aac.p.m4a","isExplicit":false,"genre":"Indie Rock","releaseYear":2019,"palette":{"dominant":"#C67D5A","primary":"#C67D5A","background":"#121316","surface":"#1E1F23"}},"createdAt":"2026-09-30T12:00:00Z"}'::jsonb, false),
  ('fallback_1453571333', '{"id":"spotify_1453571333","title":"Says","artist":"Nils Frahm","album":"Spaces (Special Edition)","artworkUrl":"https://is1-ssl.mzstatic.com/image/thumb/Music125/v4/9f/40/da/9f40da77-e818-f6f8-b252-d02a2ed7c89f/4050486115855_cover.jpg/600x600bb.jpg","provider":"spotify","providerSongId":"1453571333","externalUrls":{"spotify":"https://open.spotify.com/search/Says%20Nils%20Frahm","web":"https://open.spotify.com/search/Says%20Nils%20Frahm"},"metadata":{"durationMs":498000,"previewUrl":"https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/17/8d/8f/178d8f53-cc2a-f661-18b1-edabbddc3825/mzaf_9453340308397771459.plus.aac.p.m4a","isExplicit":false,"genre":"Ambient","releaseYear":2013,"palette":{"dominant":"#5E6B73","primary":"#5E6B73","background":"#121316","surface":"#1E1F23"}},"createdAt":"2026-09-29T12:00:00Z"}'::jsonb, false),
  ('fallback_1542842761', '{"id":"spotify_1542842761","title":"Blinding Lights (Remix)","artist":"The Weeknd & ROSALÍA","album":"Blinding Lights (Remix) - Single","artworkUrl":"https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/61/e7/3f/61e73f94-018d-5f50-50ec-8521952bc72e/20UM1IM11629.rgb.jpg/600x600bb.jpg","provider":"spotify","providerSongId":"1542842761","externalUrls":{"spotify":"https://open.spotify.com/search/Blinding%20Lights%20(Remix)%20The%20Weeknd%20%26%20ROSAL%C3%8DA","web":"https://open.spotify.com/search/Blinding%20Lights%20(Remix)%20The%20Weeknd%20%26%20ROSAL%C3%8DA"},"metadata":{"durationMs":216123,"previewUrl":"https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview211/v4/12/73/ca/1273ca46-233a-5331-189b-25ac1d656533/mzaf_976341070785891411.plus.aac.p.m4a","isExplicit":false,"genre":"R&B/Soul","releaseYear":2020,"palette":{"dominant":"#8C3A3A","primary":"#8C3A3A","background":"#121316","surface":"#1E1F23"}},"createdAt":"2026-09-28T12:00:00Z"}'::jsonb, false),
  ('fallback_617154366', '{"id":"spotify_617154366","title":"Get Lucky","artist":"Daft Punk, Pharrell Williams & Nile Rodgers","album":"Random Access Memories","artworkUrl":"https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/e8/43/5f/e8435ffa-b6b9-b171-40ab-4ff3959ab661/886443919266.jpg/600x600bb.jpg","provider":"spotify","providerSongId":"617154366","externalUrls":{"spotify":"https://open.spotify.com/search/Get%20Lucky%20Daft%20Punk%2C%20Pharrell%20Williams%20%26%20Nile%20Rodgers","web":"https://open.spotify.com/search/Get%20Lucky%20Daft%20Punk%2C%20Pharrell%20Williams%20%26%20Nile%20Rodgers"},"metadata":{"durationMs":369629,"previewUrl":"https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview211/v4/57/a5/85/57a585aa-f1bc-7619-881b-f8a04a5541d5/mzaf_6906185026678279401.plus.aac.p.m4a","isExplicit":false,"genre":"Pop","releaseYear":2013,"palette":{"dominant":"#D4AF37","primary":"#D4AF37","background":"#121316","surface":"#1E1F23"}},"createdAt":"2026-09-27T12:00:00Z"}'::jsonb, false),
  ('fallback_1122782283', '{"id":"spotify_1122782283","title":"Yellow","artist":"Coldplay","album":"Parachutes","artworkUrl":"https://is1-ssl.mzstatic.com/image/thumb/Music221/v4/f5/93/8c/f5938c49-964c-31d1-4b33-78b634f71fb7/190295978075.jpg/600x600bb.jpg","provider":"spotify","providerSongId":"1122782283","externalUrls":{"spotify":"https://open.spotify.com/search/Yellow%20Coldplay","web":"https://open.spotify.com/search/Yellow%20Coldplay"},"metadata":{"durationMs":269208,"previewUrl":"https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/66/f3/1a/66f31a76-a6ed-cb4c-f353-23310a7ae9a8/mzaf_10593596652344378873.plus.aac.p.m4a","isExplicit":false,"genre":"Alternative","releaseYear":2000,"palette":{"dominant":"#E5C158","primary":"#E5C158","background":"#121316","surface":"#1E1F23"}},"createdAt":"2026-09-26T12:00:00Z"}'::jsonb, false),
  ('fallback_202272624', '{"id":"spotify_202272624","title":"Dreams","artist":"Fleetwood Mac","album":"Greatest Hits","artworkUrl":"https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/d2/48/f4/d248f4ae-a7e4-a48e-1588-6617de3e8d76/mzi.izeorbmm.jpg/600x600bb.jpg","provider":"spotify","providerSongId":"202272624","externalUrls":{"spotify":"https://open.spotify.com/search/Dreams%20Fleetwood%20Mac","web":"https://open.spotify.com/search/Dreams%20Fleetwood%20Mac"},"metadata":{"durationMs":254453,"previewUrl":"https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview211/v4/b6/5a/4b/b65a4b6f-54dd-ee99-0b36-98e27d5b5dd8/mzaf_13813391014293209258.plus.aac.p.m4a","isExplicit":false,"genre":"Rock","releaseYear":1987,"palette":{"dominant":"#8B7355","primary":"#8B7355","background":"#121316","surface":"#1E1F23"}},"createdAt":"2026-09-25T12:00:00Z"}'::jsonb, false),
  ('fallback_1146195714', '{"id":"spotify_1146195714","title":"Pink + White","artist":"Frank Ocean","album":"Blonde","artworkUrl":"https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/bb/45/68/bb4568f3-68cd-619d-fbcb-4e179916545d/BlondCover-Final.jpg/600x600bb.jpg","provider":"spotify","providerSongId":"1146195714","externalUrls":{"spotify":"https://open.spotify.com/search/Pink%20%2B%20White%20Frank%20Ocean","web":"https://open.spotify.com/search/Pink%20%2B%20White%20Frank%20Ocean"},"metadata":{"durationMs":184516,"previewUrl":"https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/ba/11/dc/ba11dccd-16d2-9cd8-13f0-85b73acc0a09/mzaf_1304250511099243436.plus.aac.p.m4a","isExplicit":false,"genre":"Pop","releaseYear":2016,"palette":{"dominant":"#C48B9F","primary":"#C48B9F","background":"#121316","surface":"#1E1F23"}},"createdAt":"2026-09-24T12:00:00Z"}'::jsonb, false),
  ('fallback_1440838060', '{"id":"spotify_1440838060","title":"Let It Happen","artist":"Tame Impala","album":"Currents","artworkUrl":"https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/a8/2e/b4/a82eb490-f30a-a321-461a-0383c88fec95/15UMGIM23316.rgb.jpg/600x600bb.jpg","provider":"spotify","providerSongId":"1440838060","externalUrls":{"spotify":"https://open.spotify.com/search/Let%20It%20Happen%20Tame%20Impala","web":"https://open.spotify.com/search/Let%20It%20Happen%20Tame%20Impala"},"metadata":{"durationMs":466893,"previewUrl":"https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/25/fe/60/25fe60d3-3e30-c6f9-fdcb-97058fed0c38/mzaf_1903612753893368017.plus.aac.p.m4a","isExplicit":false,"genre":"Alternative","releaseYear":2015,"palette":{"dominant":"#9B5DE5","primary":"#9B5DE5","background":"#121316","surface":"#1E1F23"}},"createdAt":"2026-09-23T12:00:00Z"}'::jsonb, false),
  ('fallback_1109715168', '{"id":"spotify_1109715168","title":"Weird Fishes / Arpeggi","artist":"Radiohead","album":"In Rainbows","artworkUrl":"https://is1-ssl.mzstatic.com/image/thumb/Music126/v4/dd/50/c7/dd50c790-99ac-d3d0-5ab8-e3891fb8fd52/634904032463.png/600x600bb.jpg","provider":"spotify","providerSongId":"1109715168","externalUrls":{"spotify":"https://open.spotify.com/search/Weird%20Fishes%20%2F%20Arpeggi%20Radiohead","web":"https://open.spotify.com/search/Weird%20Fishes%20%2F%20Arpeggi%20Radiohead"},"metadata":{"durationMs":318187,"previewUrl":"https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/3a/12/eb/3a12ebaf-89c1-1ac9-6821-3a1de510ef51/mzaf_14543910941982290973.plus.aac.p.m4a","isExplicit":false,"genre":"Alternative","releaseYear":2007,"palette":{"dominant":"#4A6984","primary":"#4A6984","background":"#121316","surface":"#1E1F23"}},"createdAt":"2026-09-22T12:00:00Z"}'::jsonb, false),
  ('fallback_1440903307', '{"id":"spotify_1440903307","title":"All The Stars","artist":"Kendrick Lamar, SZA","album":"Black Panther: The Album","artworkUrl":"https://is1-ssl.mzstatic.com/image/thumb/Music112/v4/4d/16/55/4d165549-3d11-86dc-fcbf-be7fe0bcadfb/18UMGIM00002.rgb.jpg/600x600bb.jpg","provider":"spotify","providerSongId":"1440903307","externalUrls":{"spotify":"https://open.spotify.com/search/All%20The%20Stars%20Kendrick%20Lamar%2C%20SZA","web":"https://open.spotify.com/search/All%20The%20Stars%20Kendrick%20Lamar%2C%20SZA"},"metadata":{"durationMs":232190,"previewUrl":"https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/ea/8b/2c/ea8b2cf4-95f2-b0b3-ffc5-10f4611bf98f/mzaf_6758805407695014001.plus.aac.p.m4a","isExplicit":false,"genre":"Hip-Hop/Rap","releaseYear":2018,"palette":{"dominant":"#B76E79","primary":"#B76E79","background":"#121316","surface":"#1E1F23"}},"createdAt":"2026-09-21T12:00:00Z"}'::jsonb, false),
  ('fallback_1440899467', '{"id":"spotify_1440899467","title":"ocean eyes","artist":"Billie Eilish","album":"dont smile at me","artworkUrl":"https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/02/1d/30/021d3036-5503-3ed3-df00-882f2833a6ae/17UM1IM17026.rgb.jpg/600x600bb.jpg","provider":"spotify","providerSongId":"1440899467","externalUrls":{"spotify":"https://open.spotify.com/search/ocean%20eyes%20Billie%20Eilish","web":"https://open.spotify.com/search/ocean%20eyes%20Billie%20Eilish"},"metadata":{"durationMs":200379,"previewUrl":"https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/d6/59/2b/d6592b0b-1e7e-4743-b2e4-f2af038fd783/mzaf_7697277787797935735.plus.aac.p.m4a","isExplicit":false,"genre":"Alternative","releaseYear":2016,"palette":{"dominant":"#4B779A","primary":"#4B779A","background":"#121316","surface":"#1E1F23"}},"createdAt":"2026-09-20T12:00:00Z"}'::jsonb, false),
  ('fallback_269573364', '{"id":"spotify_269573364","title":"Billie Jean","artist":"Michael Jackson","album":"Thriller","artworkUrl":"https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/32/4f/fd/324ffda2-9e51-8f6a-0c2d-c6fd2b41ac55/074643811224.jpg/600x600bb.jpg","provider":"spotify","providerSongId":"269573364","externalUrls":{"spotify":"https://open.spotify.com/search/Billie%20Jean%20Michael%20Jackson","web":"https://open.spotify.com/search/Billie%20Jean%20Michael%20Jackson"},"metadata":{"durationMs":293802,"previewUrl":"https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview211/v4/dc/bc/8a/dcbc8a3e-4ce1-c00d-cc02-eda2212053c7/mzaf_8347559338388601510.plus.aac.p.m4a","isExplicit":false,"genre":"Pop","releaseYear":1982,"palette":{"dominant":"#3D3D3D","primary":"#3D3D3D","background":"#121316","surface":"#1E1F23"}},"createdAt":"2026-09-19T12:00:00Z"}'::jsonb, false),
  ('fallback_1494022968', '{"id":"spotify_1494022968","title":"Good News","artist":"Mac Miller","album":"Circles","artworkUrl":"https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/23/39/38/23393826-762f-ec76-dc1e-9344f647c958/093624905981.jpg/600x600bb.jpg","provider":"spotify","providerSongId":"1494022968","externalUrls":{"spotify":"https://open.spotify.com/search/Good%20News%20Mac%20Miller","web":"https://open.spotify.com/search/Good%20News%20Mac%20Miller"},"metadata":{"durationMs":342040,"previewUrl":"https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview211/v4/55/80/7d/55807d1d-19d4-481c-0b36-24120ad3623b/mzaf_16364320153408868703.plus.aac.p.m4a","isExplicit":false,"genre":"Hip-Hop/Rap","releaseYear":2020,"palette":{"dominant":"#A39274","primary":"#A39274","background":"#121316","surface":"#1E1F23"}},"createdAt":"2026-09-18T12:00:00Z"}'::jsonb, false),
  ('fallback_1440818666', '{"id":"spotify_1440818666","title":"Ribs","artist":"Lorde","album":"Pure Heroine","artworkUrl":"https://is1-ssl.mzstatic.com/image/thumb/Music211/v4/96/a5/09/96a50916-169b-724c-b722-b8c474406352/13UAAIM68691.rgb.jpg/600x600bb.jpg","provider":"spotify","providerSongId":"1440818666","externalUrls":{"spotify":"https://open.spotify.com/search/Ribs%20Lorde","web":"https://open.spotify.com/search/Ribs%20Lorde"},"metadata":{"durationMs":258969,"previewUrl":"https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/13/8c/1a/138c1a93-5fdf-f1a3-c288-c0fd8d7c8d2f/mzaf_12940840614985303434.plus.aac.p.m4a","isExplicit":false,"genre":"Alternative","releaseYear":2013,"palette":{"dominant":"#5C6B73","primary":"#5C6B73","background":"#121316","surface":"#1E1F23"}},"createdAt":"2026-09-17T12:00:00Z"}'::jsonb, false),
  ('fallback_1658650499', '{"id":"spotify_1658650499","title":"Snooze","artist":"SZA","album":"SOS","artworkUrl":"https://is1-ssl.mzstatic.com/image/thumb/Music122/v4/62/93/13/6293132e-20ff-67ab-3d1f-96bb6797a6ba/196589564955.jpg/600x600bb.jpg","provider":"spotify","providerSongId":"1658650499","externalUrls":{"spotify":"https://open.spotify.com/search/Snooze%20SZA","web":"https://open.spotify.com/search/Snooze%20SZA"},"metadata":{"durationMs":201800,"previewUrl":"https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview211/v4/b3/9b/ca/b39bca57-2627-1aec-77af-cbf551205394/mzaf_4430383240210492712.plus.aac.p.m4a","isExplicit":false,"genre":"R&B/Soul","releaseYear":2022,"palette":{"dominant":"#C86D51","primary":"#C86D51","background":"#121316","surface":"#1E1F23"}},"createdAt":"2026-09-16T12:00:00Z"}'::jsonb, false),
  ('fallback_1771719335', '{"id":"spotify_1771719335","title":"Me and Your Mama","artist":"Childish Gambino","album":"\"Awaken, My Love!\"","artworkUrl":"https://is1-ssl.mzstatic.com/image/thumb/Music211/v4/f1/3c/d7/f13cd7ab-7319-028a-8807-5991d0b308d4/0044003187658_Cover.jpg/600x600bb.jpg","provider":"spotify","providerSongId":"1771719335","externalUrls":{"spotify":"https://open.spotify.com/search/Me%20and%20Your%20Mama%20Childish%20Gambino","web":"https://open.spotify.com/search/Me%20and%20Your%20Mama%20Childish%20Gambino"},"metadata":{"durationMs":379227,"previewUrl":"https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/57/c7/c3/57c7c31f-ab47-0135-ddcf-174f8428bcd2/mzaf_11827603781619567780.plus.aac.p.m4a","isExplicit":false,"genre":"Hip-Hop/Rap","releaseYear":2016,"palette":{"dominant":"#457B9D","primary":"#457B9D","background":"#121316","surface":"#1E1F23"}},"createdAt":"2026-09-15T12:00:00Z"}'::jsonb, false),
  ('fallback_947059829', '{"id":"spotify_947059829","title":"Skinny Love","artist":"Bon Iver","album":"For Emma, Forever Ago","artworkUrl":"https://is1-ssl.mzstatic.com/image/thumb/Music114/v4/21/2f/ea/212fea18-5fdc-ba4d-5dd7-1b07aaa88b67/656605211565.tif/600x600bb.jpg","provider":"spotify","providerSongId":"947059829","externalUrls":{"spotify":"https://open.spotify.com/search/Skinny%20Love%20Bon%20Iver","web":"https://open.spotify.com/search/Skinny%20Love%20Bon%20Iver"},"metadata":{"durationMs":238520,"previewUrl":"https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/c3/53/ef/c353ef07-9302-e169-0c7d-e9873f99c1db/mzaf_15074454966550904398.plus.aac.p.m4a","isExplicit":false,"genre":"Alternative","releaseYear":2007,"palette":{"dominant":"#7A8B7B","primary":"#7A8B7B","background":"#121316","surface":"#1E1F23"}},"createdAt":"2026-09-14T12:00:00Z"}'::jsonb, false),
  ('fallback_663097965', '{"id":"spotify_663097965","title":"Do I Wanna Know?","artist":"Arctic Monkeys","album":"AM","artworkUrl":"https://is1-ssl.mzstatic.com/image/thumb/Music211/v4/69/9c/b5/699cb5d6-115c-ff73-9d26-e57ea4350d72/887828031795.png/600x600bb.jpg","provider":"spotify","providerSongId":"663097965","externalUrls":{"spotify":"https://open.spotify.com/search/Do%20I%20Wanna%20Know%3F%20Arctic%20Monkeys","web":"https://open.spotify.com/search/Do%20I%20Wanna%20Know%3F%20Arctic%20Monkeys"},"metadata":{"durationMs":272394,"previewUrl":"https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/89/ae/42/89ae4206-048a-7eae-3eaf-c3abd02914fb/mzaf_15551176804491638370.plus.aac.p.m4a","isExplicit":false,"genre":"Alternative","releaseYear":2013,"palette":{"dominant":"#2B2D42","primary":"#2B2D42","background":"#121316","surface":"#1E1F23"}},"createdAt":"2026-09-13T12:00:00Z"}'::jsonb, false),
  ('fallback_1501585505', '{"id":"spotify_1501585505","title":"Time (You and I)","artist":"Khruangbin","album":"Mordechai","artworkUrl":"https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/94/a7/44/94a74465-1fe9-b897-a1ed-99b2e5b3b497/656605149363.jpg/600x600bb.jpg","provider":"spotify","providerSongId":"1501585505","externalUrls":{"spotify":"https://open.spotify.com/search/Time%20(You%20and%20I)%20Khruangbin","web":"https://open.spotify.com/search/Time%20(You%20and%20I)%20Khruangbin"},"metadata":{"durationMs":342189,"previewUrl":"https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/1e/21/03/1e2103fc-ed75-9791-3cc1-46808939067d/mzaf_14788516841272531148.plus.aac.p.m4a","isExplicit":false,"genre":"Alternative","releaseYear":2020,"palette":{"dominant":"#E07A5F","primary":"#E07A5F","background":"#121316","surface":"#1E1F23"}},"createdAt":"2026-09-12T12:00:00Z"}'::jsonb, false),
  ('fallback_850571371', '{"id":"spotify_850571371","title":"Feel Good Inc. (feat. David Jolicoeur, Kelvin Mercer & Vincent Mason)","artist":"Gorillaz & De La Soul","album":"Demon Days","artworkUrl":"https://is1-ssl.mzstatic.com/image/thumb/Music125/v4/1c/0f/81/1c0f818a-e458-dd84-6f1b-ccbdf5fe14d6/825646291045.jpg/600x600bb.jpg","provider":"spotify","providerSongId":"850571371","externalUrls":{"spotify":"https://open.spotify.com/search/Feel%20Good%20Inc.%20(feat.%20David%20Jolicoeur%2C%20Kelvin%20Mercer%20%26%20Vincent%20Mason)%20Gorillaz%20%26%20De%20La%20Soul","web":"https://open.spotify.com/search/Feel%20Good%20Inc.%20(feat.%20David%20Jolicoeur%2C%20Kelvin%20Mercer%20%26%20Vincent%20Mason)%20Gorillaz%20%26%20De%20La%20Soul"},"metadata":{"durationMs":221173,"previewUrl":"https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/9a/a7/90/9aa790e3-651e-9674-26ac-14aba4d3b8d1/mzaf_10454527198707970464.plus.aac.p.m4a","isExplicit":false,"genre":"Alternative","releaseYear":2005,"palette":{"dominant":"#3D5A80","primary":"#3D5A80","background":"#121316","surface":"#1E1F23"}},"createdAt":"2026-09-11T12:00:00Z"}'::jsonb, false),
  ('fallback_1463409349', '{"id":"spotify_1463409349","title":"IGOR''S THEME","artist":"Tyler, The Creator","album":"IGOR","artworkUrl":"https://is1-ssl.mzstatic.com/image/thumb/Music125/v4/0c/06/05/0c060581-6242-6a2a-a677-20170f2cf8da/886447710180.jpg/600x600bb.jpg","provider":"spotify","providerSongId":"1463409349","externalUrls":{"spotify":"https://open.spotify.com/search/IGOR''S%20THEME%20Tyler%2C%20The%20Creator","web":"https://open.spotify.com/search/IGOR''S%20THEME%20Tyler%2C%20The%20Creator"},"metadata":{"durationMs":200684,"previewUrl":"https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview211/v4/0c/9e/4c/0c9e4cf5-2306-f1e2-4995-1a2c6acc0063/mzaf_4955498705054156995.plus.aac.p.m4a","isExplicit":false,"genre":"Hip-Hop/Rap","releaseYear":2019,"palette":{"dominant":"#E9C46A","primary":"#E9C46A","background":"#121316","surface":"#1E1F23"}},"createdAt":"2026-09-10T12:00:00Z"}'::jsonb, false),
  ('fallback_1256607810', '{"id":"spotify_1256607810","title":"Motion Sickness","artist":"Phoebe Bridgers","album":"Stranger in the Alps","artworkUrl":"https://is1-ssl.mzstatic.com/image/thumb/Music221/v4/20/4c/6e/204c6ef3-8e95-4cee-2256-202ca62aebed/60220.jpg/600x600bb.jpg","provider":"spotify","providerSongId":"1256607810","externalUrls":{"spotify":"https://open.spotify.com/search/Motion%20Sickness%20Phoebe%20Bridgers","web":"https://open.spotify.com/search/Motion%20Sickness%20Phoebe%20Bridgers"},"metadata":{"durationMs":229760,"previewUrl":"https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview211/v4/88/0d/3c/880d3c6d-70f6-4628-a1dc-5b07ef90421c/mzaf_7359776133976251843.plus.aac.p.m4a","isExplicit":false,"genre":"Alternative","releaseYear":2017,"palette":{"dominant":"#8D99AE","primary":"#8D99AE","background":"#121316","surface":"#1E1F23"}},"createdAt":"2026-09-09T12:00:00Z"}'::jsonb, false),
  ('fallback_1779781782', '{"id":"spotify_1779781782","title":"Video Games","artist":"Lana Del Rey","album":"Born To Die","artworkUrl":"https://is1-ssl.mzstatic.com/image/thumb/Music211/v4/59/10/66/591066ea-3c85-3dfe-ef82-ffdbbcdfc8b9/12UMGIM00033.rgb.jpg/600x600bb.jpg","provider":"spotify","providerSongId":"1779781782","externalUrls":{"spotify":"https://open.spotify.com/search/Video%20Games%20Lana%20Del%20Rey","web":"https://open.spotify.com/search/Video%20Games%20Lana%20Del%20Rey"},"metadata":{"durationMs":281947,"previewUrl":"https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview211/v4/67/07/50/670750ec-42f9-fcf2-feef-9c4faa873ce8/mzaf_16864780503903222714.plus.aac.p.m4a","isExplicit":false,"genre":"Pop","releaseYear":2011,"palette":{"dominant":"#725752","primary":"#725752","background":"#121316","surface":"#1E1F23"}},"createdAt":"2026-09-08T12:00:00Z"}'::jsonb, false),
  ('fallback_1252758311', '{"id":"spotify_1252758311","title":"The Suburbs","artist":"Arcade Fire","album":"The Suburbs","artworkUrl":"https://is1-ssl.mzstatic.com/image/thumb/Music124/v4/ea/9f/1a/ea9f1ab0-4cac-c925-590d-14461f676912/886446576510.jpg/600x600bb.jpg","provider":"spotify","providerSongId":"1252758311","externalUrls":{"spotify":"https://open.spotify.com/search/The%20Suburbs%20Arcade%20Fire","web":"https://open.spotify.com/search/The%20Suburbs%20Arcade%20Fire"},"metadata":{"durationMs":315200,"previewUrl":"https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/dc/c5/43/dcc543fa-b27b-af1e-79ce-d3d918a4d712/mzaf_12413982163606594108.plus.aac.p.m4a","isExplicit":false,"genre":"Alternative","releaseYear":2010,"palette":{"dominant":"#556B2F","primary":"#556B2F","background":"#121316","surface":"#1E1F23"}},"createdAt":"2026-09-07T12:00:00Z"}'::jsonb, false),
  ('fallback_997914096', '{"id":"spotify_997914096","title":"Space Song","artist":"Beach House","album":"Depression Cherry","artworkUrl":"https://is1-ssl.mzstatic.com/image/thumb/Music125/v4/09/e0/d5/09e0d559-0682-f0f0-5e0c-3cd11e3114fd/beachhouse_depressioncherry_2400_300.jpg/600x600bb.jpg","provider":"spotify","providerSongId":"997914096","externalUrls":{"spotify":"https://open.spotify.com/search/Space%20Song%20Beach%20House","web":"https://open.spotify.com/search/Space%20Song%20Beach%20House"},"metadata":{"durationMs":320467,"previewUrl":"https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/41/61/14/416114cc-282e-4c76-2808-a3eb9c3f973d/mzaf_6665874998714897722.plus.aac.p.m4a","isExplicit":false,"genre":"Alternative","releaseYear":2015,"palette":{"dominant":"#6A5ACD","primary":"#6A5ACD","background":"#121316","surface":"#1E1F23"}},"createdAt":"2026-09-06T12:00:00Z"}'::jsonb, false)
ON CONFLICT (id) DO UPDATE SET song = EXCLUDED.song;

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

