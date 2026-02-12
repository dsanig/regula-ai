-- Unified role model: Superadmin + Administrador + Editor + Espectador.
-- Source of truth lives in profiles (superadmin flag) and user_roles (assignable roles).

CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text,
  full_name text,
  is_superadmin boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS full_name text,
  ADD COLUMN IF NOT EXISTS is_superadmin boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();

UPDATE public.profiles
SET is_superadmin = true
WHERE COALESCE(is_root_admin, false) = true;

REVOKE UPDATE (is_superadmin) ON public.profiles FROM anon, authenticated;

CREATE TABLE IF NOT EXISTS public.user_roles (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('Administrador', 'Editor', 'Espectador')),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, role)
);

ALTER TABLE public.user_roles
  DROP CONSTRAINT IF EXISTS user_roles_role_check;

ALTER TABLE public.user_roles
  ADD CONSTRAINT user_roles_role_check
  CHECK (role IN ('Administrador', 'Editor', 'Espectador'));

UPDATE public.user_roles
SET role = CASE
  WHEN lower(role) IN ('admin', 'administrador') THEN 'Administrador'
  WHEN lower(role) IN ('editor') THEN 'Editor'
  WHEN lower(role) IN ('viewer', 'espectador') THEN 'Espectador'
  ELSE role
END;

DELETE FROM public.user_roles
WHERE role NOT IN ('Administrador', 'Editor', 'Espectador');

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_superadmin(uid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE((
    SELECT p.is_superadmin
    FROM public.profiles p
    WHERE p.id = uid
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
    FROM public.user_roles
    WHERE user_id = uid
      AND role = r
  );
$$;

CREATE OR REPLACE FUNCTION public.can_manage_company(uid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_superadmin(uid)
     OR public.has_role(uid, 'Administrador');
$$;

CREATE OR REPLACE FUNCTION public.can_edit_content(uid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_superadmin(uid)
     OR public.has_role(uid, 'Administrador')
     OR public.has_role(uid, 'Editor');
$$;

REVOKE ALL ON FUNCTION public.is_superadmin(uuid) FROM public;
REVOKE ALL ON FUNCTION public.has_role(uuid, text) FROM public;
REVOKE ALL ON FUNCTION public.can_manage_company(uuid) FROM public;
REVOKE ALL ON FUNCTION public.can_edit_content(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.is_superadmin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_manage_company(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_edit_content(uuid) TO authenticated;

WITH u AS (
  SELECT id, email
  FROM auth.users
  WHERE lower(email) = 'admin@admin.com'
)
INSERT INTO public.profiles (id, email, is_superadmin)
SELECT id, email, true
FROM u
ON CONFLICT (id)
DO UPDATE SET
  email = EXCLUDED.email,
  is_superadmin = true;

CREATE OR REPLACE VIEW public.user_directory AS
SELECT
  p.id,
  p.email,
  p.full_name,
  p.is_superadmin,
  COALESCE(
    (
      SELECT ur.role
      FROM public.user_roles ur
      WHERE ur.user_id = p.id
      ORDER BY CASE ur.role
        WHEN 'Administrador' THEN 1
        WHEN 'Editor' THEN 2
        ELSE 3
      END
      LIMIT 1
    ),
    'Espectador'
  ) AS role,
  p.created_at
FROM public.profiles p;

DROP POLICY IF EXISTS profiles_read_own ON public.profiles;
CREATE POLICY profiles_read_own
ON public.profiles
FOR SELECT
TO authenticated
USING (id = auth.uid());

DROP POLICY IF EXISTS profiles_read_admin_all ON public.profiles;
DROP POLICY IF EXISTS profiles_read_root ON public.profiles;
CREATE POLICY profiles_read_company_admin
ON public.profiles
FOR SELECT
TO authenticated
USING (public.can_manage_company(auth.uid()));

DROP POLICY IF EXISTS roles_read_own ON public.user_roles;
CREATE POLICY user_roles_read
ON public.user_roles
FOR SELECT
TO authenticated
USING (user_id = auth.uid() OR public.can_manage_company(auth.uid()));

DROP POLICY IF EXISTS user_roles_manage ON public.user_roles;
CREATE POLICY user_roles_manage
ON public.user_roles
FOR ALL
TO authenticated
USING (public.can_manage_company(auth.uid()))
WITH CHECK (public.can_manage_company(auth.uid()));

DO $$
DECLARE
  table_name text;
  managed_tables text[] := ARRAY[
    'documents',
    'audits',
    'capa_plans',
    'non_conformities',
    'actions',
    'incidencias',
    'action_attachments'
  ];
BEGIN
  FOREACH table_name IN ARRAY managed_tables LOOP
    IF to_regclass(format('public.%I', table_name)) IS NOT NULL THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', table_name);
      EXECUTE format('DROP POLICY IF EXISTS %I_edit ON public.%I', table_name, table_name);
      EXECUTE format(
        'CREATE POLICY %I_edit ON public.%I FOR ALL TO authenticated USING (public.can_edit_content(auth.uid())) WITH CHECK (public.can_edit_content(auth.uid()))',
        table_name,
        table_name
      );
      EXECUTE format('DROP POLICY IF EXISTS %I_read ON public.%I', table_name, table_name);
      EXECUTE format(
        'CREATE POLICY %I_read ON public.%I FOR SELECT TO authenticated USING (true)',
        table_name,
        table_name
      );
    END IF;
  END LOOP;
END $$;
