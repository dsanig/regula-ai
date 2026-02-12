-- Relax document upload policies so any authenticated company member can upload documents.
-- Previous policies required elevated roles, which blocked standard users during upload.

DROP POLICY IF EXISTS "Users with write access can insert documents" ON public.documents;
CREATE POLICY "Company members can insert documents"
  ON public.documents FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND company_id = public.get_user_company_id(auth.uid())
    AND owner_id = auth.uid()
  );

DROP POLICY IF EXISTS "Users with write access can upload documents" ON storage.objects;
CREATE POLICY "Company members can upload documents"
  ON storage.objects FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND bucket_id = 'documents'
    AND (storage.foldername(name))[1] = public.get_user_company_id(auth.uid())::text
  );
