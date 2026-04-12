-- Migration: Fix admin role for admin@psipro.app user
-- This migration upgrades the admin@psipro.app user from 'agent' to 'admin'
-- if there is no other admin user with an active profile.

DO $$
DECLARE
  v_user_id uuid;
  v_admin_with_profile_count int;
BEGIN
  -- Find the user ID for admin@psipro.app
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = 'admin@psipro.app'
  LIMIT 1;

  IF v_user_id IS NULL THEN
    RAISE NOTICE 'User admin@psipro.app not found, skipping.';
    RETURN;
  END IF;

  -- Count admins who actually have a profile (active admins)
  SELECT COUNT(*)
  INTO v_admin_with_profile_count
  FROM public.user_roles ur
  JOIN public.profiles p ON p.id = ur.user_id
  WHERE ur.role = 'admin'
    AND ur.user_id != v_user_id;

  IF v_admin_with_profile_count > 0 THEN
    RAISE NOTICE 'Another active admin already exists. Skipping upgrade.';
    RETURN;
  END IF;

  -- Remove existing agent role and assign admin
  DELETE FROM public.user_roles WHERE user_id = v_user_id AND role = 'agent';

  INSERT INTO public.user_roles (user_id, role)
  VALUES (v_user_id, 'admin')
  ON CONFLICT (user_id, role) DO NOTHING;

  RAISE NOTICE 'Successfully upgraded admin@psipro.app (%) to admin role.', v_user_id;
END;
$$;
