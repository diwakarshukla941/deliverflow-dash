import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/coming-soon";

export const Route = createFileRoute("/_authenticated/deliveries")({
  component: () => <ComingSoon title="Deliveries" description="Order assignment, live tracking and proof-of-delivery are coming next." />,
});
