import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type AppRole = Database["public"]["Enums"]["app_role"];

// Access matrix: which roles can see each nav key.
export const ACCESS: Record<string, AppRole[]> = {
  dashboard: ["super_admin", "admin", "hr", "operations", "finance", "manager", "dispatcher", "team_leader"],
  partners: ["super_admin", "admin", "hr", "operations", "manager"],
  attendance: ["super_admin", "admin", "hr", "operations", "manager", "team_leader"],
  deliveries: ["super_admin", "admin", "operations", "manager", "dispatcher"],
  earnings: ["super_admin", "admin", "finance"],
  reports: ["super_admin", "admin", "finance", "operations"],
  "audit-logs": ["super_admin", "admin"],
  settings: ["super_admin", "admin"],
};

export function useRoles() {
  return useQuery({
    queryKey: ["my-roles"],
    queryFn: async (): Promise<AppRole[]> => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return [];
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userData.user.id);
      if (error) return [];
      return (data ?? []).map((r) => r.role as AppRole);
    },
    staleTime: 60_000,
  });
}

export function canAccess(roles: AppRole[], key: string): boolean {
  const allowed = ACCESS[key];
  if (!allowed) return false;
  return roles.some((r) => allowed.includes(r));
}
