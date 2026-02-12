-- Standardize role/root-admin checks and enforce admin-only document uploads.

CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text,
  full_name text,
  is_root_admin boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.user_roles (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, role)
);

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_root_admin boolean NOT NULL DEFAULT false;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS profiles_read_own ON public.profiles;
CREATE POLICY profiles_read_own
ON public.profiles FOR SELECT
TO authenticated
USING (
  id = auth.uid()
  OR user_id = auth.uid()
);

DROP POLICY IF EXISTS roles_read_own ON public.user_roles;
CREATE POLICY roles_read_own
ON public.user_roles FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.has_role(uid uuid, r text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = uid AND role::text = r
  );
$$;

REVOKE ALL ON FUNCTION public.has_role(uuid, text) FROM public;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, text) TO authenticated;

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
    WHERE p.id = uid OR p.user_id = uid
    LIMIT 1
  ), false);
$$;

REVOKE ALL ON FUNCTION public.is_root_admin(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.is_root_admin(uuid) TO authenticated;

WITH u AS (SELECT id, email FROM auth.users WHERE lower(email) = 'admin@admin.com')
INSERT INTO public.profiles (id, user_id, email, is_admin, is_root_admin)
SELECT id, id, email, true, true FROM u
ON CONFLICT (id) DO UPDATE
SET email = EXCLUDED.email,
    is_admin = true,
    is_root_admin = true;

WITH u AS (SELECT id FROM auth.users WHERE lower(email) = 'admin@admin.com')
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'Administrador' FROM u
ON CONFLICT DO NOTHING;

ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS documents_admin_insert ON public.documents;
CREATE POLICY documents_admin_insert
ON public.documents
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'Administrador')
  AND uploaded_by = auth.uid()
);

DROP POLICY IF EXISTS storage_admin_insert_docs ON storage.objects;
CREATE POLICY storage_admin_insert_docs
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'documents'
  AND public.has_role(auth.uid(), 'Administrador')
);

DROP POLICY IF EXISTS storage_admin_update_docs ON storage.objects;
CREATE POLICY storage_admin_update_docs
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'documents' AND public.has_role(auth.uid(), 'Administrador'))
WITH CHECK (bucket_id = 'documents' AND public.has_role(auth.uid(), 'Administrador'));
