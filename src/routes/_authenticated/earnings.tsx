import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/coming-soon";

export const Route = createFileRoute("/_authenticated/earnings")({
  component: () => <ComingSoon title="Earnings" description="Partner payouts, incentives and settlement statements." />,
});
