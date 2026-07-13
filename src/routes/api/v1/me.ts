import { createFileRoute } from "@tanstack/react-router";
import { authenticate, json, preflight } from "@/lib/api.server";

// GET /api/v1/me → returns current user + delivery_partner profile if linked + roles
export const Route = createFileRoute("/api/v1/me")({
  server: {
    handlers: {
      OPTIONS: async () => preflight(),
      GET: async ({ request }) => {
        const ctx = await authenticate(request);
        if (ctx instanceof Response) return ctx;

        const [partnerRes, rolesRes] = await Promise.all([
          ctx.supabase.from("delivery_partners").select("*").eq("user_id", ctx.userId).maybeSingle(),
          ctx.supabase.from("user_roles").select("role").eq("user_id", ctx.userId),
        ]);

        return json({
          user_id: ctx.userId,
          partner: partnerRes.data ?? null,
          roles: (rolesRes.data ?? []).map((r) => r.role),
        });
      },
    },
  },
});