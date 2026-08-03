import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "get_delivery_partner",
  title: "Get delivery partner",
  description: "Fetch the full profile of one delivery partner by id or partner code.",
  inputSchema: {
    id: z.string().optional().describe("Delivery partner UUID."),
    partner_code: z.string().optional().describe("Human-readable partner code, e.g. TEJ-001."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ id, partner_code }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    if (!id && !partner_code) {
      return { content: [{ type: "text", text: "Provide either id or partner_code" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    let query = supabase.from("delivery_partners").select("*");
    query = id ? query.eq("id", id) : query.eq("partner_code", partner_code!);

    const { data, error } = await query.maybeSingle();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    if (!data) return { content: [{ type: "text", text: "Delivery partner not found" }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data) }],
      structuredContent: { partner: data },
    };
  },
});