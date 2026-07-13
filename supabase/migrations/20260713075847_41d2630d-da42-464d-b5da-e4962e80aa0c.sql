
-- ============ ENUMS ============
CREATE TYPE public.app_role AS ENUM ('super_admin','admin','hr','operations','finance','manager','dispatcher','team_leader');
CREATE TYPE public.partner_status AS ENUM ('active','suspended','deactivated','blacklisted','resigned','pending');
CREATE TYPE public.attendance_status AS ENUM ('checked_in','checked_out','absent','on_leave');
CREATE TYPE public.payment_mode AS ENUM ('cash','upi','card','wallet','online','other');
CREATE TYPE public.delivery_status AS ENUM ('pending','assigned','picked_up','in_transit','delivered','cancelled','failed');

-- ============ TIMESTAMPS TRIGGER ============
CREATE OR REPLACE FUNCTION public.tg_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- ============ USER ROLES (staff / dashboard only) ============
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE OR REPLACE FUNCTION public.is_staff(_user_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id);
$$;

CREATE POLICY "user_roles readable by staff" ON public.user_roles
  FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));

-- ============ DELIVERY PARTNERS ============
CREATE TABLE public.delivery_partners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL,
  partner_code TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  date_of_birth DATE,
  gender TEXT,
  profile_photo_url TEXT,
  address_line1 TEXT,
  address_line2 TEXT,
  city TEXT,
  state TEXT,
  postal_code TEXT,
  country TEXT DEFAULT 'IN',
  emergency_contact_name TEXT,
  emergency_contact_phone TEXT,
  emergency_contact_relation TEXT,
  government_id_type TEXT,
  government_id_number TEXT,
  driving_license_number TEXT,
  driving_license_expiry DATE,
  vehicle_type TEXT,
  vehicle_number TEXT,
  vehicle_model TEXT,
  bank_account_holder TEXT,
  bank_account_number TEXT,
  bank_ifsc TEXT,
  bank_name TEXT,
  upi_id TEXT,
  joining_date DATE,
  employment_type TEXT,
  status public.partner_status NOT NULL DEFAULT 'pending',
  notes TEXT,
  qr_code TEXT UNIQUE,
  -- device/push (future-ready)
  push_token TEXT,
  device_id TEXT,
  app_version TEXT,
  os_version TEXT,
  last_login_at TIMESTAMPTZ,
  last_seen_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_partners_status ON public.delivery_partners(status);
CREATE INDEX idx_partners_user_id ON public.delivery_partners(user_id);
CREATE INDEX idx_partners_phone ON public.delivery_partners(phone);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.delivery_partners TO authenticated;
GRANT ALL ON public.delivery_partners TO service_role;
ALTER TABLE public.delivery_partners ENABLE ROW LEVEL SECURITY;

CREATE POLICY "staff read partners" ON public.delivery_partners
  FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "partner reads self" ON public.delivery_partners
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "partner updates own device/push" ON public.delivery_partners
  FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "staff manage partners" ON public.delivery_partners
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'hr') OR public.has_role(auth.uid(),'operations'))
  WITH CHECK (public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'hr') OR public.has_role(auth.uid(),'operations'));

CREATE TRIGGER trg_partners_updated BEFORE UPDATE ON public.delivery_partners
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- ============ ATTENDANCE ============
CREATE TABLE public.attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID NOT NULL REFERENCES public.delivery_partners(id) ON DELETE CASCADE,
  attendance_date DATE NOT NULL DEFAULT (now() AT TIME ZONE 'utc')::date,
  check_in_at TIMESTAMPTZ,
  check_out_at TIMESTAMPTZ,
  check_in_image_url TEXT,
  check_out_image_url TEXT,
  check_in_lat NUMERIC(10,7),
  check_in_lng NUMERIC(10,7),
  check_out_lat NUMERIC(10,7),
  check_out_lng NUMERIC(10,7),
  device_id TEXT,
  device_info JSONB,
  remarks TEXT,
  status public.attendance_status NOT NULL DEFAULT 'checked_in',
  -- future-ready
  face_recognition_id TEXT,
  face_verification_status TEXT,
  ai_confidence NUMERIC(5,4),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(partner_id, attendance_date)
);
CREATE INDEX idx_attendance_partner_date ON public.attendance(partner_id, attendance_date DESC);
CREATE INDEX idx_attendance_date ON public.attendance(attendance_date DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.attendance TO authenticated;
GRANT ALL ON public.attendance TO service_role;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "partner reads own attendance" ON public.attendance
  FOR SELECT TO authenticated
  USING (partner_id IN (SELECT id FROM public.delivery_partners WHERE user_id = auth.uid()));
CREATE POLICY "partner inserts own attendance" ON public.attendance
  FOR INSERT TO authenticated
  WITH CHECK (partner_id IN (SELECT id FROM public.delivery_partners WHERE user_id = auth.uid()));
CREATE POLICY "partner updates own attendance today" ON public.attendance
  FOR UPDATE TO authenticated
  USING (partner_id IN (SELECT id FROM public.delivery_partners WHERE user_id = auth.uid()))
  WITH CHECK (partner_id IN (SELECT id FROM public.delivery_partners WHERE user_id = auth.uid()));
CREATE POLICY "staff read attendance" ON public.attendance
  FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "staff manage attendance" ON public.attendance
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'operations') OR public.has_role(auth.uid(),'hr'))
  WITH CHECK (public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'operations') OR public.has_role(auth.uid(),'hr'));

CREATE TRIGGER trg_attendance_updated BEFORE UPDATE ON public.attendance
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
