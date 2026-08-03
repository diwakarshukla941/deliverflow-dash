import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_attendance",
  title: "List attendance records",
  description:
    "List attendance check-in/check-out records visible to the signed-in user, optionally filtered by date range or partner.",
  inputSchema: {
    from_date: z.string().optional().describe("Inclusive start date, YYYY-MM-DD."),
    to_date: z.string().optional().describe("Inclusive end date, YYYY-MM-DD."),
    partner_id: z.string().optional().describe("Filter to one delivery partner UUID."),
    limit: z.number().int().optional().describe("Max rows to return (default 50, max 200)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ from_date, to_date, partner_id, limit }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    let query = supabase
      .from("attendance")
      .select("*")
      .order("attendance_date", { ascending: false })
      .limit(Math.min(200, Math.max(1, limit ?? 50)));

    if (from_date) query = query.gte("attendance_date", from_date);
    if (to_date) query = query.lte("attendance_date", to_date);
    if (partner_id) query = query.eq("partner_id", partner_id);

    const { data, error } = await query;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? []) }],
      structuredContent: { records: data ?? [] },
    };
  },
});