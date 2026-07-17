import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { listRolePermissionsMatrix, setRolePermission } from "@/lib/users.functions";
import type { Database } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];

const ROLES: AppRole[] = [
  "admin","hr","operations","finance","manager","dispatcher","team_leader",
  "branch_manager","warehouse_manager","inventory_manager","customer_support",
  "delivery_manager","auditor",
];

export const Route = createFileRoute("/_authenticated/roles")({
  component: RolesPage,
});

type Perm = { key: string; module: string; action: string; description: string | null };
type RP = { role: AppRole; permission_key: string };

function RolesPage() {
  const qc = useQueryClient();
  const listFn = useServerFn(listRolePermissionsMatrix);
  const setFn = useServerFn(setRolePermission);

  const { data, isLoading } = useQuery({
    queryKey: ["role-permissions"],
    queryFn: () => listFn() as Promise<{ permissions: Perm[]; rolePermissions: RP[] }>,
  });

  const grouped = useMemo(() => {
    const perms = data?.permissions ?? [];
    const g: Record<string, Perm[]> = {};
    for (const p of perms) (g[p.module] ||= []).push(p);
    return g;
  }, [data]);

  const enabled = useMemo(() => {
    const s = new Set<string>();
    for (const rp of data?.rolePermissions ?? []) s.add(`${rp.role}:${rp.permission_key}`);
    return s;
  }, [data]);

  const toggle = useMutation({
    mutationFn: (payload: { role: AppRole; permission_key: string; enabled: boolean }) =>
      setFn({ data: payload }),
    onMutate: async (payload) => {
      await qc.cancelQueries({ queryKey: ["role-permissions"] });
      const prev = qc.getQueryData<{ permissions: Perm[]; rolePermissions: RP[] }>(["role-permissions"]);
      if (prev) {
        const next = { ...prev };
        next.rolePermissions = payload.enabled
          ? [...prev.rolePermissions, { role: payload.role, permission_key: payload.permission_key }]
          : prev.rolePermissions.filter((r) => !(r.role === payload.role && r.permission_key === payload.permission_key));
        qc.setQueryData(["role-permissions"], next);
      }
      return { prev };
    },
    onError: (e: Error, _v, ctx) => {
      toast.error(e.message);
      if (ctx?.prev) qc.setQueryData(["role-permissions"], ctx.prev);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["role-permissions"] }),
  });

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold">Roles &amp; permissions</h2>
        <p className="text-sm text-muted-foreground">
          Grant module-level permissions to each role. <Badge variant="secondary">super_admin</Badge> always has every permission.
        </p>
      </div>

      {isLoading && <Card><CardContent className="p-8 text-center text-muted-foreground">Loading matrix…</CardContent></Card>}

      {!isLoading && Object.entries(grouped).map(([mod, perms]) => (
        <Card key={mod}>
          <CardHeader className="pb-3">
            <CardTitle className="text-base capitalize">{mod}</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto p-0">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-2 text-left font-medium">Permission</th>
                  {ROLES.map((r) => (
                    <th key={r} className="px-2 py-2 text-center font-medium">{r}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {perms.map((p) => (
                  <tr key={p.key} className="border-t">
                    <td className="px-4 py-2">
                      <div className="font-medium">{p.action}</div>
                      {p.description && <div className="text-xs text-muted-foreground">{p.description}</div>}
                    </td>
                    {ROLES.map((role) => {
                      const on = enabled.has(`${role}:${p.key}`);
                      return (
                        <td key={role} className="px-2 py-2 text-center">
                          <Checkbox
                            checked={on}
                            onCheckedChange={(v) => toggle.mutate({ role, permission_key: p.key, enabled: v === true })}
                          />
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}