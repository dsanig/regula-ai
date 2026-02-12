-- Grant admin role to the seeded/admin support account.
INSERT INTO public.user_roles (user_id, role)
SELECT u.id, 'admin'::public.app_role
FROM auth.users u
WHERE lower(u.email) = 'admin@admin.com'
ON CONFLICT (user_id, role) DO NOTHING;
