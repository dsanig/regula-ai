-- Root-admin model and safe profile access for admin user management.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_root_admin boolean NOT NULL DEFAULT false;

-- Ensure canonical admin flag exists for environments missing prior migrations.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_admin boolean NOT NULL DEFAULT false;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Tighten profile reads to own row by default.
DROP POLICY IF EXISTS profiles_read_own ON public.profiles;
DROP POLICY IF EXISTS "Users can view profiles in their company" ON public.profiles;

CREATE POLICY profiles_read_own
ON public.profiles
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Allow admins to list profile directory safely.
DROP POLICY IF EXISTS admins_can_view_directory ON public.profiles;
CREATE POLICY admins_can_view_directory
ON public.profiles
FOR SELECT
TO authenticated
USING (public.is_admin(auth.uid()));

-- Prevent client-side privilege escalation.
REVOKE UPDATE (is_root_admin) ON public.profiles FROM anon, authenticated;
REVOKE UPDATE (is_admin) ON public.profiles FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.is_root_admin(uid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE((
    SELECT p.is_root_admin
    FROM public.profiles p
    WHERE p.user_id = uid
  ), false);
$$;

REVOKE ALL ON FUNCTION public.is_root_admin(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.is_root_admin(uuid) TO authenticated;

-- Ensure dedicated root account is always flagged as root admin.
WITH u AS (
  SELECT id, email
  FROM auth.users
  WHERE lower(email) = 'admin@admin.com'
)
INSERT INTO public.profiles (user_id, email, full_name, is_admin, is_root_admin)
SELECT u.id, u.email, COALESCE(u.email, 'admin@admin.com'), true, true
FROM u
ON CONFLICT (user_id) DO UPDATE
SET email = EXCLUDED.email,
    is_admin = true,
    is_root_admin = true;

-- Safe directory projection for UI listing.
CREATE OR REPLACE VIEW public.user_directory AS
SELECT
  p.user_id AS id,
  p.email,
  p.full_name,
  p.is_admin,
  p.is_root_admin,
  p.created_at
FROM public.profiles p;
