
-- Table to store document digital signatures
CREATE TABLE public.document_signatures (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  signed_by UUID NOT NULL,
  signer_name TEXT,
  signer_email TEXT,
  signature_method TEXT NOT NULL DEFAULT 'autofirma_dnie',
  signature_data TEXT,
  signed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.document_signatures ENABLE ROW LEVEL SECURITY;

-- Users can view signatures for documents in their company
CREATE POLICY "Users can view document signatures"
ON public.document_signatures
FOR SELECT
USING (document_id IN (
  SELECT id FROM public.documents
  WHERE company_id = get_user_company_id(auth.uid())
));

-- Authenticated users can insert their own signatures
CREATE POLICY "Users can insert their own signatures"
ON public.document_signatures
FOR INSERT
WITH CHECK (signed_by = auth.uid() AND document_id IN (
  SELECT id FROM public.documents
  WHERE company_id = get_user_company_id(auth.uid())
));
