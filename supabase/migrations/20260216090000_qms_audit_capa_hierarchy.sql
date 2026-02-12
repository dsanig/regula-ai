-- QMS hierarchy for audits, CAPA plans, non-conformities, actions, and incidencias.

CREATE TABLE IF NOT EXISTS public.audits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  audit_date date,
  auditor_id uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.capa_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_id uuid NOT NULL REFERENCES public.audits(id) ON DELETE CASCADE,
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (audit_id)
);

CREATE TABLE IF NOT EXISTS public.non_conformities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  capa_plan_id uuid NOT NULL REFERENCES public.capa_plans(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  severity text,
  root_cause text,
  status text NOT NULL DEFAULT 'open',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  non_conformity_id uuid NOT NULL REFERENCES public.non_conformities(id) ON DELETE CASCADE,
  action_type text NOT NULL CHECK (action_type IN ('corrective', 'preventive')),
  description text NOT NULL,
  responsible_id uuid REFERENCES auth.users(id),
  due_date date,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'closed', 'overdue')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.action_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action_id uuid NOT NULL REFERENCES public.actions(id) ON DELETE CASCADE,
  bucket_id text NOT NULL,
  object_path text NOT NULL,
  uploaded_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.incidencias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  incidencia_type text NOT NULL,
  audit_id uuid REFERENCES public.audits(id) ON DELETE SET NULL,
  responsible_id uuid REFERENCES auth.users(id),
  status text NOT NULL DEFAULT 'open',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Backward-compatible upgrades if an incidencias table already exists.
ALTER TABLE IF EXISTS public.incidencias
  ADD COLUMN IF NOT EXISTS incidencia_type text;

ALTER TABLE IF EXISTS public.incidencias
  ADD COLUMN IF NOT EXISTS audit_id uuid REFERENCES public.audits(id) ON DELETE SET NULL;

UPDATE public.incidencias
SET incidencia_type = COALESCE(NULLIF(incidencia_type, ''), 'incidencia')
WHERE incidencia_type IS NULL OR incidencia_type = '';

ALTER TABLE IF EXISTS public.incidencias
  ALTER COLUMN incidencia_type SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_capa_plans_audit_id ON public.capa_plans(audit_id);
CREATE INDEX IF NOT EXISTS idx_non_conformities_capa_plan_id ON public.non_conformities(capa_plan_id);
CREATE INDEX IF NOT EXISTS idx_actions_non_conformity_id ON public.actions(non_conformity_id);
CREATE INDEX IF NOT EXISTS idx_action_attachments_action_id ON public.action_attachments(action_id);
CREATE INDEX IF NOT EXISTS idx_incidencias_audit_id ON public.incidencias(audit_id);

CREATE OR REPLACE FUNCTION public.create_capa_plan_for_audit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.capa_plans (audit_id)
  VALUES (NEW.id)
  ON CONFLICT (audit_id) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_create_capa_plan_for_audit ON public.audits;
CREATE TRIGGER trg_create_capa_plan_for_audit
AFTER INSERT ON public.audits
FOR EACH ROW
EXECUTE FUNCTION public.create_capa_plan_for_audit();

ALTER TABLE public.audits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.capa_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.non_conformities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.action_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incidencias ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS audits_admin_full_access ON public.audits;
CREATE POLICY audits_admin_full_access
ON public.audits FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'Administrador'))
WITH CHECK (public.has_role(auth.uid(), 'Administrador'));

DROP POLICY IF EXISTS audits_viewer_read_only ON public.audits;
CREATE POLICY audits_viewer_read_only
ON public.audits FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'Viewer') OR public.has_role(auth.uid(), 'Administrador'));

DROP POLICY IF EXISTS capa_plans_admin_full_access ON public.capa_plans;
CREATE POLICY capa_plans_admin_full_access
ON public.capa_plans FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'Administrador'))
WITH CHECK (public.has_role(auth.uid(), 'Administrador'));

DROP POLICY IF EXISTS capa_plans_viewer_read_only ON public.capa_plans;
CREATE POLICY capa_plans_viewer_read_only
ON public.capa_plans FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'Viewer') OR public.has_role(auth.uid(), 'Administrador'));

DROP POLICY IF EXISTS non_conformities_admin_full_access ON public.non_conformities;
CREATE POLICY non_conformities_admin_full_access
ON public.non_conformities FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'Administrador'))
WITH CHECK (public.has_role(auth.uid(), 'Administrador'));

DROP POLICY IF EXISTS non_conformities_viewer_read_only ON public.non_conformities;
CREATE POLICY non_conformities_viewer_read_only
ON public.non_conformities FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'Viewer') OR public.has_role(auth.uid(), 'Administrador'));

DROP POLICY IF EXISTS actions_admin_full_access ON public.actions;
CREATE POLICY actions_admin_full_access
ON public.actions FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'Administrador'))
WITH CHECK (public.has_role(auth.uid(), 'Administrador'));

DROP POLICY IF EXISTS actions_viewer_read_only ON public.actions;
CREATE POLICY actions_viewer_read_only
ON public.actions FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'Viewer') OR public.has_role(auth.uid(), 'Administrador'));

DROP POLICY IF EXISTS action_attachments_admin_full_access ON public.action_attachments;
CREATE POLICY action_attachments_admin_full_access
ON public.action_attachments FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'Administrador'))
WITH CHECK (public.has_role(auth.uid(), 'Administrador'));

DROP POLICY IF EXISTS action_attachments_viewer_read_only ON public.action_attachments;
CREATE POLICY action_attachments_viewer_read_only
ON public.action_attachments FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'Viewer') OR public.has_role(auth.uid(), 'Administrador'));

DROP POLICY IF EXISTS incidencias_admin_full_access ON public.incidencias;
CREATE POLICY incidencias_admin_full_access
ON public.incidencias FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'Administrador'))
WITH CHECK (public.has_role(auth.uid(), 'Administrador'));

DROP POLICY IF EXISTS incidencias_viewer_read_only ON public.incidencias;
CREATE POLICY incidencias_viewer_read_only
ON public.incidencias FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'Viewer') OR public.has_role(auth.uid(), 'Administrador'));
