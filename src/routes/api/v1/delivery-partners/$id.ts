import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { authenticate, json, preflight } from "@/lib/api.server";

const UpdatePartnerSchema = z.object({
  full_name: z.string().min(1).max(200).optional(),
  phone: z.string().min(6).max(32).optional(),
  email: z.string().email().max(255).nullable().optional(),
  address_line1: z.string().max(255).nullable().optional(),
  city: z.string().max(100).nullable().optional(),
  state: z.string().max(100).nullable().optional(),
  postal_code: z.string().max(20).nullable().optional(),
  vehicle_type: z.string().max(50).nullable().optional(),
  vehicle_number: z.string().max(50).nullable().optional(),
  driving_license_number: z.string().max(64).nullable().optional(),
  driving_license_expiry: z.string().nullable().optional(),
  bank_account_number: z.string().max(64).nullable().optional(),
  bank_ifsc: z.string().max(32).nullable().optional(),
  upi_id: z.string().max(128).nullable().optional(),
  status: z.enum(["active", "suspended", "deactivated", "blacklisted", "resigned", "pending"]).optional(),
  notes: z.string().max(2000).nullable().optional(),
  // Mobile-app self-updateable fields:
  push_token: z.string().max(500).nullable().optional(),
  device_id: z.string().max(255).nullable().optional(),
  app_version: z.string().max(50).nullable().optional(),
  os_version: z.string().max(50).nullable().optional(),
});

export const Route = createFileRoute("/api/v1/delivery-partners/$id")({
  server: {
    handlers: {
      OPTIONS: async () => preflight(),

      GET: async ({ request, params }) => {
        const ctx = await authenticate(request);
        if (ctx instanceof Response) return ctx;

        const { data, error } = await ctx.supabase
          .from("delivery_partners").select("*").eq("id", params.id).maybeSingle();
        if (error) return json({ error: "db_error", message: error.message }, 400);
        if (!data) return json({ error: "not_found" }, 404);
        return json({ data });
      },

      PATCH: async ({ request, params }) => {
        const ctx = await authenticate(request);
        if (ctx instanceof Response) return ctx;

        let body: unknown;
        try { body = await request.json(); } catch { return json({ error: "invalid_json" }, 400); }
        const parsed = UpdatePartnerSchema.safeParse(body);
        if (!parsed.success) return json({ error: "validation_error", issues: parsed.error.issues }, 422);

        const { data, error } = await ctx.supabase
          .from("delivery_partners").update(parsed.data).eq("id", params.id).select("*").maybeSingle();
        if (error) return json({ error: "db_error", message: error.message }, 400);
        if (!data) return json({ error: "not_found_or_forbidden" }, 404);
        return json({ data });
      },

      DELETE: async ({ request, params }) => {
        const ctx = await authenticate(request);
        if (ctx instanceof Response) return ctx;
        const { error } = await ctx.supabase.from("delivery_partners").delete().eq("id", params.id);
        if (error) return json({ error: "db_error", message: error.message }, 400);
        return json({ success: true });
      },
    },
  },
});