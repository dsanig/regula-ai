-- Align admin source-of-truth and document upload authorization with DB-backed roles.

-- 1) Ensure role enum supports the canonical Spanish admin label.
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'Administrador';

-- 2) Robust admin check used by RLS + frontend.
CREATE OR REPLACE FUNCTION public.is_admin(uid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = uid
      AND ur.role::text IN ('Administrador', 'admin')
  );
$$;

REVOKE ALL ON FUNCTION public.is_admin(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO authenticated;

-- 3) Ensure seeded admin account has profile row + admin role assignment (idempotent).
WITH u AS (
  SELECT id, email
  FROM auth.users
  WHERE lower(email) = 'admin@admin.com'
)
INSERT INTO public.profiles (user_id, email, full_name)
SELECT u.id, u.email, COALESCE(u.email, 'admin@admin.com')
FROM u
ON CONFLICT (user_id) DO UPDATE SET email = EXCLUDED.email;

WITH u AS (
  SELECT id
  FROM auth.users
  WHERE lower(email) = 'admin@admin.com'
)
INSERT INTO public.user_roles (user_id, role)
SELECT u.id, 'Administrador'::public.app_role
FROM u
ON CONFLICT (user_id, role) DO NOTHING;

-- Backward compatibility for existing admin checks in legacy policies.
WITH u AS (
  SELECT id
  FROM auth.users
  WHERE lower(email) = 'admin@admin.com'
)
INSERT INTO public.user_roles (user_id, role)
SELECT u.id, 'admin'::public.app_role
FROM u
ON CONFLICT (user_id, role) DO NOTHING;

-- 4) Standardize documents uploader identity to auth.users(id).
ALTER TABLE public.documents
  ADD COLUMN IF NOT EXISTS uploaded_by_email text;

-- Migrate rows where uploaded_by currently points to profiles.id.
UPDATE public.documents d
SET uploaded_by = p.user_id
FROM public.profiles p
WHERE d.uploaded_by = p.id;

ALTER TABLE public.documents
  DROP CONSTRAINT IF EXISTS documents_uploaded_by_fkey;

ALTER TABLE public.documents
  ADD CONSTRAINT documents_uploaded_by_fkey
  FOREIGN KEY (uploaded_by) REFERENCES auth.users(id) ON DELETE RESTRICT;

ALTER TABLE public.documents
  ALTER COLUMN uploaded_by SET NOT NULL,
  ALTER COLUMN bucket_id SET NOT NULL,
  ALTER COLUMN object_path SET NOT NULL;

UPDATE public.documents d
SET uploaded_by_email = COALESCE(d.uploaded_by_email, u.email)
FROM auth.users u
WHERE u.id = d.uploaded_by;

-- 5) Documents RLS: admin-only inserts, uploader must be current user.
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS documents_admin_insert ON public.documents;
DROP POLICY IF EXISTS "Authenticated users can insert company documents" ON public.documents;
DROP POLICY IF EXISTS "Authenticated users can insert their own documents" ON public.documents;
DROP POLICY IF EXISTS "Company members can insert documents" ON public.documents;
DROP POLICY IF EXISTS "Users with write access can insert documents" ON public.documents;

CREATE POLICY documents_admin_insert
ON public.documents
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_admin(auth.uid())
  AND uploaded_by = auth.uid()
  AND bucket_id = 'documents'
  AND object_path IS NOT NULL
);

DROP POLICY IF EXISTS documents_read_authenticated ON public.documents;
CREATE POLICY documents_read_authenticated
ON public.documents
FOR SELECT
TO authenticated
USING (company_id = public.get_user_company_id(auth.uid()));

-- 6) Storage RLS: admin-only writes for documents bucket.
DROP POLICY IF EXISTS storage_admin_insert_docs ON storage.objects;
DROP POLICY IF EXISTS "Users with write access can upload documents" ON storage.objects;
DROP POLICY IF EXISTS "Company members can upload documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload company documents" ON storage.objects;

CREATE POLICY storage_admin_insert_docs
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'documents'
  AND public.is_admin(auth.uid())
);

DROP POLICY IF EXISTS storage_admin_update_docs ON storage.objects;
DROP POLICY IF EXISTS "Users with write access can update documents" ON storage.objects;

CREATE POLICY storage_admin_update_docs
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'documents' AND public.is_admin(auth.uid()))
WITH CHECK (bucket_id = 'documents' AND public.is_admin(auth.uid()));

DROP POLICY IF EXISTS storage_read_docs_authenticated ON storage.objects;
CREATE POLICY storage_read_docs_authenticated
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'documents');
