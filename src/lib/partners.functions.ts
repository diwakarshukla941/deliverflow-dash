import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";

type PartnerStatus = Database["public"]["Enums"]["partner_status"];
type PartnerInsert = Database["public"]["Tables"]["delivery_partners"]["Insert"];
type PartnerUpdate = Database["public"]["Tables"]["delivery_partners"]["Update"];
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

export type PartnerFormValues = {
  partner_code: string;
  full_name: string;
  phone: string;
  email?: string | null;
  date_of_birth?: string | null;
  gender?: string | null;
  address_line1?: string | null;
  address_line2?: string | null;
  city?: string | null;
  state?: string | null;
  postal_code?: string | null;
  emergency_contact_name?: string | null;
  emergency_contact_phone?: string | null;
  emergency_contact_relation?: string | null;
  government_id_type?: string | null;
  government_id_number?: string | null;
  driving_license_number?: string | null;
  driving_license_expiry?: string | null;
  vehicle_type?: string | null;
  vehicle_number?: string | null;
  vehicle_model?: string | null;
  bank_account_holder?: string | null;
  bank_account_number?: string | null;
  bank_ifsc?: string | null;
  bank_name?: string | null;
  upi_id?: string | null;
  joining_date?: string | null;
  employment_type?: string | null;
  status?: PartnerStatus;
  notes?: string | null;
};

const NULLABLE_FIELDS = [
  "email","date_of_birth","gender","address_line1","address_line2","city","state","postal_code",
  "emergency_contact_name","emergency_contact_phone","emergency_contact_relation",
  "government_id_type","government_id_number","driving_license_number","driving_license_expiry",
  "vehicle_type","vehicle_number","vehicle_model","bank_account_holder","bank_account_number",
  "bank_ifsc","bank_name","upi_id","joining_date","employment_type","notes",
] as const;

function normalize(values: Partial<PartnerFormValues>) {
  const out: Record<string, unknown> = {};
  for (const key of NULLABLE_FIELDS) {
    if (values[key] !== undefined) {
      const v = values[key];
      out[key] = typeof v === "string" && v.trim() === "" ? null : v;
    }
  }
  return out;
}

function validate(values: Partial<PartnerFormValues>, requireCore: boolean) {
  if (requireCore) {
    if (!values.partner_code?.trim()) throw new Error("Partner code is required");
    if (!values.full_name?.trim()) throw new Error("Full name is required");
    if (!values.phone?.trim()) throw new Error("Phone is required");
  }
  if (values.phone && !/^[0-9+\-\s()]{6,20}$/.test(values.phone.trim())) {
    throw new Error("Phone number looks invalid");
  }
  if (values.email && values.email.trim() && !/^\S+@\S+\.\S+$/.test(values.email.trim())) {
    throw new Error("Email looks invalid");
  }
  if (values.bank_ifsc && values.bank_ifsc.trim() && !/^[A-Za-z]{4}0[A-Za-z0-9]{6}$/.test(values.bank_ifsc.trim())) {
    throw new Error("IFSC code looks invalid (e.g. HDFC0001234)");
  }
}

export const listPartners = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (data: { search?: string; status?: PartnerStatus | "all"; page?: number; pageSize?: number } | undefined) =>
      data ?? {},
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertPermission(supabase, userId, "partners.view");

    const page = Math.max(1, data.page ?? 1);
    const pageSize = Math.min(100, Math.max(5, data.pageSize ?? 20));
    const from = (page - 1) * pageSize;

    let query = supabase
      .from("delivery_partners")
      .select("*", { count: "exact" })
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .range(from, from + pageSize - 1);

    if (data.status && data.status !== "all") query = query.eq("status", data.status);
    const q = data.search?.trim();
    if (q) {
      const safe = q.replace(/[%,()]/g, "");
      query = query.or(
        `full_name.ilike.%${safe}%,phone.ilike.%${safe}%,partner_code.ilike.%${safe}%,city.ilike.%${safe}%,vehicle_number.ilike.%${safe}%`,
      );
    }

    const { data: rows, error, count } = await query;
    if (error) throw new Error(error.message);
    return { rows: rows ?? [], total: count ?? 0, page, pageSize };
  });

