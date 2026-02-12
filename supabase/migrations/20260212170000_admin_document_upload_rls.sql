-- Enforce admin-only document uploads with auditable uploader metadata.

-- Add uploader metadata columns to documents table.
ALTER TABLE public.documents
  ADD COLUMN IF NOT EXISTS uploaded_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS uploaded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS bucket_id TEXT,
  ADD COLUMN IF NOT EXISTS object_path TEXT;

-- Backfill existing rows safely.
UPDATE public.documents
SET uploaded_by = owner_id
WHERE uploaded_by IS NULL;

UPDATE public.documents
SET bucket_id = 'documents'
WHERE bucket_id IS NULL;

UPDATE public.documents
SET object_path = file_url
WHERE object_path IS NULL;

ALTER TABLE public.documents
  ALTER COLUMN uploaded_by SET NOT NULL,
  ALTER COLUMN bucket_id SET NOT NULL,
  ALTER COLUMN object_path SET NOT NULL;

-- Admin helper based on existing user_roles model.
CREATE OR REPLACE FUNCTION public.is_admin(uid UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(uid, 'admin'::public.app_role);
$$;

-- Documents: keep read policy as-is; lock writes to admins only.
DROP POLICY IF EXISTS "Users with write access can insert documents" ON public.documents;
DROP POLICY IF EXISTS "Company members can insert documents" ON public.documents;
DROP POLICY IF EXISTS "Authenticated users can insert their own documents" ON public.documents;
DROP POLICY IF EXISTS "Authenticated users can insert company documents" ON public.documents;
DROP POLICY IF EXISTS "documents_admin_insert" ON public.documents;

CREATE POLICY "documents_admin_insert"
  ON public.documents FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id = public.get_user_company_id(auth.uid())
    AND public.is_admin(auth.uid())
    AND owner_id = auth.uid()
    AND uploaded_by = auth.uid()
    AND bucket_id = 'documents'
    AND object_path IS NOT NULL
  );

DROP POLICY IF EXISTS "Users with write access can update documents" ON public.documents;
DROP POLICY IF EXISTS "documents_admin_update" ON public.documents;

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

DROP POLICY IF EXISTS "Admins can delete documents" ON public.documents;
DROP POLICY IF EXISTS "documents_admin_delete" ON public.documents;

CREATE POLICY "documents_admin_delete"
  ON public.documents FOR DELETE
  TO authenticated
  USING (
    company_id = public.get_user_company_id(auth.uid())
    AND public.is_admin(auth.uid())
  );

-- Storage: admins can upload/update in documents bucket.
DROP POLICY IF EXISTS "Users with write access can upload documents" ON storage.objects;
DROP POLICY IF EXISTS "Company members can upload documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload company documents" ON storage.objects;
DROP POLICY IF EXISTS "storage_admin_insert_docs" ON storage.objects;

CREATE POLICY "storage_admin_insert_docs"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'documents'
    AND public.is_admin(auth.uid())
    AND (storage.foldername(name))[1] = public.get_user_company_id(auth.uid())::text
  );

DROP POLICY IF EXISTS "Users with write access can update documents" ON storage.objects;
DROP POLICY IF EXISTS "storage_admin_update_docs" ON storage.objects;

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
