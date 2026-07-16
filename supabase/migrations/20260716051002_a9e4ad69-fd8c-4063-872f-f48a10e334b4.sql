
-- =========================================================
-- PHASE 1: Auth hardening + DB-driven RBAC + audit spine
-- =========================================================

-- 1) Kill the email-based role auto-assignment (privilege escalation risk)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- 2) Extend app_role enum with the roles the spec requires.
--    (New values cannot be used in the SAME migration; that's fine — we don't reference them here.)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid = 'public.app_role'::regtype AND enumlabel = 'branch_manager') THEN
    ALTER TYPE public.app_role ADD VALUE 'branch_manager';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid = 'public.app_role'::regtype AND enumlabel = 'warehouse_manager') THEN
    ALTER TYPE public.app_role ADD VALUE 'warehouse_manager';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid = 'public.app_role'::regtype AND enumlabel = 'inventory_manager') THEN
    ALTER TYPE public.app_role ADD VALUE 'inventory_manager';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid = 'public.app_role'::regtype AND enumlabel = 'customer_support') THEN
    ALTER TYPE public.app_role ADD VALUE 'customer_support';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid = 'public.app_role'::regtype AND enumlabel = 'delivery_manager') THEN
    ALTER TYPE public.app_role ADD VALUE 'delivery_manager';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid = 'public.app_role'::regtype AND enumlabel = 'auditor') THEN
    ALTER TYPE public.app_role ADD VALUE 'auditor';
  END IF;
END $$;

-- 3) Permissions catalog
CREATE TABLE IF NOT EXISTS public.permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,               -- e.g. "orders.create"
  module TEXT NOT NULL,                   -- e.g. "orders"
  action TEXT NOT NULL,                   -- e.g. "create"
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.permissions TO authenticated;
GRANT ALL ON public.permissions TO service_role;
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "authenticated read permissions" ON public.permissions FOR SELECT TO authenticated USING (true);

-- 4) Role → permission mapping (keyed by enum for now; custom roles table comes in Phase 2)
CREATE TABLE IF NOT EXISTS public.role_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role public.app_role NOT NULL,
  permission_key TEXT NOT NULL REFERENCES public.permissions(key) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (role, permission_key)
);

CREATE INDEX IF NOT EXISTS role_permissions_role_idx ON public.role_permissions(role);
GRANT SELECT ON public.role_permissions TO authenticated;
GRANT ALL ON public.role_permissions TO service_role;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "authenticated read role_permissions" ON public.role_permissions FOR SELECT TO authenticated USING (true);
CREATE POLICY "super admin manages role_permissions" ON public.role_permissions FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'::public.app_role));

-- 5) has_permission(): true if any of the user's roles grants the permission
CREATE OR REPLACE FUNCTION public.has_permission(_user_id UUID, _permission_key TEXT)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN public.role_permissions rp ON rp.role = ur.role
    WHERE ur.user_id = _user_id
      AND rp.permission_key = _permission_key
  ) OR EXISTS (
    -- super_admin implicitly gets everything
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = 'super_admin'::public.app_role
  );
$$;

GRANT EXECUTE ON FUNCTION public.has_permission(UUID, TEXT) TO authenticated;

-- 6) Staff profiles (metadata for auth.users; roles stay in user_roles)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  employee_id TEXT UNIQUE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  department TEXT,
  designation TEXT,
  branch TEXT,
  reporting_manager_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  joining_date DATE,
  photo_url TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','suspended','disabled')),
  notes TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  deleted_at TIMESTAMPTZ,
  deleted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS profiles_email_idx ON public.profiles(email);
CREATE INDEX IF NOT EXISTS profiles_branch_idx ON public.profiles(branch);
CREATE INDEX IF NOT EXISTS profiles_status_idx ON public.profiles(status);

GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "self read profile" ON public.profiles FOR SELECT TO authenticated USING (id = auth.uid());
CREATE POLICY "self update profile" ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid()) WITH CHECK (id = auth.uid());
CREATE POLICY "staff read profiles" ON public.profiles FOR SELECT TO authenticated
  USING (public.has_permission(auth.uid(), 'users.view'));
CREATE POLICY "admin manages profiles" ON public.profiles FOR ALL TO authenticated
  USING (public.has_permission(auth.uid(), 'users.manage'))
  WITH CHECK (public.has_permission(auth.uid(), 'users.manage'));

CREATE TRIGGER trg_profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- 7) Audit logs
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_email TEXT,
  action TEXT NOT NULL,            -- e.g. 'user.create', 'partner.update'
  entity_type TEXT,                -- e.g. 'delivery_partners'
  entity_id TEXT,
  old_values JSONB,
  new_values JSONB,
  metadata JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS audit_logs_actor_idx ON public.audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS audit_logs_entity_idx ON public.audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS audit_logs_created_idx ON public.audit_logs(created_at DESC);

GRANT SELECT, INSERT ON public.audit_logs TO authenticated;
GRANT ALL ON public.audit_logs TO service_role;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "authenticated inserts audit" ON public.audit_logs FOR INSERT TO authenticated
  WITH CHECK (actor_id = auth.uid() OR actor_id IS NULL);
