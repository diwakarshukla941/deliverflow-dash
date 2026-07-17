import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySupabase = any;

async function assertPermission(supabase: AnySupabase, userId: string, key: string) {
  const { data, error } = await supabase.rpc("has_permission", {
    _user_id: userId,
    _permission_key: key,
  });
  if (error) throw new Error(error.message);
  if (!data) throw new Error(`Forbidden: ${key} required`);
}

export const listStaffUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    await assertPermission(supabase, userId, "users.view");

    const { data: profiles, error } = await supabase
      .from("profiles")
      .select("*")
      .is("deleted_at", null)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);

    const ids = (profiles ?? []).map((p: { id: string }) => p.id);
    let roleMap: Record<string, AppRole[]> = {};
    if (ids.length > 0) {
      const { data: roles } = await supabase
        .from("user_roles")
        .select("user_id, role")
        .in("user_id", ids);
      for (const r of roles ?? []) {
        (roleMap[r.user_id] ||= []).push(r.role as AppRole);
      }
    }
    return (profiles ?? []).map((p: any) => ({ ...p, roles: roleMap[p.id] ?? [] }));
  });

export const createStaffUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (data: {
      email: string;
      password: string;
      full_name: string;
      phone?: string;
      employee_id?: string;
      department?: string;
      designation?: string;
      branch?: string;
      joining_date?: string;
      roles: AppRole[];
      notes?: string;
    }) => data,
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertPermission(supabase, userId, "users.manage");

    if (!data.email || !data.password || !data.full_name) {
      throw new Error("email, password, full_name are required");
    }
    if (data.password.length < 8) throw new Error("Password must be at least 8 characters");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: { full_name: data.full_name },
    });
    if (createErr || !created?.user) throw new Error(createErr?.message ?? "Failed to create user");
    const newUserId = created.user.id;

    try {
      const { error: profErr } = await supabaseAdmin.from("profiles").insert({
        id: newUserId,
        email: data.email,
        full_name: data.full_name,
        phone: data.phone ?? null,
        employee_id: data.employee_id ?? null,
        department: data.department ?? null,
        designation: data.designation ?? null,
        branch: data.branch ?? null,
        joining_date: data.joining_date ?? null,
        notes: data.notes ?? null,
        status: "active",
        created_by: userId,
      });
      if (profErr) throw profErr;

      if (data.roles.length > 0) {
        const { error: roleErr } = await supabaseAdmin
          .from("user_roles")
          .insert(data.roles.map((role) => ({ user_id: newUserId, role })));
        if (roleErr) throw roleErr;
      }

      await supabaseAdmin.from("audit_logs").insert({
        actor_id: userId,
        action: "user.create",
        entity_type: "profiles",
        entity_id: newUserId,
        new_values: { email: data.email, full_name: data.full_name, roles: data.roles },
      });
    } catch (e) {
      await supabaseAdmin.auth.admin.deleteUser(newUserId).catch(() => {});
      throw e instanceof Error ? e : new Error(String(e));
    }

    return { id: newUserId };
  });

