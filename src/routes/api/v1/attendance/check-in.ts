import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { authenticate, json, preflight, requirePartner, dbError } from "@/lib/api.server";

const CheckInSchema = z.object({
  check_in_image_url: z.string().url().optional().nullable(),
  lat: z.number().min(-90).max(90).optional().nullable(),
  lng: z.number().min(-180).max(180).optional().nullable(),
  device_id: z.string().max(255).optional().nullable(),
  device_info: z.record(z.string(), z.any()).optional().nullable(),
  remarks: z.string().max(500).optional().nullable(),
});

// POST /api/v1/attendance/check-in — mobile-only; one row per partner per day (upsert).
export const Route = createFileRoute("/api/v1/attendance/check-in")({
  server: {
    handlers: {
      OPTIONS: async () => preflight(),
      POST: async ({ request }) => {
        const ctx = await authenticate(request);
        if (ctx instanceof Response) return ctx;

        const partner = await requirePartner(ctx);
        if (partner instanceof Response) return partner;

        if (partner.status !== "active") {
          return json({ error: "account_inactive", status: partner.status }, 403);
        }

        let body: unknown = {};
        try { body = await request.json(); } catch { /* body optional */ }
        const parsed = CheckInSchema.safeParse(body ?? {});
        if (!parsed.success) return json({ error: "validation_error", issues: parsed.error.issues }, 422);

        const today = new Date().toISOString().slice(0, 10);
        const now = new Date().toISOString();

        // Reject if already checked in today (has check_in_at)
        const { data: existing } = await ctx.supabase
          .from("attendance").select("*")
          .eq("partner_id", partner.id).eq("attendance_date", today).maybeSingle();

        if (existing?.check_in_at) {
          return json({ error: "already_checked_in", data: existing }, 409);
        }

        const payload = {
          partner_id: partner.id,
          attendance_date: today,
          check_in_at: now,
          check_in_image_url: parsed.data.check_in_image_url ?? null,
          check_in_lat: parsed.data.lat ?? null,
          check_in_lng: parsed.data.lng ?? null,
          device_id: parsed.data.device_id ?? null,
          device_info: parsed.data.device_info ?? null,
          remarks: parsed.data.remarks ?? null,
          status: "checked_in" as const,
        };

        const { data, error } = existing
          ? await ctx.supabase.from("attendance").update(payload).eq("id", existing.id).select("*").single()
          : await ctx.supabase.from("attendance").insert(payload).select("*").single();

        if (error) return dbError("attendance.check-in", error);
        return json({ data }, 201);
      },
    },
  },
});