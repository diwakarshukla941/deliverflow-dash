import { defineTool } from "@lovable.dev/mcp-js";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "fleet_summary",
  title: "Fleet summary",
  description:
    "Snapshot of the delivery fleet: total partners, active partners and how many checked in today.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_input, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    const today = new Date().toISOString().slice(0, 10);
    const [total, active, checkedIn] = await Promise.all([
      supabase.from("delivery_partners").select("id", { count: "exact", head: true }),
      supabase.from("delivery_partners").select("id", { count: "exact", head: true }).eq("status", "active"),
      supabase.from("attendance").select("id", { count: "exact", head: true }).eq("attendance_date", today),
    ]);
    const error = total.error ?? active.error ?? checkedIn.error;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };

    const summary = {
      total_partners: total.count ?? 0,
      active_partners: active.count ?? 0,
      checked_in_today: checkedIn.count ?? 0,
      date: today,
    };
    return { content: [{ type: "text", text: JSON.stringify(summary) }], structuredContent: summary };
  },
});