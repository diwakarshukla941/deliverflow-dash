-- 1. Lock down SECURITY DEFINER helper functions from anonymous/public callers
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.has_permission(uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_staff(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.tg_set_updated_at() FROM PUBLIC, anon, authenticated;

-- EXECUTE for authenticated is required because RLS policies reference these helpers.
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_permission(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_staff(uuid) TO authenticated;

-- Self-guard: callers may only probe their own roles/permissions unless they are staff.
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT CASE
    WHEN auth.uid() IS NULL THEN false
    WHEN auth.uid() <> _user_id
      AND NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid())
      AND auth.role() <> 'service_role' THEN false
    ELSE EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
  END;
$$;

CREATE OR REPLACE FUNCTION public.has_permission(_user_id uuid, _permission_key text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT CASE
    WHEN auth.uid() IS NULL AND auth.role() <> 'service_role' THEN false
    WHEN auth.uid() IS NOT NULL AND auth.uid() <> _user_id
      AND NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid()) THEN false
    ELSE (
      EXISTS (
        SELECT 1 FROM public.user_roles ur
        JOIN public.role_permissions rp ON rp.role = ur.role
        WHERE ur.user_id = _user_id AND rp.permission_key = _permission_key
      ) OR EXISTS (
        SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = 'super_admin'::public.app_role
      )
    )
  END;
$$;

-- 2. Attendance: prevent partners from forging records by writing directly
CREATE OR REPLACE FUNCTION public.tg_attendance_partner_guard()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  -- staff and service role are unrestricted
  IF auth.uid() IS NULL OR public.is_staff(auth.uid()) THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    NEW.attendance_date := current_date;
    NEW.check_in_at := CASE WHEN NEW.check_in_at IS NULL THEN NULL ELSE now() END;
    NEW.check_out_at := NULL;
    NEW.check_out_image_url := NULL;
    NEW.check_out_lat := NULL;
    NEW.check_out_lng := NULL;
    NEW.status := 'checked_in'::public.attendance_status;
    NEW.face_recognition_id := NULL;
    NEW.face_verification_status := NULL;
    NEW.ai_confidence := NULL;
    NEW.created_by := auth.uid();
    NEW.updated_by := auth.uid();
    RETURN NEW;
  END IF;

  -- UPDATE: only today's row, and only the check-out fields / remarks
  IF OLD.attendance_date <> current_date THEN
    RAISE EXCEPTION 'Only today''s attendance can be modified';
  END IF;

  NEW.partner_id := OLD.partner_id;
  NEW.attendance_date := OLD.attendance_date;
  NEW.check_in_at := OLD.check_in_at;
  NEW.check_in_image_url := OLD.check_in_image_url;
  NEW.check_in_lat := OLD.check_in_lat;
  NEW.check_in_lng := OLD.check_in_lng;
  NEW.face_recognition_id := OLD.face_recognition_id;
  NEW.face_verification_status := OLD.face_verification_status;
  NEW.ai_confidence := OLD.ai_confidence;
  NEW.created_by := OLD.created_by;
  NEW.created_at := OLD.created_at;
  NEW.updated_by := auth.uid();

  IF OLD.check_out_at IS NOT NULL THEN
    NEW.check_out_at := OLD.check_out_at;
    NEW.check_out_image_url := OLD.check_out_image_url;
    NEW.check_out_lat := OLD.check_out_lat;
    NEW.check_out_lng := OLD.check_out_lng;
    NEW.status := OLD.status;
  ELSIF NEW.check_out_at IS NOT NULL THEN
    NEW.check_out_at := now();
    NEW.status := 'checked_out'::public.attendance_status;
  ELSE
    NEW.status := OLD.status;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS attendance_partner_guard ON public.attendance;
CREATE TRIGGER attendance_partner_guard
BEFORE INSERT OR UPDATE ON public.attendance
FOR EACH ROW EXECUTE FUNCTION public.tg_attendance_partner_guard();

-- restrict partner UPDATE policy to today's rows as well
DROP POLICY IF EXISTS "partner updates own attendance today" ON public.attendance;
CREATE POLICY "partner updates own attendance today" ON public.attendance
FOR UPDATE TO authenticated
USING (
  attendance_date = current_date
  AND partner_id IN (SELECT id FROM public.delivery_partners WHERE user_id = auth.uid())
)
WITH CHECK (
  attendance_date = current_date
  AND partner_id IN (SELECT id FROM public.delivery_partners WHERE user_id = auth.uid())
);

-- 3. delivery_partners: partners may only self-edit device/contact fields
CREATE OR REPLACE FUNCTION public.tg_partner_self_update_guard()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF auth.uid() IS NULL OR public.is_staff(auth.uid()) THEN
    RETURN NEW;
  END IF;

  -- non-staff self-service: keep every staff-controlled column at its old value
  NEW.partner_code := OLD.partner_code;
  NEW.user_id := OLD.user_id;
  NEW.full_name := OLD.full_name;
  NEW.status := OLD.status;
  NEW.notes := OLD.notes;
  NEW.qr_code := OLD.qr_code;
  NEW.date_of_birth := OLD.date_of_birth;
  NEW.gender := OLD.gender;
  NEW.government_id_type := OLD.government_id_type;
  NEW.government_id_number := OLD.government_id_number;
  NEW.driving_license_number := OLD.driving_license_number;
  NEW.driving_license_expiry := OLD.driving_license_expiry;
  NEW.vehicle_type := OLD.vehicle_type;
  NEW.vehicle_number := OLD.vehicle_number;
  NEW.vehicle_model := OLD.vehicle_model;
  NEW.bank_account_holder := OLD.bank_account_holder;
  NEW.bank_account_number := OLD.bank_account_number;
  NEW.bank_ifsc := OLD.bank_ifsc;
  NEW.bank_name := OLD.bank_name;
  NEW.upi_id := OLD.upi_id;
  NEW.joining_date := OLD.joining_date;
  NEW.employment_type := OLD.employment_type;
  NEW.created_by := OLD.created_by;
  NEW.created_at := OLD.created_at;
  NEW.deleted_at := OLD.deleted_at;
  NEW.deleted_by := OLD.deleted_by;
  NEW.updated_by := auth.uid();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS partner_self_update_guard ON public.delivery_partners;
CREATE TRIGGER partner_self_update_guard
BEFORE UPDATE ON public.delivery_partners
FOR EACH ROW EXECUTE FUNCTION public.tg_partner_self_update_guard();

-- 4. profiles: self-service edits limited to name/phone/photo
CREATE OR REPLACE FUNCTION public.tg_profile_self_update_guard()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF auth.uid() IS NULL OR public.has_permission(auth.uid(), 'users.manage') THEN
    RETURN NEW;
  END IF;

  NEW.id := OLD.id;
  NEW.email := OLD.email;
  NEW.employee_id := OLD.employee_id;
  NEW.department := OLD.department;
  NEW.designation := OLD.designation;
  NEW.branch := OLD.branch;
  NEW.reporting_manager_id := OLD.reporting_manager_id;
  NEW.joining_date := OLD.joining_date;
  NEW.status := OLD.status;
  NEW.notes := OLD.notes;
  NEW.created_by := OLD.created_by;
  NEW.created_at := OLD.created_at;
  NEW.deleted_at := OLD.deleted_at;
  NEW.deleted_by := OLD.deleted_by;
  NEW.updated_by := auth.uid();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profile_self_update_guard ON public.profiles;
CREATE TRIGGER profile_self_update_guard
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.tg_profile_self_update_guard();

REVOKE ALL ON FUNCTION public.tg_attendance_partner_guard() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.tg_partner_self_update_guard() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.tg_profile_self_update_guard() FROM PUBLIC, anon, authenticated;