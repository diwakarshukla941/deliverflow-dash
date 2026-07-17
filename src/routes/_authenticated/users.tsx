import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, KeyRound, Trash2, Pencil, ShieldOff } from "lucide-react";
import { toast } from "sonner";
import { usePermissions, can } from "@/hooks/use-permissions";
import {
  listStaffUsers,
  createStaffUser,
  updateStaffUser,
  deleteStaffUser,
  resetStaffPassword,
} from "@/lib/users.functions";
import type { Database } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];

const ALL_ROLES: AppRole[] = [
  "super_admin","admin","hr","operations","finance","manager","dispatcher",
  "team_leader","branch_manager","warehouse_manager","inventory_manager",
  "customer_support","delivery_manager","auditor",
];

export const Route = createFileRoute("/_authenticated/users")({
  component: UsersPage,
});

type StaffRow = {
  id: string;
  email: string;
  full_name: string;
  phone: string | null;
  employee_id: string | null;
  department: string | null;
  designation: string | null;
  branch: string | null;
  joining_date: string | null;
  status: string;
  notes: string | null;
  roles: AppRole[];
};

const EMPTY_CREATE = {
  email: "",
  password: "",
  full_name: "",
  phone: "",
  employee_id: "",
  department: "",
  designation: "",
  branch: "",
  joining_date: "",
  notes: "",
  roles: [] as AppRole[],
};

