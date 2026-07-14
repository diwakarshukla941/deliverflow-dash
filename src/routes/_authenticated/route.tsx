import { createFileRoute, Outlet, redirect, Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard, Users, ClipboardCheck, Truck, Wallet,
  BarChart3, ScrollText, Settings, LogOut, Menu,
} from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    return { user: data.user };
  },
  component: AuthedLayout,
});

const NAV = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/partners", label: "Delivery Partners", icon: Users },
  { to: "/attendance", label: "Attendance", icon: ClipboardCheck },
  { to: "/deliveries", label: "Deliveries", icon: Truck },
  { to: "/earnings", label: "Earnings", icon: Wallet },
  { to: "/reports", label: "Reports", icon: BarChart3 },
  { to: "/audit-logs", label: "Audit Logs", icon: ScrollText },
  { to: "/settings", label: "Settings", icon: Settings },
] as const;

function AuthedLayout() {
  const { user } = Route.useRouteContext();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") navigate({ to: "/auth" });
    });
    return () => data.subscription.unsubscribe();
  }, [navigate]);

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/auth" });
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 w-64 bg-slate-950 text-slate-100 transition-transform lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex h-16 items-center gap-2 border-b border-white/10 px-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-orange-500">
            <Truck className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-semibold leading-tight">Tej Delivery</p>
            <p className="text-xs text-slate-400">Operations</p>
          </div>
        </div>
        <nav className="space-y-1 p-3">
          {NAV.map(({ to, label, icon: Icon }) => {
            const active = pathname === to;
            return (
              <Link
                key={to}
                to={to}
                onClick={() => setOpen(false)}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                  active
                    ? "bg-orange-500/15 text-orange-300"
                    : "text-slate-300 hover:bg-white/5 hover:text-white",
                )}
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            );
          })}
        </nav>
        <div className="absolute bottom-0 left-0 right-0 border-t border-white/10 p-3">
          <div className="mb-2 px-2 text-xs text-slate-400 truncate">{user.email}</div>
          <Button
            variant="ghost"
            onClick={signOut}
            className="w-full justify-start text-slate-200 hover:bg-white/5 hover:text-white"
          >
            <LogOut className="mr-2 h-4 w-4" /> Sign out
          </Button>
        </div>
      </aside>
      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b bg-white px-4 lg:px-8">
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setOpen(!open)}>
            <Menu className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-semibold">
            {NAV.find((n) => n.to === pathname)?.label ?? "Dashboard"}
          </h1>
        </header>
        <main className="p-4 lg:p-8">
          <Outlet />
        </main>
      </div>
      {open && (
        <div className="fixed inset-0 z-30 bg-black/40 lg:hidden" onClick={() => setOpen(false)} />
      )}
    </div>
  );
}
