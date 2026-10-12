-- ==============================================================================
-- 365 Security Migration: RLS Hardening & Public Profile View
-- ==============================================================================

-- 1. Drop wide-open public policy on public.users
DROP POLICY IF EXISTS "Public read user profiles" ON public.users;
DROP POLICY IF EXISTS "Users read own profile or admin reads all" ON public.users;

-- 2. Restrict raw public.users table to row owners and admins only
CREATE POLICY "Users read own profile or admin reads all"
  ON public.users FOR SELECT
  USING (
    auth.uid() = id 
    OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND is_admin = true)
  );

-- 3. Create sanitized public.profiles view
-- Strips private columns: email, push_tokens, notification_prefs, is_banned, is_admin
CREATE OR REPLACE VIEW public.profiles WITH (security_invoker = false) AS
  SELECT
    id,
    username,
    display_name,
    avatar_url,
    stats,
    created_at
  FROM public.users;

-- 4. Grant read permissions on public.profiles to public visitors and users
GRANT SELECT ON public.profiles TO anon, authenticated;
