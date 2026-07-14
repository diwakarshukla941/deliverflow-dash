import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/coming-soon";

export const Route = createFileRoute("/_authenticated/audit-logs")({
  component: () => <ComingSoon title="Audit Logs" description="Every sensitive action recorded for compliance and security." />,
});
