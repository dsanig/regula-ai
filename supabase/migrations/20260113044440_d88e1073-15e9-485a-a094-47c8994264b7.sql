-- Fix overly permissive RLS policies

-- Drop the permissive policies
DROP POLICY IF EXISTS "System can insert profiles" ON public.profiles;
DROP POLICY IF EXISTS "System can insert notifications" ON public.notifications;

-- Create more restrictive profile insert policy
-- Profiles are only inserted by the handle_new_user trigger, which runs as SECURITY DEFINER
-- So we need to allow inserts where the user_id matches the authenticated user
CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Notifications can be inserted by the system (edge functions with service role) 
-- or by admins for company-wide notifications
CREATE POLICY "Admins can insert notifications for their company users"
  ON public.notifications FOR INSERT
  WITH CHECK (
    user_id IN (
      SELECT p.user_id FROM public.profiles p 
      WHERE p.company_id = public.get_user_company_id(auth.uid())
    ) AND
    public.has_role(auth.uid(), 'admin')
  );