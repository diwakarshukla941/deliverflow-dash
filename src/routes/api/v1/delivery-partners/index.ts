import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { authenticate, json, preflight, parsePagination } from "@/lib/api.server";

const CreatePartnerSchema = z.object({
  partner_code: z.string().min(1).max(64),
  full_name: z.string().min(1).max(200),
  phone: z.string().min(6).max(32),
  email: z.string().email().max(255).optional().nullable(),
  vehicle_type: z.string().max(50).optional().nullable(),
  vehicle_number: z.string().max(50).optional().nullable(),
  driving_license_number: z.string().max(64).optional().nullable(),
  joining_date: z.string().optional().nullable(),
  status: z.enum(["active", "suspended", "deactivated", "blacklisted", "resigned", "pending"]).optional(),
});

// GET  /api/v1/delivery-partners?page=1&limit=20&status=active&q=...
// POST /api/v1/delivery-partners
// Staff-only via RLS. Delivery-partner tokens will get an empty list / 403 on write.
export const Route = createFileRoute("/api/v1/delivery-partners/")({
  server: {
    handlers: {
      OPTIONS: async () => preflight(),

      GET: async ({ request }) => {
        const ctx = await authenticate(request);
        if (ctx instanceof Response) return ctx;

        const url = new URL(request.url);
        const { page, limit, from, to } = parsePagination(url);
        const status = url.searchParams.get("status");
        const q = url.searchParams.get("q");

        let query = ctx.supabase
          .from("delivery_partners")
          .select("*", { count: "exact" })
          .order("created_at", { ascending: false })
          .range(from, to);

        if (status) query = query.eq("status", status as never);
        if (q) query = query.or(`full_name.ilike.%${q}%,phone.ilike.%${q}%,partner_code.ilike.%${q}%`);

        const { data, error, count } = await query;
        if (error) return json({ error: "db_error", message: error.message }, 400);
        return json({ data: data ?? [], pagination: { page, limit, total: count ?? 0 } });
      },

      POST: async ({ request }) => {
        const ctx = await authenticate(request);
        if (ctx instanceof Response) return ctx;

        let body: unknown;
        try { body = await request.json(); } catch { return json({ error: "invalid_json" }, 400); }

        const parsed = CreatePartnerSchema.safeParse(body);
        if (!parsed.success) return json({ error: "validation_error", issues: parsed.error.issues }, 422);

        const { data, error } = await ctx.supabase
          .from("delivery_partners")
          .insert({ ...parsed.data, created_by: ctx.userId })
          .select("*")
          .single();

        if (error) return json({ error: "db_error", message: error.message }, 400);
        return json({ data }, 201);
      },
    },
  },
});