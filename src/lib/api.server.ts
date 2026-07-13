// Server-only helpers for /api/v1/* REST endpoints consumed by mobile apps.
// Extension is .server.ts so it can never be imported from client bundles.
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

export const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With",
  "Access-Control-Max-Age": "86400",
} as const;

export function json(body: unknown, status = 200, extraHeaders: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CORS_HEADERS, ...extraHeaders },
  });
}

export function preflight(): Response {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

export type AuthedContext = {
  supabase: SupabaseClient<Database>;
  userId: string;
  token: string;
};

/**
 * Validate a Bearer token and return a Supabase client scoped to that user (RLS applies).
 * Returns a Response on failure so callers can `return` it directly.
 */
export async function authenticate(request: Request): Promise<AuthedContext | Response> {
  const authHeader = request.headers.get("authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) {
    return json({ error: "unauthorized", message: "Missing Bearer token" }, 401);
  }
  const token = authHeader.slice(7).trim();
  if (!token || token.split(".").length !== 3) {
    return json({ error: "unauthorized", message: "Invalid token" }, 401);
  }

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_PUBLISHABLE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
    return json({ error: "server_misconfigured" }, 500);
  }

  const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user) {
    return json({ error: "unauthorized", message: "Invalid or expired token" }, 401);
  }

  return { supabase, userId: data.user.id, token };
}

/**
 * Resolve the delivery_partner row for the current user (mobile app context).
 */
export async function requirePartner(ctx: AuthedContext) {
  const { data, error } = await ctx.supabase
    .from("delivery_partners")
    .select("*")
    .eq("user_id", ctx.userId)
    .maybeSingle();
  if (error) return json({ error: "db_error", message: error.message }, 500);
  if (!data) return json({ error: "not_a_partner", message: "No delivery partner linked to this account" }, 403);
  return data;
}

export function parsePagination(url: URL) {
  const page = Math.max(1, Number(url.searchParams.get("page") ?? "1") || 1);
  const limit = Math.min(100, Math.max(1, Number(url.searchParams.get("limit") ?? "20") || 20));
  return { page, limit, from: (page - 1) * limit, to: page * limit - 1 };
}