function UsersPage() {
  const qc = useQueryClient();
  const { data: perms } = usePermissions();
  const canManage = can(perms, "users.manage");

  const listFn = useServerFn(listStaffUsers);
  const createFn = useServerFn(createStaffUser);
  const updateFn = useServerFn(updateStaffUser);
  const resetFn = useServerFn(resetStaffPassword);
  const deleteFn = useServerFn(deleteStaffUser);

  const { data, isLoading } = useQuery({
    queryKey: ["staff-users"],
    queryFn: () => listFn(),
  });

  const users = (data as StaffRow[] | undefined) ?? [];

  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState(EMPTY_CREATE);
  const [editing, setEditing] = useState<StaffRow | null>(null);
  const [resetting, setResetting] = useState<StaffRow | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) =>
      [u.full_name, u.email, u.employee_id, u.department, u.branch, ...u.roles]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q)),
    );
  }, [users, search]);

  const create = useMutation({
    mutationFn: (values: typeof EMPTY_CREATE) =>
      createFn({ data: { ...values, roles: values.roles } }),
    onSuccess: () => {
      toast.success("Staff user created");
      setCreateForm(EMPTY_CREATE);
      setCreateOpen(false);
      qc.invalidateQueries({ queryKey: ["staff-users"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const update = useMutation({
    mutationFn: (values: Partial<StaffRow> & { id: string; roles?: AppRole[] }) =>
      updateFn({ data: values }),
    onSuccess: () => {
      toast.success("Staff user updated");
      setEditing(null);
      qc.invalidateQueries({ queryKey: ["staff-users"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const resetPw = useMutation({
    mutationFn: (payload: { id: string; password: string }) => resetFn({ data: payload }),
    onSuccess: () => {
      toast.success("Password reset");
      setResetting(null);
      setNewPassword("");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteFn({ data: { id } }),
    onSuccess: () => {
      toast.success("Staff user deactivated");
      qc.invalidateQueries({ queryKey: ["staff-users"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleRole = (list: AppRole[], role: AppRole, on: boolean) =>
    on ? Array.from(new Set([...list, role])) : list.filter((r) => r !== role);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">Staff users</h2>
          <p className="text-sm text-muted-foreground">
            Create accounts for admins, managers, HR, dispatchers and auditors. Assign one or more roles.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Input
            className="w-56"
            placeholder="Search name, email, branch…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {canManage && (
            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
              <DialogTrigger asChild>
                <Button className="bg-orange-500 hover:bg-orange-600">
                  <Plus className="mr-2 h-4 w-4" /> New staff user
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Create staff user</DialogTitle>
                  <DialogDescription>
                    Provisions the login, profile, and role assignment in one step.
                  </DialogDescription>
                </DialogHeader>
                <form
                  className="grid gap-3 sm:grid-cols-2"
                  onSubmit={(e) => {
                    e.preventDefault();
                    create.mutate(createForm);
                  }}
                >
                  <Field label="Full name *">
                    <Input required value={createForm.full_name} onChange={(e) => setCreateForm({ ...createForm, full_name: e.target.value })} />
                  </Field>
                  <Field label="Email *">
                    <Input required type="email" value={createForm.email} onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })} />
                  </Field>
                  <Field label="Temporary password *">
                    <Input required type="text" minLength={8} value={createForm.password} onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })} placeholder="min 8 chars" />
                  </Field>
                  <Field label="Phone">
                    <Input value={createForm.phone} onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })} />
                  </Field>
                  <Field label="Employee ID">
                    <Input value={createForm.employee_id} onChange={(e) => setCreateForm({ ...createForm, employee_id: e.target.value })} />
                  </Field>
                  <Field label="Joining date">
                    <Input type="date" value={createForm.joining_date} onChange={(e) => setCreateForm({ ...createForm, joining_date: e.target.value })} />
                  </Field>
                  <Field label="Department">
                    <Input value={createForm.department} onChange={(e) => setCreateForm({ ...createForm, department: e.target.value })} />
                  </Field>
                  <Field label="Designation">
                    <Input value={createForm.designation} onChange={(e) => setCreateForm({ ...createForm, designation: e.target.value })} />
                  </Field>
                  <Field label="Branch" span2>
                    <Input value={createForm.branch} onChange={(e) => setCreateForm({ ...createForm, branch: e.target.value })} />
                  </Field>
                  <Field label="Roles *" span2>
                    <RolePicker
                      value={createForm.roles}
                      onChange={(roles) => setCreateForm({ ...createForm, roles })}
                    />
                  </Field>
                  <Field label="Notes" span2>
                    <Input value={createForm.notes} onChange={(e) => setCreateForm({ ...createForm, notes: e.target.value })} />
                  </Field>
                  <DialogFooter className="sm:col-span-2">
                    <Button type="button" variant="ghost" onClick={() => setCreateOpen(false)}>Cancel</Button>
                    <Button type="submit" disabled={create.isPending || createForm.roles.length === 0} className="bg-orange-500 hover:bg-orange-600">
                      {create.isPending ? "Creating…" : "Create user"}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Roles</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Branch</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Loading…</TableCell></TableRow>
              )}
              {!isLoading && filtered.length === 0 && (
                <TableRow><TableCell colSpan={7} className="text-center py-12 text-muted-foreground">No staff users match.</TableCell></TableRow>
              )}
              {filtered.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">
                    {u.full_name}
                    {u.employee_id && <div className="text-xs text-muted-foreground">#{u.employee_id}</div>}
                  </TableCell>
                  <TableCell className="text-sm">{u.email}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {u.roles.length === 0 && <span className="text-xs text-muted-foreground">no roles</span>}
                      {u.roles.map((r) => (
                        <Badge key={r} variant="secondary" className="text-[10px]">{r}</Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">{u.department ?? "—"}</TableCell>
                  <TableCell className="text-sm">{u.branch ?? "—"}</TableCell>
                  <TableCell>
                    <Badge variant={u.status === "active" ? "default" : u.status === "suspended" ? "secondary" : "outline"}>
                      {u.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {canManage && (
                      <div className="flex justify-end gap-1">
                        <Button size="icon" variant="ghost" onClick={() => setEditing(u)} title="Edit">
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => setResetting(u)} title="Reset password">
                          <KeyRound className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => update.mutate({ id: u.id, status: u.status === "active" ? "suspended" : "active" })}
                          title={u.status === "active" ? "Suspend" : "Activate"}
                        >
                          <ShieldOff className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => { if (confirm(`Deactivate ${u.full_name}?`)) remove.mutate(u.id); }}
                          title="Deactivate"
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {editing && (
        <Dialog open onOpenChange={(o) => !o && setEditing(null)}>
          <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>Edit {editing.full_name}</DialogTitle>
              <DialogDescription>Update profile fields and role assignments.</DialogDescription>
            </DialogHeader>
            <form
              className="grid gap-3 sm:grid-cols-2"
              onSubmit={(e) => {
                e.preventDefault();
                update.mutate({
                  id: editing.id,
                  full_name: editing.full_name,
                  phone: editing.phone ?? "",
                  employee_id: editing.employee_id ?? "",
                  department: editing.department ?? "",
                  designation: editing.designation ?? "",
                  branch: editing.branch ?? "",
                  joining_date: editing.joining_date ?? "",
                  notes: editing.notes ?? "",
                  roles: editing.roles,
                });
              }}
            >
              <Field label="Full name"><Input value={editing.full_name} onChange={(e) => setEditing({ ...editing, full_name: e.target.value })} /></Field>
              <Field label="Phone"><Input value={editing.phone ?? ""} onChange={(e) => setEditing({ ...editing, phone: e.target.value })} /></Field>
              <Field label="Employee ID"><Input value={editing.employee_id ?? ""} onChange={(e) => setEditing({ ...editing, employee_id: e.target.value })} /></Field>
              <Field label="Joining date"><Input type="date" value={editing.joining_date ?? ""} onChange={(e) => setEditing({ ...editing, joining_date: e.target.value })} /></Field>
              <Field label="Department"><Input value={editing.department ?? ""} onChange={(e) => setEditing({ ...editing, department: e.target.value })} /></Field>
              <Field label="Designation"><Input value={editing.designation ?? ""} onChange={(e) => setEditing({ ...editing, designation: e.target.value })} /></Field>
              <Field label="Branch" span2><Input value={editing.branch ?? ""} onChange={(e) => setEditing({ ...editing, branch: e.target.value })} /></Field>
              <Field label="Roles" span2>
                <RolePicker
                  value={editing.roles}
                  onChange={(roles) => setEditing({ ...editing, roles })}
                />
              </Field>
              <Field label="Notes" span2><Input value={editing.notes ?? ""} onChange={(e) => setEditing({ ...editing, notes: e.target.value })} /></Field>
              <DialogFooter className="sm:col-span-2">
                <Button type="button" variant="ghost" onClick={() => setEditing(null)}>Cancel</Button>
                <Button type="submit" disabled={update.isPending} className="bg-orange-500 hover:bg-orange-600">
                  {update.isPending ? "Saving…" : "Save changes"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {resetting && (
        <Dialog open onOpenChange={(o) => !o && setResetting(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Reset password for {resetting.full_name}</DialogTitle>
              <DialogDescription>Send this password to the user through a secure channel.</DialogDescription>
            </DialogHeader>
            <Input
              type="text"
              minLength={8}
              placeholder="New password (min 8 chars)"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
            <DialogFooter>
              <Button variant="ghost" onClick={() => setResetting(null)}>Cancel</Button>
              <Button
                disabled={resetPw.isPending || newPassword.length < 8}
                onClick={() => resetPw.mutate({ id: resetting.id, password: newPassword })}
                className="bg-orange-500 hover:bg-orange-600"
              >
                {resetPw.isPending ? "Resetting…" : "Reset password"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

function Field({ label, children, span2 }: { label: string; children: React.ReactNode; span2?: boolean }) {
  return (
    <div className={span2 ? "sm:col-span-2 space-y-1.5" : "space-y-1.5"}>
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}

function RolePicker({ value, onChange }: { value: AppRole[]; onChange: (v: AppRole[]) => void }) {
  return (
    <div className="flex flex-wrap gap-2 rounded-lg border p-2">
      {ALL_ROLES.map((r) => {
        const on = value.includes(r);
        return (
          <button
            type="button"
            key={r}
            onClick={() => onChange(on ? value.filter((x) => x !== r) : [...value, r])}
            className={
              "rounded-full px-3 py-1 text-xs transition " +
              (on ? "bg-orange-500 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200")
            }
          >
            {r}
          </button>
        );
      })}
    </div>
  );
}