import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Fetches the current user's effective permission keys.
 * super_admin gets the full permission catalog automatically.
 */
export function usePermissions() {
  return useQuery({
    queryKey: ["my-permissions"],
    queryFn: async (): Promise<Set<string>> => {
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData.user?.id;
      if (!uid) return new Set();

      const [{ data: roles }, { data: perms }] = await Promise.all([
        supabase.from("user_roles").select("role").eq("user_id", uid),
        supabase.from("permissions").select("key"),
      ]);

      const roleList = (roles ?? []).map((r) => r.role as string);
      // super_admin ⇒ wildcard
      if (roleList.includes("super_admin")) {
        return new Set((perms ?? []).map((p) => p.key));
      }
      if (roleList.length === 0) return new Set();

      const { data: rp } = await supabase
        .from("role_permissions")
        .select("permission_key")
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .in("role", roleList as any);
      return new Set((rp ?? []).map((r) => r.permission_key));
    },
    staleTime: 60_000,
  });
}

export function can(perms: Set<string> | undefined, key: string): boolean {
  return !!perms && perms.has(key);
}

export function canAny(perms: Set<string> | undefined, keys: string[]): boolean {
  if (!perms) return false;
  return keys.some((k) => perms.has(k));
}