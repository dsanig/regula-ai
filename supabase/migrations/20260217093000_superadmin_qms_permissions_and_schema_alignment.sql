-- Ensure superadmin/admin permissions are aligned across UI + RLS + QMS tables.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  user_id uuid UNIQUE,
  email text,
  full_name text,
  is_admin boolean NOT NULL DEFAULT false,
  is_root_admin boolean NOT NULL DEFAULT false,
  is_superadmin boolean GENERATED ALWAYS AS (is_root_admin) STORED,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS user_id uuid,
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS full_name text,
  ADD COLUMN IF NOT EXISTS is_admin boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_root_admin boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();

UPDATE public.profiles
SET user_id = id
WHERE user_id IS NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'profiles_user_id_fkey'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_user_id_fkey
      FOREIGN KEY (user_id)
      REFERENCES auth.users(id)
      ON DELETE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_attribute
    WHERE attrelid = 'public.profiles'::regclass
      AND attname = 'is_superadmin'
      AND NOT attisdropped
  ) THEN
    ALTER TABLE public.profiles
      ADD COLUMN is_superadmin boolean GENERATED ALWAYS AS (is_root_admin) STORED;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.user_roles (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_superadmin(uid uuid)
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

CREATE OR REPLACE FUNCTION public.has_role(uid uuid, r text)
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
      AND lower(ur.role) = lower(r)
  );
$$;

CREATE OR REPLACE FUNCTION public.can_manage_qms(uid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_superadmin(uid) OR public.has_role(uid, 'Administrador');
$$;

REVOKE ALL ON FUNCTION public.is_superadmin(uuid) FROM public;
REVOKE ALL ON FUNCTION public.has_role(uuid, text) FROM public;
REVOKE ALL ON FUNCTION public.can_manage_qms(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.is_superadmin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_manage_qms(uuid) TO authenticated;

DROP POLICY IF EXISTS profiles_read_own ON public.profiles;
CREATE POLICY profiles_read_own
ON public.profiles
FOR SELECT
TO authenticated
USING (id = auth.uid() OR user_id = auth.uid());

DROP POLICY IF EXISTS profiles_read_admin_all ON public.profiles;
CREATE POLICY profiles_read_admin_all
ON public.profiles
FOR SELECT
TO authenticated
USING (
  public.is_superadmin(auth.uid())
  OR public.has_role(auth.uid(), 'Administrador')
);

DROP POLICY IF EXISTS roles_read_own ON public.user_roles;
CREATE POLICY roles_read_own
ON public.user_roles
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
  OR public.can_manage_qms(auth.uid())
);

WITH u AS (
  SELECT id, email
  FROM auth.users
  WHERE lower(email) = 'admin@admin.com'
)
INSERT INTO public.profiles (id, user_id, email, is_admin, is_root_admin)
SELECT id, id, email, true, true
FROM u
ON CONFLICT (id)
DO UPDATE SET
  user_id = EXCLUDED.user_id,
  email = EXCLUDED.email,
  is_admin = true,
  is_root_admin = true;

WITH u AS (
  SELECT id
  FROM auth.users
  WHERE lower(email) = 'admin@admin.com'
)
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'Administrador'
FROM u
ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS public.audits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  audit_date date,
  description text,
  auditor_id uuid REFERENCES auth.users(id),
  created_by uuid REFERENCES auth.users(id),
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
  status text NOT NULL DEFAULT 'open',
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

ALTER TABLE public.audits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.capa_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.non_conformities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incidencias ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  DROP POLICY IF EXISTS audits_manage ON public.audits;
  CREATE POLICY audits_manage ON public.audits
  FOR ALL TO authenticated
  USING (public.can_manage_qms(auth.uid()))
  WITH CHECK (public.can_manage_qms(auth.uid()));

  DROP POLICY IF EXISTS capa_manage ON public.capa_plans;
  CREATE POLICY capa_manage ON public.capa_plans
  FOR ALL TO authenticated
  USING (public.can_manage_qms(auth.uid()))
  WITH CHECK (public.can_manage_qms(auth.uid()));

  DROP POLICY IF EXISTS nc_manage ON public.non_conformities;
  CREATE POLICY nc_manage ON public.non_conformities
  FOR ALL TO authenticated
  USING (public.can_manage_qms(auth.uid()))
  WITH CHECK (public.can_manage_qms(auth.uid()));

  DROP POLICY IF EXISTS actions_manage ON public.actions;
  CREATE POLICY actions_manage ON public.actions
  FOR ALL TO authenticated
  USING (public.can_manage_qms(auth.uid()))
  WITH CHECK (public.can_manage_qms(auth.uid()));

  DROP POLICY IF EXISTS incidencias_manage ON public.incidencias;
  CREATE POLICY incidencias_manage ON public.incidencias
  FOR ALL TO authenticated
  USING (public.can_manage_qms(auth.uid()))
  WITH CHECK (public.can_manage_qms(auth.uid()));
END $$;
