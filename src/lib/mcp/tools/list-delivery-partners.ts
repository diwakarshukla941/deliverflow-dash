import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_delivery_partners",
  title: "List delivery partners",
  description:
    "List delivery partners (delivery boys) visible to the signed-in user, with optional name/phone/code search and status filter.",
  inputSchema: {
    search: z.string().optional().describe("Optional text to match against name, phone or partner code."),
    status: z
      .enum(["pending", "active", "inactive", "suspended", "blacklisted", "archived"])
      .optional()
      .describe("Optional partner status filter."),
    limit: z.number().int().optional().describe("Max rows to return (default 20, max 100)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ search, status, limit }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    let query = supabase
      .from("delivery_partners")
      .select("id, partner_code, full_name, phone, email, status, city, vehicle_type, created_at")
      .order("created_at", { ascending: false })
      .limit(Math.min(100, Math.max(1, limit ?? 20)));

    if (status) query = query.eq("status", status);
    if (search) {
      const term = search.replace(/[%,().*\\:"']/g, "").trim().slice(0, 100);
      if (term) {
        query = query.or(`full_name.ilike.%${term}%,phone.ilike.%${term}%,partner_code.ilike.%${term}%`);
      }
    }

    const { data, error } = await query;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? []) }],
      structuredContent: { partners: data ?? [] },
    };
  },
});