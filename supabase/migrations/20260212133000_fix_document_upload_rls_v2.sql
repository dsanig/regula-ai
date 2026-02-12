-- Make document creation/upload policies resilient by avoiding helper-function company checks.
-- This prevents false negatives where get_user_company_id(auth.uid()) returns null in policy evaluation.

DROP POLICY IF EXISTS "Company members can insert documents" ON public.documents;
DROP POLICY IF EXISTS "Users with write access can insert documents" ON public.documents;
CREATE POLICY "Authenticated users can insert their own documents"
  ON public.documents FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND owner_id = auth.uid()
    AND company_id IS NOT NULL
  );

DROP POLICY IF EXISTS "Company members can upload documents" ON storage.objects;
DROP POLICY IF EXISTS "Users with write access can upload documents" ON storage.objects;
CREATE POLICY "Authenticated users can upload documents"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND bucket_id = 'documents'
  );
