
-- SQL functions
CREATE OR REPLACE FUNCTION public.is_superadmin(uid uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT COALESCE((SELECT is_superadmin FROM public.profiles WHERE user_id = uid), false); $$;

CREATE OR REPLACE FUNCTION public.can_manage_company(uid uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT public.is_superadmin(uid) OR public.has_role(uid, 'Administrador'::app_role); $$;

CREATE OR REPLACE FUNCTION public.can_edit_content(uid uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT public.is_superadmin(uid) OR public.has_role(uid, 'Administrador'::app_role) OR public.has_role(uid, 'Editor'::app_role); $$;

-- user_directory view
CREATE OR REPLACE VIEW public.user_directory WITH (security_invoker = on) AS
SELECT DISTINCT ON (p.user_id)
  p.user_id AS id, p.email, p.full_name,
  COALESCE(ur.role::text, 'Espectador') AS role,
  p.is_superadmin, p.created_at
FROM public.profiles p
LEFT JOIN public.user_roles ur ON ur.user_id = p.user_id
ORDER BY p.user_id, ur.created_at DESC;

-- audits table
CREATE TABLE IF NOT EXISTS public.audits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id),
  title TEXT NOT NULL, description TEXT, audit_date DATE,
  auditor_id UUID, status TEXT NOT NULL DEFAULT 'open',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(), created_by UUID
);
ALTER TABLE public.audits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "View audits" ON public.audits FOR SELECT USING (company_id = get_user_company_id(auth.uid()));
CREATE POLICY "Insert audits" ON public.audits FOR INSERT WITH CHECK (company_id = get_user_company_id(auth.uid()) AND can_edit_content(auth.uid()));
CREATE POLICY "Update audits" ON public.audits FOR UPDATE USING (company_id = get_user_company_id(auth.uid()) AND can_edit_content(auth.uid()));

-- capa_plans table
CREATE TABLE IF NOT EXISTS public.capa_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_id UUID REFERENCES public.audits(id) ON DELETE CASCADE NOT NULL,
  description TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.capa_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "View capa" ON public.capa_plans FOR SELECT USING (audit_id IN (SELECT id FROM public.audits WHERE company_id = get_user_company_id(auth.uid())));
CREATE POLICY "Insert capa" ON public.capa_plans FOR INSERT WITH CHECK (audit_id IN (SELECT id FROM public.audits WHERE company_id = get_user_company_id(auth.uid())) AND can_edit_content(auth.uid()));

-- non_conformities table
CREATE TABLE IF NOT EXISTS public.non_conformities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  capa_plan_id UUID REFERENCES public.capa_plans(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL, description TEXT, severity TEXT, root_cause TEXT,
  status TEXT NOT NULL DEFAULT 'open', created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.non_conformities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "View NCs" ON public.non_conformities FOR SELECT USING (capa_plan_id IN (SELECT cp.id FROM public.capa_plans cp JOIN public.audits a ON a.id=cp.audit_id WHERE a.company_id=get_user_company_id(auth.uid())));
CREATE POLICY "Insert NCs" ON public.non_conformities FOR INSERT WITH CHECK (capa_plan_id IN (SELECT cp.id FROM public.capa_plans cp JOIN public.audits a ON a.id=cp.audit_id WHERE a.company_id=get_user_company_id(auth.uid())) AND can_edit_content(auth.uid()));
CREATE POLICY "Update NCs" ON public.non_conformities FOR UPDATE USING (capa_plan_id IN (SELECT cp.id FROM public.capa_plans cp JOIN public.audits a ON a.id=cp.audit_id WHERE a.company_id=get_user_company_id(auth.uid())) AND can_edit_content(auth.uid()));

-- actions table
CREATE TABLE IF NOT EXISTS public.actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  non_conformity_id UUID REFERENCES public.non_conformities(id) ON DELETE CASCADE NOT NULL,
  action_type TEXT NOT NULL DEFAULT 'corrective', description TEXT NOT NULL,
  responsible_id UUID, due_date DATE, status TEXT NOT NULL DEFAULT 'open',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.actions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "View actions" ON public.actions FOR SELECT USING (non_conformity_id IN (SELECT nc.id FROM public.non_conformities nc JOIN public.capa_plans cp ON cp.id=nc.capa_plan_id JOIN public.audits a ON a.id=cp.audit_id WHERE a.company_id=get_user_company_id(auth.uid())));
CREATE POLICY "Insert actions" ON public.actions FOR INSERT WITH CHECK (non_conformity_id IN (SELECT nc.id FROM public.non_conformities nc JOIN public.capa_plans cp ON cp.id=nc.capa_plan_id JOIN public.audits a ON a.id=cp.audit_id WHERE a.company_id=get_user_company_id(auth.uid())) AND can_edit_content(auth.uid()));
CREATE POLICY "Update actions" ON public.actions FOR UPDATE USING (non_conformity_id IN (SELECT nc.id FROM public.non_conformities nc JOIN public.capa_plans cp ON cp.id=nc.capa_plan_id JOIN public.audits a ON a.id=cp.audit_id WHERE a.company_id=get_user_company_id(auth.uid())) AND can_edit_content(auth.uid()));

-- action_attachments table
CREATE TABLE IF NOT EXISTS public.action_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action_id UUID REFERENCES public.actions(id) ON DELETE CASCADE NOT NULL,
  bucket_id TEXT NOT NULL DEFAULT 'documents', object_path TEXT NOT NULL,
  file_name TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT now(), created_by UUID
);
ALTER TABLE public.action_attachments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "View attach" ON public.action_attachments FOR SELECT USING (action_id IN (SELECT a.id FROM public.actions a JOIN public.non_conformities nc ON nc.id=a.non_conformity_id JOIN public.capa_plans cp ON cp.id=nc.capa_plan_id JOIN public.audits au ON au.id=cp.audit_id WHERE au.company_id=get_user_company_id(auth.uid())));
CREATE POLICY "Insert attach" ON public.action_attachments FOR INSERT WITH CHECK (action_id IN (SELECT a.id FROM public.actions a JOIN public.non_conformities nc ON nc.id=a.non_conformity_id JOIN public.capa_plans cp ON cp.id=nc.capa_plan_id JOIN public.audits au ON au.id=cp.audit_id WHERE au.company_id=get_user_company_id(auth.uid())) AND can_edit_content(auth.uid()));

-- incidencias table
CREATE TABLE IF NOT EXISTS public.incidencias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id),
  title TEXT NOT NULL, description TEXT,
  incidencia_type TEXT NOT NULL DEFAULT 'incidencia',
  audit_id UUID REFERENCES public.audits(id),
  responsible_id UUID, status TEXT NOT NULL DEFAULT 'open',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(), created_by UUID
);
ALTER TABLE public.incidencias ENABLE ROW LEVEL SECURITY;
CREATE POLICY "View incidencias" ON public.incidencias FOR SELECT USING (company_id = get_user_company_id(auth.uid()));
CREATE POLICY "Insert incidencias" ON public.incidencias FOR INSERT WITH CHECK (company_id = get_user_company_id(auth.uid()) AND can_edit_content(auth.uid()));
CREATE POLICY "Update incidencias" ON public.incidencias FOR UPDATE USING (company_id = get_user_company_id(auth.uid()) AND can_edit_content(auth.uid()));

