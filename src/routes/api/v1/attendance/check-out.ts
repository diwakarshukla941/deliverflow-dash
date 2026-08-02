import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { authenticate, json, preflight, requirePartner, dbError } from "@/lib/api.server";

const CheckOutSchema = z.object({
  check_out_image_url: z.string().url().optional().nullable(),
  lat: z.number().min(-90).max(90).optional().nullable(),
  lng: z.number().min(-180).max(180).optional().nullable(),
  remarks: z.string().max(500).optional().nullable(),
});

// POST /api/v1/attendance/check-out
export const Route = createFileRoute("/api/v1/attendance/check-out")({
  server: {
    handlers: {
      OPTIONS: async () => preflight(),
      POST: async ({ request }) => {
        const ctx = await authenticate(request);
        if (ctx instanceof Response) return ctx;

        const partner = await requirePartner(ctx);
        if (partner instanceof Response) return partner;

        let body: unknown = {};
        try { body = await request.json(); } catch { /* optional */ }
        const parsed = CheckOutSchema.safeParse(body ?? {});
        if (!parsed.success) return json({ error: "validation_error", issues: parsed.error.issues }, 422);

        const today = new Date().toISOString().slice(0, 10);
        const { data: existing } = await ctx.supabase
          .from("attendance").select("*")
          .eq("partner_id", partner.id).eq("attendance_date", today).maybeSingle();

        if (!existing?.check_in_at) return json({ error: "not_checked_in" }, 409);
        if (existing.check_out_at) return json({ error: "already_checked_out", data: existing }, 409);

        const { data, error } = await ctx.supabase
          .from("attendance")
          .update({
            check_out_at: new Date().toISOString(),
            check_out_image_url: parsed.data.check_out_image_url ?? null,
            check_out_lat: parsed.data.lat ?? null,
            check_out_lng: parsed.data.lng ?? null,
            remarks: parsed.data.remarks ?? existing.remarks,
            status: "checked_out",
          })
          .eq("id", existing.id)
          .select("*")
          .single();

        if (error) return dbError("attendance.check-out", error);
        return json({ data });
      },
    },
  },
});