export const getPartnerStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    await assertPermission(supabase, userId, "partners.view");
    const { data, error } = await supabase
      .from("delivery_partners")
      .select("status")
      .is("deleted_at", null);
    if (error) throw new Error(error.message);
    const counts: Record<string, number> = { total: 0 };
    for (const r of (data ?? []) as { status: string }[]) {
      counts.total += 1;
      counts[r.status] = (counts[r.status] ?? 0) + 1;
    }
    return counts;
  });

export const createPartner = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: PartnerFormValues) => data)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertPermission(supabase, userId, "partners.create");
    validate(data, true);

    const { data: existing } = await supabase
      .from("delivery_partners")
      .select("id")
      .eq("partner_code", data.partner_code.trim())
      .maybeSingle();
    if (existing) throw new Error(`Partner code "${data.partner_code}" is already in use`);

    const payload: PartnerInsert = {
      ...(normalize(data) as PartnerInsert),
      partner_code: data.partner_code.trim(),
      full_name: data.full_name.trim(),
      phone: data.phone.trim(),
      status: data.status ?? "pending",
      created_by: userId,
      updated_by: userId,
    };

    const { data: row, error } = await supabase
      .from("delivery_partners")
      .insert(payload)
      .select("id, partner_code, full_name")
      .single();
    if (error) throw new Error(error.message);

    await supabase.from("audit_logs").insert({
      actor_id: userId,
      action: "partner.create",
      entity_type: "delivery_partners",
      entity_id: row.id,
      new_values: { partner_code: row.partner_code, full_name: row.full_name },
    });

    return row;
  });

export const updatePartner = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: Partial<PartnerFormValues> & { id: string }) => data)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertPermission(supabase, userId, "partners.update");
    validate(data, false);

    const patch: PartnerUpdate = { ...(normalize(data) as PartnerUpdate), updated_by: userId };
    if (data.partner_code !== undefined) patch.partner_code = data.partner_code.trim();
    if (data.full_name !== undefined) patch.full_name = data.full_name.trim();
    if (data.phone !== undefined) patch.phone = data.phone.trim();
    if (data.status !== undefined) patch.status = data.status;

    const { error } = await supabase.from("delivery_partners").update(patch).eq("id", data.id);
    if (error) throw new Error(error.message);

    await supabase.from("audit_logs").insert({
      actor_id: userId,
      action: "partner.update",
      entity_type: "delivery_partners",
      entity_id: data.id,
      new_values: patch as Database["public"]["Tables"]["audit_logs"]["Insert"]["new_values"],
    });
    return { ok: true };
  });

export const setPartnerStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { id: string; status: PartnerStatus; reason?: string }) => data)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertPermission(supabase, userId, "partners.update");

    const { error } = await supabase
      .from("delivery_partners")
      .update({ status: data.status, updated_by: userId })
      .eq("id", data.id);
    if (error) throw new Error(error.message);

    await supabase.from("audit_logs").insert({
      actor_id: userId,
      action: "partner.status_change",
      entity_type: "delivery_partners",
      entity_id: data.id,
      new_values: { status: data.status, reason: data.reason ?? null },
    });
    return { ok: true };
  });

export const deletePartner = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { id: string }) => data)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertPermission(supabase, userId, "partners.delete");

    const { error } = await supabase
      .from("delivery_partners")
      .update({ deleted_at: new Date().toISOString(), deleted_by: userId, status: "deactivated" })
      .eq("id", data.id);
    if (error) throw new Error(error.message);

    await supabase.from("audit_logs").insert({
      actor_id: userId,
      action: "partner.delete",
      entity_type: "delivery_partners",
      entity_id: data.id,
    });
    return { ok: true };
  });
