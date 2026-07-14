import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, ClipboardCheck, Truck, Wallet } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: DashboardPage,
});

function DashboardPage() {
  const { data: stats } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: async () => {
      const today = new Date().toISOString().slice(0, 10);
      const [partners, active, todayAttendance] = await Promise.all([
        supabase.from("delivery_partners").select("id", { count: "exact", head: true }),
        supabase.from("delivery_partners").select("id", { count: "exact", head: true }).eq("status", "active"),
        supabase.from("attendance").select("id", { count: "exact", head: true }).eq("attendance_date", today),
      ]);
      return {
        total: partners.count ?? 0,
        active: active.count ?? 0,
        today: todayAttendance.count ?? 0,
      };
    },
  });

  const cards = [
    { label: "Total Partners", value: stats?.total ?? "—", icon: Users, color: "text-blue-600" },
    { label: "Active Partners", value: stats?.active ?? "—", icon: Truck, color: "text-emerald-600" },
    { label: "Checked in today", value: stats?.today ?? "—", icon: ClipboardCheck, color: "text-orange-600" },
    { label: "Payouts (mo)", value: "—", icon: Wallet, color: "text-purple-600" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Overview</h2>
        <p className="text-sm text-muted-foreground">Live snapshot of your operations.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map(({ label, value, icon: Icon, color }) => (
          <Card key={label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
              <Icon className={`h-4 w-4 ${color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{value}</div>
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardHeader><CardTitle>Getting started</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>1. Add delivery partners in the Partners section.</p>
          <p>2. Partners install the mobile app and check in via the REST API.</p>
          <p>3. Track attendance, deliveries and earnings from this dashboard.</p>
        </CardContent>
      </Card>
    </div>
  );
}
