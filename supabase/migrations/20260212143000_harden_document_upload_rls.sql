-- Ensure authenticated users can upload documents for their own company without elevated roles.
-- Uses direct profile checks instead of helper-function role checks that can return false negatives.

-- Documents table insert policy
DROP POLICY IF EXISTS "Users with write access can insert documents" ON public.documents;
DROP POLICY IF EXISTS "Company members can insert documents" ON public.documents;
DROP POLICY IF EXISTS "Authenticated users can insert their own documents" ON public.documents;

CREATE POLICY "Authenticated users can insert company documents"
  ON public.documents FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND owner_id = auth.uid()
    AND company_id IS NOT NULL
    AND company_id IN (
      SELECT p.company_id
      FROM public.profiles p
      WHERE p.user_id = auth.uid()
        AND p.company_id IS NOT NULL
    )
  );

-- Storage insert policy for documents bucket
DROP POLICY IF EXISTS "Users with write access can upload documents" ON storage.objects;
DROP POLICY IF EXISTS "Company members can upload documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload documents" ON storage.objects;

CREATE POLICY "Authenticated users can upload company documents"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND bucket_id = 'documents'
    AND (storage.foldername(name))[1] IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.user_id = auth.uid()
        AND p.company_id::text = (storage.foldername(name))[1]
    )
  );
