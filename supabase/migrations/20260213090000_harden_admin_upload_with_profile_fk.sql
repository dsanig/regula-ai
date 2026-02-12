-- Harden admin authorization and document upload RLS.
-- Root cause: admin checks depended only on public.user_roles + visible profile state,
-- and seeded users like admin@admin.com could miss profile/admin-role rows.

-- 1) Guarantee every auth user has a profile row.
INSERT INTO public.profiles (user_id, email, full_name)
SELECT u.id, COALESCE(u.email, ''), COALESCE(u.raw_user_meta_data->>'full_name', u.email)
FROM auth.users u
LEFT JOIN public.profiles p ON p.user_id = u.id
WHERE p.id IS NULL;

-- 2) Add and backfill canonical is_admin flag on profiles.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT false;

UPDATE public.profiles p
SET is_admin = true
WHERE EXISTS (
  SELECT 1
  FROM public.user_roles ur
  WHERE ur.user_id = p.user_id
    AND ur.role = 'admin'::public.app_role
)
   OR lower(p.email) = 'admin@admin.com';

-- Ensure seeded admin account has explicit admin role as well (idempotent).
INSERT INTO public.user_roles (user_id, role)
SELECT p.user_id, 'admin'::public.app_role
FROM public.profiles p
WHERE lower(p.email) = 'admin@admin.com'
ON CONFLICT (user_id, role) DO NOTHING;

-- 3) Lock down profile admin flag edits for normal users.
REVOKE UPDATE (is_admin) ON public.profiles FROM anon, authenticated;

-- 4) Reliable SECURITY DEFINER admin check.
CREATE OR REPLACE FUNCTION public.is_admin(uid UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.user_id = uid
      AND p.is_admin = true
  ) OR EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = uid
      AND ur.role = 'admin'::public.app_role
  );
END;
$$;

-- 5) Move documents.uploaded_by FK target from auth.users(id) to profiles(id).
ALTER TABLE public.documents
  DROP CONSTRAINT IF EXISTS documents_uploaded_by_fkey;

UPDATE public.documents d
SET uploaded_by = p.id
FROM public.profiles p
WHERE d.uploaded_by = p.user_id;

ALTER TABLE public.documents
  ADD CONSTRAINT documents_uploaded_by_fkey
  FOREIGN KEY (uploaded_by) REFERENCES public.profiles(id) ON DELETE RESTRICT;

-- 6) Tighten documents RLS for admin-only writes in-company.
DROP POLICY IF EXISTS "documents_admin_insert" ON public.documents;
DROP POLICY IF EXISTS "documents_admin_update" ON public.documents;
DROP POLICY IF EXISTS "documents_admin_delete" ON public.documents;
DROP POLICY IF EXISTS "Authenticated users can insert company documents" ON public.documents;
DROP POLICY IF EXISTS "Authenticated users can insert their own documents" ON public.documents;
DROP POLICY IF EXISTS "Company members can insert documents" ON public.documents;
DROP POLICY IF EXISTS "Users with write access can insert documents" ON public.documents;
DROP POLICY IF EXISTS "Users with write access can update documents" ON public.documents;
DROP POLICY IF EXISTS "Admins can delete documents" ON public.documents;

CREATE POLICY "documents_admin_insert"
  ON public.documents FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id = public.get_user_company_id(auth.uid())
    AND public.is_admin(auth.uid())
    AND owner_id = auth.uid()
    AND uploaded_by IN (
      SELECT p.id FROM public.profiles p WHERE p.user_id = auth.uid()
    )
    AND bucket_id = 'documents'
    AND object_path IS NOT NULL
  );

CREATE POLICY "documents_admin_update"
  ON public.documents FOR UPDATE
  TO authenticated
  USING (
    company_id = public.get_user_company_id(auth.uid())
    AND public.is_admin(auth.uid())
  )
  WITH CHECK (
    company_id = public.get_user_company_id(auth.uid())
    AND public.is_admin(auth.uid())
  );

CREATE POLICY "documents_admin_delete"
  ON public.documents FOR DELETE
  TO authenticated
  USING (
    company_id = public.get_user_company_id(auth.uid())
    AND public.is_admin(auth.uid())
  );

-- 7) Tighten storage.objects RLS for documents bucket.
DROP POLICY IF EXISTS "storage_admin_insert_docs" ON storage.objects;
DROP POLICY IF EXISTS "storage_admin_update_docs" ON storage.objects;
DROP POLICY IF EXISTS "Users with write access can upload documents" ON storage.objects;
DROP POLICY IF EXISTS "Company members can upload documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload company documents" ON storage.objects;
DROP POLICY IF EXISTS "Users with write access can update documents" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete documents from storage" ON storage.objects;

CREATE POLICY "storage_admin_insert_docs"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'documents'
    AND public.is_admin(auth.uid())
    AND (storage.foldername(name))[1] = public.get_user_company_id(auth.uid())::text
  );

CREATE POLICY "storage_admin_update_docs"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'documents'
    AND public.is_admin(auth.uid())
    AND (storage.foldername(name))[1] = public.get_user_company_id(auth.uid())::text
  )
  WITH CHECK (
    bucket_id = 'documents'
    AND public.is_admin(auth.uid())
    AND (storage.foldername(name))[1] = public.get_user_company_id(auth.uid())::text
  );

CREATE POLICY "storage_admin_delete_docs"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'documents'
    AND public.is_admin(auth.uid())
    AND (storage.foldername(name))[1] = public.get_user_company_id(auth.uid())::text
  );
