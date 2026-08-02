import { createFileRoute } from "@tanstack/react-router";
import { authenticate, json, preflight, requirePartner, dbError } from "@/lib/api.server";

// GET /api/v1/attendance/today — mobile app "am I checked in?" check
export const Route = createFileRoute("/api/v1/attendance/today")({
  server: {
    handlers: {
      OPTIONS: async () => preflight(),
      GET: async ({ request }) => {
        const ctx = await authenticate(request);
        if (ctx instanceof Response) return ctx;
        const partner = await requirePartner(ctx);
        if (partner instanceof Response) return partner;

        const today = new Date().toISOString().slice(0, 10);
        const { data, error } = await ctx.supabase
          .from("attendance").select("*")
          .eq("partner_id", partner.id).eq("attendance_date", today).maybeSingle();
        if (error) return dbError("attendance.today", error);
        return json({ data: data ?? null });
      },
    },
  },
});