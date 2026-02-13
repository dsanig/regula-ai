
-- Step 1: Add new enum values (must commit before use)
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'Administrador';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'Editor';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'Espectador';

-- Step 2: Add is_superadmin column to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_superadmin BOOLEAN NOT NULL DEFAULT false;