export const updateStaffUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (data: {
      id: string;
      full_name?: string | null;
      phone?: string | null;
      employee_id?: string | null;
      department?: string | null;
      designation?: string | null;
      branch?: string | null;
      joining_date?: string | null;
      notes?: string | null;
      status?: "active" | "suspended" | "disabled";
      roles?: AppRole[];
    }) => data,
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertPermission(supabase, userId, "users.manage");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const patch: Database["public"]["Tables"]["profiles"]["Update"] = { updated_by: userId };
    if (data.full_name !== undefined && data.full_name !== null) patch.full_name = data.full_name;
    if (data.phone !== undefined) patch.phone = data.phone ?? null;
    if (data.employee_id !== undefined) patch.employee_id = data.employee_id ?? null;
    if (data.department !== undefined) patch.department = data.department ?? null;
    if (data.designation !== undefined) patch.designation = data.designation ?? null;
    if (data.branch !== undefined) patch.branch = data.branch ?? null;
    if (data.joining_date !== undefined) patch.joining_date = data.joining_date ?? null;
    if (data.notes !== undefined) patch.notes = data.notes ?? null;
    if (data.status !== undefined) patch.status = data.status;

    const { error: upErr } = await supabaseAdmin
      .from("profiles")
      .update(patch)
      .eq("id", data.id);
    if (upErr) throw new Error(upErr.message);

    if (data.roles) {
      await supabaseAdmin.from("user_roles").delete().eq("user_id", data.id);
      if (data.roles.length > 0) {
        const { error: rErr } = await supabaseAdmin
          .from("user_roles")
          .insert(data.roles.map((role) => ({ user_id: data.id, role })));
        if (rErr) throw new Error(rErr.message);
      }
    }

    if (data.status === "disabled") {
      await supabaseAdmin.auth.admin.updateUserById(data.id, { ban_duration: "876000h" }).catch(() => {});
    } else if (data.status === "active") {
      await supabaseAdmin.auth.admin.updateUserById(data.id, { ban_duration: "none" }).catch(() => {});
    }

    await supabaseAdmin.from("audit_logs").insert({
      actor_id: userId,
      action: "user.update",
      entity_type: "profiles",
      entity_id: data.id,
      new_values: patch as Database["public"]["Tables"]["audit_logs"]["Insert"]["new_values"],
    });

    return { ok: true };
  });

export const resetStaffPassword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { id: string; password: string }) => data)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertPermission(supabase, userId, "users.manage");
    if (data.password.length < 8) throw new Error("Password must be at least 8 characters");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.updateUserById(data.id, { password: data.password });
    if (error) throw new Error(error.message);

    await supabaseAdmin.from("audit_logs").insert({
      actor_id: userId,
      action: "user.password_reset",
      entity_type: "profiles",
      entity_id: data.id,
    });
    return { ok: true };
  });

export const deleteStaffUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { id: string }) => data)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertPermission(supabase, userId, "users.manage");
    if (data.id === userId) throw new Error("You cannot delete your own account");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    await supabaseAdmin
      .from("profiles")
      .update({ deleted_at: new Date().toISOString(), deleted_by: userId, status: "disabled" })
      .eq("id", data.id);
    await supabaseAdmin.from("user_roles").delete().eq("user_id", data.id);
    await supabaseAdmin.auth.admin.updateUserById(data.id, { ban_duration: "876000h" }).catch(() => {});

    await supabaseAdmin.from("audit_logs").insert({
      actor_id: userId,
      action: "user.delete",
      entity_type: "profiles",
      entity_id: data.id,
    });
    return { ok: true };
  });

export const listRolePermissionsMatrix = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: canView } = await supabase.rpc("has_permission", {
      _user_id: userId,
      _permission_key: "roles.manage",
    });
    if (!canView) throw new Error("Forbidden: roles.manage required");

    const [{ data: perms }, { data: rp }] = await Promise.all([
      supabase.from("permissions").select("key, module, action, description").order("module"),
      supabase.from("role_permissions").select("role, permission_key"),
    ]);
    return { permissions: perms ?? [], rolePermissions: rp ?? [] };
  });

export const setRolePermission = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { role: AppRole; permission_key: string; enabled: boolean }) => data)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: allowed } = await supabase.rpc("has_permission", {
      _user_id: userId,
      _permission_key: "roles.manage",
    });
    if (!allowed) throw new Error("Forbidden: roles.manage required");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    if (data.enabled) {
      const { error } = await supabaseAdmin
        .from("role_permissions")
        .upsert({ role: data.role, permission_key: data.permission_key }, { onConflict: "role,permission_key" });
      if (error) throw new Error(error.message);
    } else {
      const { error } = await supabaseAdmin
        .from("role_permissions")
        .delete()
        .eq("role", data.role)
        .eq("permission_key", data.permission_key);
      if (error) throw new Error(error.message);
    }

    await supabaseAdmin.from("audit_logs").insert({
      actor_id: userId,
      action: data.enabled ? "role.permission_grant" : "role.permission_revoke",
      entity_type: "role_permissions",
      entity_id: `${data.role}:${data.permission_key}`,
    });
    return { ok: true };
  });