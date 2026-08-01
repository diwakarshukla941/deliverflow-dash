import { createFileRoute } from "@tanstack/react-router";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import {
  listPartners, getPartnerStats, createPartner, updatePartner, setPartnerStatus, deletePartner,
  type PartnerFormValues,
} from "@/lib/partners.functions";
import { usePermissions, can } from "@/hooks/use-permissions";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Plus, Search, MoreHorizontal, Download, Users, ShieldAlert } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/partners")({
  component: PartnersPage,
  head: () => ({
    meta: [
      { title: "Delivery Partners | Tej Delivery Ops" },
      { name: "description", content: "Onboard, verify and manage the Tej Delivery partner fleet supplying hotels and restaurants." },
      { property: "og:title", content: "Delivery Partners | Tej Delivery Ops" },
      { property: "og:description", content: "Onboard, verify and manage the Tej Delivery partner fleet." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

const STATUSES = ["pending", "active", "suspended", "deactivated", "blacklisted", "resigned"] as const;
type Status = (typeof STATUSES)[number];

const STATUS_STYLE: Record<Status, string> = {
  active: "bg-emerald-100 text-emerald-800 hover:bg-emerald-100",
  pending: "bg-amber-100 text-amber-800 hover:bg-amber-100",
  suspended: "bg-orange-100 text-orange-800 hover:bg-orange-100",
  deactivated: "bg-slate-200 text-slate-700 hover:bg-slate-200",
  blacklisted: "bg-red-100 text-red-800 hover:bg-red-100",
  resigned: "bg-slate-200 text-slate-700 hover:bg-slate-200",
};

const EMPTY: PartnerFormValues = {
  partner_code: "", full_name: "", phone: "", email: "", date_of_birth: "", gender: "",
  address_line1: "", address_line2: "", city: "", state: "", postal_code: "",
  emergency_contact_name: "", emergency_contact_phone: "", emergency_contact_relation: "",
  government_id_type: "Aadhaar", government_id_number: "", driving_license_number: "", driving_license_expiry: "",
  vehicle_type: "Bike", vehicle_number: "", vehicle_model: "",
  bank_account_holder: "", bank_account_number: "", bank_ifsc: "", bank_name: "", upi_id: "",
  joining_date: "", employment_type: "full_time", status: "pending", notes: "",
};

type PartnerRow = Record<string, string | number | null> & { id: string; partner_code: string; full_name: string; phone: string; status: Status };

function PartnersPage() {
  const qc = useQueryClient();
  const { data: perms } = usePermissions();
  const canCreate = can(perms, "partners.create");
  const canUpdate = can(perms, "partners.update");
  const canDelete = can(perms, "partners.delete");

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<Status | "all">("all");
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<PartnerRow | null>(null);
  const [form, setForm] = useState<PartnerFormValues>(EMPTY);
  const [detail, setDetail] = useState<PartnerRow | null>(null);
  const [toDelete, setToDelete] = useState<PartnerRow | null>(null);

  const fetchList = useServerFn(listPartners);
  const fetchStats = useServerFn(getPartnerStats);
  const doCreate = useServerFn(createPartner);
  const doUpdate = useServerFn(updatePartner);
  const doStatus = useServerFn(setPartnerStatus);
  const doDelete = useServerFn(deletePartner);

  const list = useQuery({
    queryKey: ["partners", { search, status, page }],
    queryFn: () => fetchList({ data: { search, status, page, pageSize } }),
    placeholderData: keepPreviousData,
  });
  const stats = useQuery({ queryKey: ["partner-stats"], queryFn: () => fetchStats({}) });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["partners"] });
    qc.invalidateQueries({ queryKey: ["partner-stats"] });
  };

  const save = useMutation({
    mutationFn: async (values: PartnerFormValues) =>
      editing ? doUpdate({ data: { ...values, id: editing.id } }) : doCreate({ data: values }),
    onSuccess: () => {
      toast.success(editing ? "Partner updated" : "Partner onboarded");
      setFormOpen(false);
      setEditing(null);
      setForm(EMPTY);
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const changeStatus = useMutation({
    mutationFn: async (v: { id: string; status: Status }) => doStatus({ data: v }),
    onSuccess: () => { toast.success("Status updated"); refresh(); },
    onError: (e: Error) => toast.error(e.message),
  });

  const removePartner = useMutation({
    mutationFn: async (id: string) => doDelete({ data: { id } }),
    onSuccess: () => { toast.success("Partner removed"); setToDelete(null); refresh(); },
    onError: (e: Error) => toast.error(e.message),
  });

  const rows = (list.data?.rows ?? []) as unknown as PartnerRow[];
  const total = list.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const set = (k: keyof PartnerFormValues) => (v: string) => setForm((f) => ({ ...f, [k]: v }));

  const openCreate = () => { setEditing(null); setForm(EMPTY); setFormOpen(true); };
  const openEdit = (p: PartnerRow) => {
    setEditing(p);
    setForm({ ...EMPTY, ...Object.fromEntries(Object.entries(p).map(([k, v]) => [k, v ?? ""])) } as PartnerFormValues);
    setFormOpen(true);
  };

  const exportCsv = () => {
    const cols = ["partner_code", "full_name", "phone", "email", "city", "vehicle_type", "vehicle_number", "status", "joining_date"];
    const csv = [cols.join(",")]
      .concat(rows.map((r) => cols.map((c) => `"${String(r[c] ?? "").replace(/"/g, '""')}"`).join(",")))
      .join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `tej-delivery-partners-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const statCards = useMemo(() => ([
    { label: "Total fleet", value: stats.data?.total ?? 0 },
    { label: "Active", value: stats.data?.active ?? 0 },
    { label: "Pending KYC", value: stats.data?.pending ?? 0 },
    { label: "Suspended", value: (stats.data?.suspended ?? 0) + (stats.data?.blacklisted ?? 0) },
  ]), [stats.data]);

  if (list.isError) {
    return (
      <Card><CardContent className="flex flex-col items-center gap-2 py-16 text-center">
        <ShieldAlert className="h-8 w-8 text-muted-foreground" />
        <p className="font-medium">Unable to load delivery partners</p>
        <p className="text-sm text-muted-foreground">{(list.error as Error).message}</p>
      </CardContent></Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">Delivery boys</h2>
          <p className="text-sm text-muted-foreground">Onboard, verify and manage the fleet supplied to partner hotels.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportCsv} disabled={rows.length === 0}>
            <Download className="mr-2 h-4 w-4" /> Export
          </Button>
          {canCreate && (
            <Button className="bg-orange-500 hover:bg-orange-600" onClick={openCreate}>
              <Plus className="mr-2 h-4 w-4" /> Add delivery boy
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((s) => (
          <Card key={s.label}>
            <CardContent className="flex items-center justify-between p-4">
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">{s.label}</p>
                <p className="text-2xl font-semibold">{s.value}</p>
              </div>
              <Users className="h-5 w-5 text-orange-500" />
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardContent className="flex flex-wrap gap-3 p-4">
          <div className="relative min-w-[220px] flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Search name, code, phone, city, vehicle…"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            />
          </div>
          <Select value={status} onValueChange={(v) => { setStatus(v as Status | "all"); setPage(1); }}>
            <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

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
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.isLoading && (
                <TableRow><TableCell colSpan={7} className="py-8 text-center text-muted-foreground">Loading…</TableCell></TableRow>
              )}
              {!list.isLoading && rows.length === 0 && (
                <TableRow><TableCell colSpan={7} className="py-12 text-center text-muted-foreground">
                  No delivery boys match this view.
                </TableCell></TableRow>
              )}
              {rows.map((p) => (
                <TableRow key={p.id} className="cursor-pointer" onClick={() => setDetail(p)}>
                  <TableCell className="font-mono text-xs">{p.partner_code}</TableCell>
                  <TableCell className="font-medium">{p.full_name}</TableCell>
                  <TableCell>{p.phone}</TableCell>
                  <TableCell>{p.city ?? "—"}</TableCell>
                  <TableCell>{p.vehicle_type ?? "—"} {p.vehicle_number ? `· ${p.vehicle_number}` : ""}</TableCell>
                  <TableCell><Badge className={STATUS_STYLE[p.status]}>{p.status}</Badge></TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setDetail(p)}>View profile</DropdownMenuItem>
                        {canUpdate && <DropdownMenuItem onClick={() => openEdit(p)}>Edit details</DropdownMenuItem>}
                        {canUpdate && <DropdownMenuSeparator />}
                        {canUpdate && STATUSES.filter((s) => s !== p.status).map((s) => (
                          <DropdownMenuItem key={s} onClick={() => changeStatus.mutate({ id: p.id, status: s })}>
                            Mark {s}
                          </DropdownMenuItem>
                        ))}
                        {canDelete && <DropdownMenuSeparator />}
                        {canDelete && (
                          <DropdownMenuItem className="text-red-600" onClick={() => setToDelete(p)}>
                            Remove partner
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>{total} partner{total === 1 ? "" : "s"} · page {page} of {totalPages}</span>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
          <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Next</Button>
        </div>
      </div>

      {/* Create / edit */}
      <Dialog open={formOpen} onOpenChange={(o) => { setFormOpen(o); if (!o) setEditing(null); }}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>{editing ? `Edit ${editing.full_name}` : "Onboard delivery boy"}</DialogTitle>
            <DialogDescription>Complete personal, KYC, vehicle and payout details.</DialogDescription>
          </DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); save.mutate(form); }} className="space-y-4">
            <Tabs defaultValue="personal">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="personal">Personal</TabsTrigger>
                <TabsTrigger value="kyc">KYC</TabsTrigger>
                <TabsTrigger value="vehicle">Vehicle</TabsTrigger>
                <TabsTrigger value="payout">Payout</TabsTrigger>
              </TabsList>

              <TabsContent value="personal" className="grid gap-3 pt-4 sm:grid-cols-2">
                <Field label="Partner code *"><Input value={form.partner_code} onChange={(e) => set("partner_code")(e.target.value)} placeholder="TEJ-001" required /></Field>
                <Field label="Full name *"><Input value={form.full_name} onChange={(e) => set("full_name")(e.target.value)} required /></Field>
                <Field label="Phone *"><Input value={form.phone} onChange={(e) => set("phone")(e.target.value)} required /></Field>
                <Field label="Email"><Input type="email" value={form.email ?? ""} onChange={(e) => set("email")(e.target.value)} /></Field>
                <Field label="Date of birth"><Input type="date" value={form.date_of_birth ?? ""} onChange={(e) => set("date_of_birth")(e.target.value)} /></Field>
                <Field label="Gender">
                  <Select value={form.gender || "unspecified"} onValueChange={(v) => set("gender")(v === "unspecified" ? "" : v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unspecified">Not specified</SelectItem>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Address line 1" span2><Input value={form.address_line1 ?? ""} onChange={(e) => set("address_line1")(e.target.value)} /></Field>
                <Field label="City"><Input value={form.city ?? ""} onChange={(e) => set("city")(e.target.value)} /></Field>
                <Field label="State"><Input value={form.state ?? ""} onChange={(e) => set("state")(e.target.value)} /></Field>
                <Field label="Postal code"><Input value={form.postal_code ?? ""} onChange={(e) => set("postal_code")(e.target.value)} /></Field>
                <Field label="Emergency contact"><Input value={form.emergency_contact_name ?? ""} onChange={(e) => set("emergency_contact_name")(e.target.value)} /></Field>
                <Field label="Emergency phone"><Input value={form.emergency_contact_phone ?? ""} onChange={(e) => set("emergency_contact_phone")(e.target.value)} /></Field>
                <Field label="Relation"><Input value={form.emergency_contact_relation ?? ""} onChange={(e) => set("emergency_contact_relation")(e.target.value)} /></Field>
              </TabsContent>

              <TabsContent value="kyc" className="grid gap-3 pt-4 sm:grid-cols-2">
                <Field label="Government ID type">
                  <Select value={form.government_id_type || "Aadhaar"} onValueChange={(v) => set("government_id_type")(v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["Aadhaar", "PAN", "Voter ID", "Passport"].map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Government ID number"><Input value={form.government_id_number ?? ""} onChange={(e) => set("government_id_number")(e.target.value)} /></Field>
                <Field label="Driving licence no."><Input value={form.driving_license_number ?? ""} onChange={(e) => set("driving_license_number")(e.target.value)} /></Field>
                <Field label="Licence expiry"><Input type="date" value={form.driving_license_expiry ?? ""} onChange={(e) => set("driving_license_expiry")(e.target.value)} /></Field>
                <Field label="Joining date"><Input type="date" value={form.joining_date ?? ""} onChange={(e) => set("joining_date")(e.target.value)} /></Field>
                <Field label="Employment type">
                  <Select value={form.employment_type || "full_time"} onValueChange={(v) => set("employment_type")(v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="full_time">Full time</SelectItem>
                      <SelectItem value="part_time">Part time</SelectItem>
                      <SelectItem value="contract">Contract</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Status">
                  <Select value={form.status ?? "pending"} onValueChange={(v) => setForm((f) => ({ ...f, status: v as Status }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                  </Select>
                </Field>
                <Field label="Notes" span2><Textarea rows={3} value={form.notes ?? ""} onChange={(e) => set("notes")(e.target.value)} /></Field>
              </TabsContent>

              <TabsContent value="vehicle" className="grid gap-3 pt-4 sm:grid-cols-2">
                <Field label="Vehicle type">
                  <Select value={form.vehicle_type || "Bike"} onValueChange={(v) => set("vehicle_type")(v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["Bike", "Scooter", "Bicycle", "EV Scooter", "Car"].map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Vehicle number"><Input value={form.vehicle_number ?? ""} onChange={(e) => set("vehicle_number")(e.target.value)} placeholder="MH12 AB 1234" /></Field>
                <Field label="Vehicle model" span2><Input value={form.vehicle_model ?? ""} onChange={(e) => set("vehicle_model")(e.target.value)} /></Field>
              </TabsContent>

              <TabsContent value="payout" className="grid gap-3 pt-4 sm:grid-cols-2">
                <Field label="Account holder"><Input value={form.bank_account_holder ?? ""} onChange={(e) => set("bank_account_holder")(e.target.value)} /></Field>
                <Field label="Bank name"><Input value={form.bank_name ?? ""} onChange={(e) => set("bank_name")(e.target.value)} /></Field>
                <Field label="Account number"><Input value={form.bank_account_number ?? ""} onChange={(e) => set("bank_account_number")(e.target.value)} /></Field>
                <Field label="IFSC"><Input value={form.bank_ifsc ?? ""} onChange={(e) => set("bank_ifsc")(e.target.value)} placeholder="HDFC0001234" /></Field>
                <Field label="UPI ID" span2><Input value={form.upi_id ?? ""} onChange={(e) => set("upi_id")(e.target.value)} placeholder="name@upi" /></Field>
              </TabsContent>
            </Tabs>

            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setFormOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={save.isPending} className="bg-orange-500 hover:bg-orange-600">
                {save.isPending ? "Saving…" : editing ? "Save changes" : "Onboard partner"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Detail */}
      <Sheet open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
          {detail && (
            <>
              <SheetHeader>
                <SheetTitle>{detail.full_name}</SheetTitle>
                <SheetDescription className="font-mono text-xs">{detail.partner_code}</SheetDescription>
              </SheetHeader>
              <div className="mt-4 space-y-5">
                <Badge className={STATUS_STYLE[detail.status]}>{detail.status}</Badge>
                <Section title="Contact" items={[
                  ["Phone", detail.phone], ["Email", detail.email], ["City", detail.city],
                  ["Address", detail.address_line1], ["State", detail.state], ["Postal code", detail.postal_code],
                  ["Emergency", detail.emergency_contact_name], ["Emergency phone", detail.emergency_contact_phone],
                ]} />
                <Section title="KYC & employment" items={[
                  ["ID type", detail.government_id_type], ["ID number", detail.government_id_number],
                  ["Licence", detail.driving_license_number], ["Licence expiry", detail.driving_license_expiry],
                  ["Joining date", detail.joining_date], ["Employment", detail.employment_type],
                ]} />
                <Section title="Vehicle" items={[
                  ["Type", detail.vehicle_type], ["Number", detail.vehicle_number], ["Model", detail.vehicle_model],
                ]} />
                <Section title="Payout" items={[
                  ["Holder", detail.bank_account_holder], ["Bank", detail.bank_name],
                  ["Account", detail.bank_account_number], ["IFSC", detail.bank_ifsc], ["UPI", detail.upi_id],
                ]} />
                {detail.notes && <Section title="Notes" items={[["", detail.notes]]} />}
                {canUpdate && (
                  <Button className="w-full bg-orange-500 hover:bg-orange-600" onClick={() => { const d = detail; setDetail(null); openEdit(d); }}>
                    Edit details
                  </Button>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove {toDelete?.full_name}?</AlertDialogTitle>
            <AlertDialogDescription>
              The partner is archived and deactivated. Attendance and delivery history is preserved for audit.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={() => toDelete && removePartner.mutate(toDelete.id)}>
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function Field({ label, children, span2 }: { label: string; children: React.ReactNode; span2?: boolean }) {
  return (
    <div className={span2 ? "space-y-1.5 sm:col-span-2" : "space-y-1.5"}>
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}

function Section({ title, items }: { title: string; items: [string, string | number | null | undefined][] }) {
  return (
    <div>
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</p>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
        {items.map(([k, v], i) => (
          <div key={`${k}-${i}`} className={k ? "" : "col-span-2"}>
            {k && <dt className="text-xs text-muted-foreground">{k}</dt>}
            <dd className="break-words">{v ? String(v) : "—"}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
