import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/partners")({
  component: PartnersPage,
});

const EMPTY = {
  partner_code: "",
  full_name: "",
  phone: "",
  email: "",
  city: "",
  vehicle_type: "Bike",
  vehicle_number: "",
};

function PartnersPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);

  const { data, isLoading } = useQuery({
    queryKey: ["partners"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("delivery_partners")
        .select("id, partner_code, full_name, phone, city, status, vehicle_type, created_at")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data;
    },
  });

  const createPartner = useMutation({
    mutationFn: async (values: typeof EMPTY) => {
      const { data: userData } = await supabase.auth.getUser();
      const { error } = await supabase.from("delivery_partners").insert({
        partner_code: values.partner_code,
        full_name: values.full_name,
        phone: values.phone,
        email: values.email || null,
        city: values.city || null,
        vehicle_type: values.vehicle_type || null,
        vehicle_number: values.vehicle_number || null,
        status: "active",
        created_by: userData.user?.id ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Delivery boy added");
      setForm(EMPTY);
      setOpen(false);
      qc.invalidateQueries({ queryKey: ["partners"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const set = (k: keyof typeof EMPTY) => (v: string) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Delivery boys</h2>
          <p className="text-sm text-muted-foreground">Onboard and manage your on-ground fleet.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="bg-orange-500 hover:bg-orange-600">
              <Plus className="mr-2 h-4 w-4" /> Add delivery boy
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>New delivery boy</DialogTitle>
              <DialogDescription>Enter basic details. You can complete KYC later.</DialogDescription>
            </DialogHeader>
            <form
              onSubmit={(e) => { e.preventDefault(); createPartner.mutate(form); }}
              className="grid gap-3 sm:grid-cols-2"
            >
              <Row label="Partner code *"><Input value={form.partner_code} onChange={(e) => set("partner_code")(e.target.value)} placeholder="TEJ-001" required /></Row>
              <Row label="Full name *"><Input value={form.full_name} onChange={(e) => set("full_name")(e.target.value)} required /></Row>
              <Row label="Phone *"><Input value={form.phone} onChange={(e) => set("phone")(e.target.value)} required /></Row>
              <Row label="Email"><Input type="email" value={form.email} onChange={(e) => set("email")(e.target.value)} /></Row>
              <Row label="City"><Input value={form.city} onChange={(e) => set("city")(e.target.value)} /></Row>
              <Row label="Vehicle type"><Input value={form.vehicle_type} onChange={(e) => set("vehicle_type")(e.target.value)} /></Row>
              <Row label="Vehicle number" span2><Input value={form.vehicle_number} onChange={(e) => set("vehicle_number")(e.target.value)} placeholder="MH12 AB 1234" /></Row>
              <DialogFooter className="sm:col-span-2">
                <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={createPartner.isPending} className="bg-orange-500 hover:bg-orange-600">
                  {createPartner.isPending ? "Saving…" : "Add delivery boy"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>City</TableHead>
                <TableHead>Vehicle</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Loading…</TableCell></TableRow>
              )}
              {!isLoading && (data?.length ?? 0) === 0 && (
                <TableRow><TableCell colSpan={6} className="text-center py-12 text-muted-foreground">No delivery boys yet. Click "Add delivery boy" to get started.</TableCell></TableRow>
              )}
              {data?.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-mono text-xs">{p.partner_code}</TableCell>
                  <TableCell className="font-medium">{p.full_name}</TableCell>
                  <TableCell>{p.phone}</TableCell>
                  <TableCell>{p.city ?? "—"}</TableCell>
                  <TableCell>{p.vehicle_type ?? "—"}</TableCell>
                  <TableCell><Badge variant={p.status === "active" ? "default" : "secondary"}>{p.status}</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function Row({ label, children, span2 }: { label: string; children: React.ReactNode; span2?: boolean }) {
  return (
    <div className={span2 ? "sm:col-span-2 space-y-1.5" : "space-y-1.5"}>
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}
