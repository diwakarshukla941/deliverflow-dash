import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listDeliveryPartners from "./tools/list-delivery-partners";
import getDeliveryPartner from "./tools/get-delivery-partner";
import listAttendance from "./tools/list-attendance";
import fleetSummary from "./tools/fleet-summary";

// Must be the direct Supabase host; the publish-time proxy URL fails RFC 8414 issuer matching.
const projectRef = import.meta.env['VITE_SUPABASE_PROJECT_ID'] ?? "project-ref-unset";

export default defineMcp({
  name: "tej-delivery",
  title: "Tej Delivery",
  version: "0.1.0",
  instructions:
    "Tools for Tej Delivery, a food-delivery staffing operations dashboard. Use `fleet_summary` for a quick snapshot, `list_delivery_partners` / `get_delivery_partner` for partner records, and `list_attendance` for check-in/check-out history. All tools act as the signed-in user and respect their permissions.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [fleetSummary, listDeliveryPartners, getDeliveryPartner, listAttendance],
});