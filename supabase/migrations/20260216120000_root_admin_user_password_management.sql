-- Align profiles identity with auth.users and lock down read access for root-admin management.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_root_admin boolean NOT NULL DEFAULT false;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_admin boolean NOT NULL DEFAULT false;

-- Keep profiles.id aligned to auth.users.id so RLS can safely rely on id = auth.uid().
UPDATE public.profiles
SET id = user_id
WHERE id IS DISTINCT FROM user_id;

DROP POLICY IF EXISTS profiles_read_own ON public.profiles;
CREATE POLICY profiles_read_own
on public.profiles for select
to authenticated
using (id = auth.uid());

DROP POLICY IF EXISTS profiles_read_root ON public.profiles;
DROP POLICY IF EXISTS admins_can_view_directory ON public.profiles;
DROP POLICY IF EXISTS "Users can view profiles in their company" ON public.profiles;
CREATE POLICY profiles_read_root
on public.profiles for select
to authenticated
using (public.is_root_admin(auth.uid()));

REVOKE UPDATE (is_root_admin) ON public.profiles FROM anon, authenticated;

-- Ensure dedicated root account exists and is marked accordingly.
WITH root_user AS (
  SELECT id, lower(email) AS email
  FROM auth.users
  WHERE lower(email) = 'admin@admin.com'
)
INSERT INTO public.profiles (id, user_id, email, full_name, is_admin, is_root_admin)
SELECT id, id, email, 'Administrador principal', true, true
FROM root_user
ON CONFLICT (id) DO UPDATE
SET user_id = EXCLUDED.user_id,
    email = EXCLUDED.email,
    is_admin = true,
    is_root_admin = true;

CREATE OR REPLACE VIEW public.user_directory AS
SELECT
  p.id,
  p.email,
  p.full_name,
  p.is_admin,
  p.is_root_admin,
  p.created_at
FROM public.profiles p;
