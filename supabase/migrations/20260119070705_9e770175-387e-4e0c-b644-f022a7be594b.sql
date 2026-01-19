-- Remove the overly permissive policy that allows anyone to view demo codes
DROP POLICY IF EXISTS "Anyone can view unused demo codes for validation" ON public.demo_codes;

-- Demo codes should only be validated via the secure edge function
-- No direct client access is needed anymore