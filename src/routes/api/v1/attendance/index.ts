import { createFileRoute } from "@tanstack/react-router";
import { authenticate, json, preflight, parsePagination } from "@/lib/api.server";

// GET /api/v1/attendance
//   ?partner_id=... (staff only, filter)
//   ?from=YYYY-MM-DD&to=YYYY-MM-DD
//   ?mine=1 → shortcut for current partner
// RLS scopes: partner sees own rows; staff sees all.
export const Route = createFileRoute("/api/v1/attendance/")({
  server: {
    handlers: {
      OPTIONS: async () => preflight(),
      GET: async ({ request }) => {
        const ctx = await authenticate(request);
        if (ctx instanceof Response) return ctx;

        const url = new URL(request.url);
        const { page, limit, from, to } = parsePagination(url);
        const partnerId = url.searchParams.get("partner_id");
        const dateFrom = url.searchParams.get("from");
        const dateTo = url.searchParams.get("to");
        const mine = url.searchParams.get("mine") === "1";

        let query = ctx.supabase
          .from("attendance")
          .select("*", { count: "exact" })
          .order("attendance_date", { ascending: false })
          .range(from, to);

        if (mine) {
          const { data: p } = await ctx.supabase
            .from("delivery_partners").select("id").eq("user_id", ctx.userId).maybeSingle();
          if (!p) return json({ data: [], pagination: { page, limit, total: 0 } });
          query = query.eq("partner_id", p.id);
        } else if (partnerId) {
          query = query.eq("partner_id", partnerId);
        }
        if (dateFrom) query = query.gte("attendance_date", dateFrom);
        if (dateTo) query = query.lte("attendance_date", dateTo);

        const { data, error, count } = await query;
        if (error) return json({ error: "db_error", message: error.message }, 400);
        return json({ data: data ?? [], pagination: { page, limit, total: count ?? 0 } });
      },
    },
  },
});