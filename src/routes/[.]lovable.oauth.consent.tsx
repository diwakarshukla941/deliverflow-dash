import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Bike } from "lucide-react";

type OAuthNamespace = {
  getAuthorizationDetails: (id: string) => Promise<{ data: AuthorizationDetails | null; error: { message: string } | null }>;
  approveAuthorization: (id: string) => Promise<{ data: AuthorizationDetails | null; error: { message: string } | null }>;
  denyAuthorization: (id: string) => Promise<{ data: AuthorizationDetails | null; error: { message: string } | null }>;
};

type AuthorizationDetails = {
  client?: { name?: string | null } | null;
  redirect_url?: string | null;
  redirect_to?: string | null;
};

function oauthApi(): OAuthNamespace {
  return (supabase.auth as unknown as { oauth: OAuthNamespace }).oauth;
}

export const Route = createFileRoute("/.lovable/oauth/consent")({
  ssr: false,
  validateSearch: (s: Record<string, unknown>) => ({
    authorization_id: typeof s.authorization_id === "string" ? s.authorization_id : "",
  }),
  beforeLoad: async ({ search, location }) => {
    if (!search.authorization_id) throw new Error("Missing authorization_id");
    const { data } = await supabase.auth.getSession();
    const next = location.pathname + location.searchStr;
    if (!data.session) throw redirect({ to: "/auth", search: { next } });
  },
  loader: async ({ location }) => {
    const authorizationId = new URLSearchParams(location.search).get("authorization_id")!;
    const { data, error } = await oauthApi().getAuthorizationDetails(authorizationId);
    if (error) throw error;
    const immediate = data?.redirect_url ?? data?.redirect_to;
    if (immediate && !data?.client) throw redirect({ href: immediate });
    return data;
  },
  component: Consent,
  head: () => ({ meta: [{ title: "Authorize app — Tej Delivery" }] }),
  errorComponent: ({ error }) => (
    <Shell>
      <p className="text-sm text-slate-300">
        Could not load this authorization request: {String((error as Error)?.message ?? error)}
      </p>
    </Shell>
  ),
});

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-12 text-slate-100">
      <div className="w-full max-w-md">
        <div className="mb-8 flex items-center justify-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-orange-500 text-white">
            <Bike className="h-5 w-5" />
          </div>
          <span className="text-lg font-semibold tracking-tight">Tej Delivery</span>
        </div>
        <Card className="border-white/10 bg-white/5 text-slate-100 backdrop-blur">
          <CardContent className="pt-6">{children}</CardContent>
        </Card>
      </div>
    </div>
  );
}

function Consent() {
  const details = Route.useLoaderData();
  const { authorization_id } = Route.useSearch();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const clientName = details?.client?.name ?? "an app";

  async function decide(approve: boolean) {
    setBusy(true);
    setError(null);
    const api = oauthApi();
    const { data, error: err } = approve
      ? await api.approveAuthorization(authorization_id)
      : await api.denyAuthorization(authorization_id);
    if (err) {
      setBusy(false);
      setError(err.message);
      return;
    }
    const target = data?.redirect_url ?? data?.redirect_to;
    if (!target) {
      setBusy(false);
      setError("No redirect returned by the authorization server.");
      return;
    }
    window.location.href = target;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-12 text-slate-100">
      <div className="w-full max-w-md">
        <div className="mb-8 flex items-center justify-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-orange-500 text-white">
            <Bike className="h-5 w-5" />
          </div>
          <span className="text-lg font-semibold tracking-tight">Tej Delivery</span>
        </div>
        <Card className="border-white/10 bg-white/5 text-slate-100 backdrop-blur">
          <CardHeader>
            <CardTitle>Connect {clientName}</CardTitle>
            <CardDescription className="text-slate-400">
              {clientName} is asking to use Tej Delivery as you. It will only see the partners,
              attendance and fleet data your account is allowed to access.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <p role="alert" className="text-sm text-red-400">
                {error}
              </p>
            )}
            <div className="flex gap-3">
              <Button
                disabled={busy}
                onClick={() => decide(true)}
                className="flex-1 bg-orange-500 hover:bg-orange-600"
              >
                {busy ? "Working…" : "Approve"}
              </Button>
              <Button
                disabled={busy}
                variant="ghost"
                onClick={() => decide(false)}
                className="flex-1 text-slate-200 hover:bg-white/5"
              >
                Deny
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}