CREATE POLICY "audit viewers read logs" ON public.audit_logs FOR SELECT TO authenticated
  USING (public.has_permission(auth.uid(), 'audit.view'));

-- 8) Add audit fields + soft delete to core tables (safe, additive)
ALTER TABLE public.delivery_partners
  ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.attendance
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS delivery_partners_status_idx ON public.delivery_partners(status);
CREATE INDEX IF NOT EXISTS delivery_partners_city_idx ON public.delivery_partners(city);
CREATE INDEX IF NOT EXISTS delivery_partners_deleted_idx ON public.delivery_partners(deleted_at);
CREATE INDEX IF NOT EXISTS attendance_date_idx ON public.attendance(attendance_date);
CREATE INDEX IF NOT EXISTS attendance_partner_date_idx ON public.attendance(partner_id, attendance_date);

-- 9) Seed the permissions catalog
INSERT INTO public.permissions (key, module, action, description) VALUES
  ('dashboard.view',   'dashboard', 'view',   'View the main dashboard'),
  ('users.view',       'users',     'view',   'View staff users'),
  ('users.manage',     'users',     'manage', 'Create, update, disable staff users'),
  ('roles.manage',     'roles',     'manage', 'Manage roles and permissions'),
  ('partners.view',    'partners',  'view',   'View delivery partners'),
  ('partners.create',  'partners',  'create', 'Onboard delivery partners'),
  ('partners.update',  'partners',  'update', 'Update delivery partner records'),
  ('partners.delete',  'partners',  'delete', 'Deactivate/delete delivery partners'),
  ('attendance.view',  'attendance','view',   'View attendance'),
  ('attendance.manage','attendance','manage', 'Approve or correct attendance'),
  ('deliveries.view',  'deliveries','view',   'View deliveries'),
  ('deliveries.create','deliveries','create', 'Create deliveries'),
  ('deliveries.assign','deliveries','assign', 'Assign delivery partners'),
  ('deliveries.update','deliveries','update', 'Update delivery status'),
  ('deliveries.cancel','deliveries','cancel', 'Cancel a delivery'),
  ('earnings.view',    'earnings',  'view',   'View earnings & payouts'),
  ('earnings.approve', 'earnings',  'approve','Approve payouts'),
  ('reports.view',     'reports',   'view',   'View reports'),
  ('reports.export',   'reports',   'export', 'Export reports'),
  ('audit.view',       'audit',     'view',   'View audit logs'),
  ('settings.view',    'settings',  'view',   'View settings'),
  ('settings.manage',  'settings',  'manage', 'Manage settings')
ON CONFLICT (key) DO NOTHING;

-- 10) Baseline role → permission grants for existing enum values.
--     super_admin has an implicit wildcard via has_permission(), no rows needed.
INSERT INTO public.role_permissions (role, permission_key)
SELECT r::public.app_role, p FROM (VALUES
  -- admin: everything except managing super-admin-only settings
  ('admin','dashboard.view'),('admin','users.view'),('admin','users.manage'),('admin','roles.manage'),
  ('admin','partners.view'),('admin','partners.create'),('admin','partners.update'),('admin','partners.delete'),
  ('admin','attendance.view'),('admin','attendance.manage'),
  ('admin','deliveries.view'),('admin','deliveries.create'),('admin','deliveries.assign'),('admin','deliveries.update'),('admin','deliveries.cancel'),
  ('admin','earnings.view'),('admin','earnings.approve'),
  ('admin','reports.view'),('admin','reports.export'),
  ('admin','audit.view'),('admin','settings.view'),('admin','settings.manage'),
  -- hr
  ('hr','dashboard.view'),('hr','users.view'),
  ('hr','partners.view'),('hr','partners.create'),('hr','partners.update'),
  ('hr','attendance.view'),('hr','attendance.manage'),
  ('hr','reports.view'),
  -- operations
  ('operations','dashboard.view'),
  ('operations','partners.view'),('operations','partners.update'),
  ('operations','attendance.view'),('operations','attendance.manage'),
  ('operations','deliveries.view'),('operations','deliveries.create'),('operations','deliveries.assign'),('operations','deliveries.update'),('operations','deliveries.cancel'),
  ('operations','reports.view'),('operations','reports.export'),
  -- finance
  ('finance','dashboard.view'),
  ('finance','earnings.view'),('finance','earnings.approve'),
  ('finance','reports.view'),('finance','reports.export'),
  -- manager (branch-level, restricted)
  ('manager','dashboard.view'),
  ('manager','partners.view'),('manager','partners.create'),('manager','partners.update'),
  ('manager','attendance.view'),
  ('manager','deliveries.view'),('manager','deliveries.assign'),
  ('manager','reports.view'),
  -- dispatcher
  ('dispatcher','dashboard.view'),
  ('dispatcher','deliveries.view'),('dispatcher','deliveries.create'),('dispatcher','deliveries.assign'),('dispatcher','deliveries.update'),
  ('dispatcher','partners.view'),
  -- team_leader
  ('team_leader','dashboard.view'),
  ('team_leader','partners.view'),
  ('team_leader','attendance.view'),
  ('team_leader','deliveries.view')
) AS t(r,p)
ON CONFLICT (role, permission_key) DO NOTHING;
