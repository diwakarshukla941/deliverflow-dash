
-- Grant execute back on helper functions (needed inside RLS policies)
GRANT EXECUTE ON FUNCTION public.is_staff(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(UUID, public.app_role) TO authenticated;

-- Simpler & safer: user can read own role rows (staff can still read all via is_staff)
DROP POLICY IF EXISTS "user_roles readable by staff" ON public.user_roles;
CREATE POLICY "user_roles readable by self or staff" ON public.user_roles
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_staff(auth.uid()));

-- Extend new-user trigger to also seed HR
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.email = 'admin@tej.com' THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'super_admin'::public.app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
  ELSIF NEW.email = 'manager@tej.com' THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'manager'::public.app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
  ELSIF NEW.email = 'hr@tej.com' THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'hr'::public.app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  RETURN NEW;
END; $$;

-- Seed HR user
DO $$
DECLARE hr_id UUID;
BEGIN
  SELECT id INTO hr_id FROM auth.users WHERE email = 'hr@tej.com';
  IF hr_id IS NULL THEN
    hr_id := gen_random_uuid();
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at, confirmation_token, email_change,
      email_change_token_new, recovery_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      hr_id, 'authenticated', 'authenticated', 'hr@tej.com',
      crypt('TejHR@2026', gen_salt('bf')), now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"HR Officer"}'::jsonb,
      now(), now(), '', '', '', ''
    );
    INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    VALUES (gen_random_uuid(), hr_id, hr_id::text,
      jsonb_build_object('sub', hr_id::text, 'email', 'hr@tej.com', 'email_verified', true),
      'email', now(), now(), now());
  END IF;
END $$;

INSERT INTO public.user_roles (user_id, role)
SELECT id, 'hr'::public.app_role FROM auth.users WHERE email = 'hr@tej.com'
ON CONFLICT (user_id, role) DO NOTHING;
