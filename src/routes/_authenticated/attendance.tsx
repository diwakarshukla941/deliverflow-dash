import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const Route = createFileRoute("/_authenticated/attendance")({
  component: AttendancePage,
});

function AttendancePage() {
  const { data, isLoading } = useQuery({
    queryKey: ["attendance"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("attendance")
        .select("id, attendance_date, check_in_at, check_out_at, status, partner_id, delivery_partners(full_name, partner_code)")
        .order("attendance_date", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data;
    },
  });

  return (
    <Card>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Partner</TableHead>
              <TableHead>Check-in</TableHead>
              <TableHead>Check-out</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Loading…</TableCell></TableRow>}
            {!isLoading && (data?.length ?? 0) === 0 && (
              <TableRow><TableCell colSpan={5} className="text-center py-12 text-muted-foreground">No attendance records yet.</TableCell></TableRow>
            )}
            {data?.map((r) => {
              const partner = r.delivery_partners as { full_name: string; partner_code: string } | null;
              return (
                <TableRow key={r.id}>
                  <TableCell>{r.attendance_date}</TableCell>
                  <TableCell>{partner?.full_name ?? r.partner_id}</TableCell>
                  <TableCell>{r.check_in_at ? new Date(r.check_in_at).toLocaleTimeString() : "—"}</TableCell>
                  <TableCell>{r.check_out_at ? new Date(r.check_out_at).toLocaleTimeString() : "—"}</TableCell>
                  <TableCell><Badge variant="secondary">{r.status}</Badge></TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
