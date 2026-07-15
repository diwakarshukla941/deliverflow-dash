
-- Ensure pgcrypto for password hashing
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Update trigger to also seed manager role for manager@tej.com
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.email = 'admin@tej.com' THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'super_admin'::public.app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
  ELSIF NEW.email = 'manager@tej.com' THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'manager'::public.app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

-- Seed admin@tej.com if not exists
DO $$
DECLARE
  admin_id UUID;
  manager_id UUID;
BEGIN
  -- Admin
  SELECT id INTO admin_id FROM auth.users WHERE email = 'admin@tej.com';
  IF admin_id IS NULL THEN
    admin_id := gen_random_uuid();
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at, confirmation_token, email_change,
      email_change_token_new, recovery_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      admin_id, 'authenticated', 'authenticated',
      'admin@tej.com',
      crypt('TejAdmin@2026', gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"Super Admin"}'::jsonb,
      now(), now(), '', '', '', ''
    );
    INSERT INTO auth.identities (
      id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at
    ) VALUES (
      gen_random_uuid(), admin_id, admin_id::text,
      jsonb_build_object('sub', admin_id::text, 'email', 'admin@tej.com', 'email_verified', true),
      'email', now(), now(), now()
    );
  END IF;

  -- Manager
  SELECT id INTO manager_id FROM auth.users WHERE email = 'manager@tej.com';
  IF manager_id IS NULL THEN
    manager_id := gen_random_uuid();
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at, confirmation_token, email_change,
      email_change_token_new, recovery_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      manager_id, 'authenticated', 'authenticated',
      'manager@tej.com',
      crypt('TejManager@2026', gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"Operations Manager"}'::jsonb,
      now(), now(), '', '', '', ''
    );
    INSERT INTO auth.identities (
      id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at
    ) VALUES (
      gen_random_uuid(), manager_id, manager_id::text,
      jsonb_build_object('sub', manager_id::text, 'email', 'manager@tej.com', 'email_verified', true),
      'email', now(), now(), now()
    );
  END IF;
END $$;

-- Backfill roles
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'super_admin'::public.app_role FROM auth.users WHERE email = 'admin@tej.com'
ON CONFLICT (user_id, role) DO NOTHING;

INSERT INTO public.user_roles (user_id, role)
SELECT id, 'manager'::public.app_role FROM auth.users WHERE email = 'manager@tej.com'
ON CONFLICT (user_id, role) DO NOTHING;
