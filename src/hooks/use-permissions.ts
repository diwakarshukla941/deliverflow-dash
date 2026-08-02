import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/** Current auth user id, kept in sync with sign-in / sign-out on this device. */
export function useAuthUserId() {
  const [uid, setUid] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    let alive = true;
    supabase.auth.getUser().then(({ data }) => {
      if (alive) setUid(data.user?.id ?? null);
    });
    const { data } = supabase.auth.onAuthStateChange((_e, session) => {
      setUid(session?.user?.id ?? null);
    });
    return () => {
      alive = false;
      data.subscription.unsubscribe();
    };
  }, []);

  return uid;
}

type MyAccess = { roles: string[]; permissions: Set<string> };

/**
 * Fetches the current user's roles + effective permission keys.
 * Cache is scoped to the user id so a different account on the same device
 * never inherits the previous user's access.
 */
export function useMyAccess() {
  const uid = useAuthUserId();

  return useQuery({
    queryKey: ["my-access", uid],
    enabled: uid !== undefined,
    queryFn: async (): Promise<MyAccess> => {
      if (!uid) return { roles: [], permissions: new Set<string>() };

      const [rolesRes, permsRes] = await Promise.all([
        supabase.from("user_roles").select("role").eq("user_id", uid),
        supabase.from("permissions").select("key"),
      ]);
      // Surface failures instead of silently rendering "no access".
      if (rolesRes.error) throw rolesRes.error;
      if (permsRes.error) throw permsRes.error;

      const roles = (rolesRes.data ?? []).map((r) => r.role as string);
      if (roles.includes("super_admin")) {
        return { roles, permissions: new Set((permsRes.data ?? []).map((p) => p.key)) };
      }
      if (roles.length === 0) return { roles, permissions: new Set<string>() };

      const rp = await supabase
        .from("role_permissions")
        .select("permission_key")
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .in("role", roles as any);
      if (rp.error) throw rp.error;
      return { roles, permissions: new Set((rp.data ?? []).map((r) => r.permission_key)) };
    },
    staleTime: 60_000,
    retry: 1,
  });
}

/** Backwards-compatible: returns just the permission key set. */
export function usePermissions() {
  const q = useMyAccess();
  return { ...q, data: q.data?.permissions };
}
export function can(perms: Set<string> | undefined, key: string): boolean {
  return !!perms && perms.has(key);
}

export function canAny(perms: Set<string> | undefined, keys: string[]): boolean {
  if (!perms) return false;
  return keys.some((k) => perms.has(k));
}