-- Auto-create CAPA plan trigger
CREATE OR REPLACE FUNCTION public.auto_create_capa_plan()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$ BEGIN INSERT INTO public.capa_plans (audit_id, description) VALUES (NEW.id, 'Plan CAPA generado automáticamente'); RETURN NEW; END; $$;
DROP TRIGGER IF EXISTS trg_auto_create_capa_plan ON public.audits;
CREATE TRIGGER trg_auto_create_capa_plan AFTER INSERT ON public.audits FOR EACH ROW EXECUTE FUNCTION public.auto_create_capa_plan();

-- Storage policies (idempotent)
DO $$ BEGIN CREATE POLICY "Auth read docs" ON storage.objects FOR SELECT USING (bucket_id = 'documents' AND auth.uid() IS NOT NULL); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Auth upload docs" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'documents' AND auth.uid() IS NOT NULL); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Auth update docs" ON storage.objects FOR UPDATE USING (bucket_id = 'documents' AND auth.uid() IS NOT NULL); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Seed admin
UPDATE public.profiles SET is_superadmin = true WHERE email = 'admin@admin.com';
INSERT INTO public.user_roles (user_id, role)
SELECT p.user_id, 'Administrador'::app_role FROM public.profiles p WHERE p.email = 'admin@admin.com'
ON CONFLICT (user_id, role) DO NOTHING;
