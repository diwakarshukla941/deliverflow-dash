import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Truck, ShieldCheck, MapPin, BarChart3 } from "lucide-react";

export const Route = createFileRoute("/")({
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-100">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-orange-500 text-white">
            <Truck className="h-5 w-5" />
          </div>
          <span className="text-lg font-semibold tracking-tight">Tej Delivery</span>
        </div>
        <nav className="flex items-center gap-2">
          <Link to="/auth">
            <Button variant="ghost" className="text-slate-200 hover:text-white hover:bg-white/5">Sign in</Button>
          </Link>
          <Link to="/auth">
            <Button className="bg-orange-500 text-white hover:bg-orange-600">Get started</Button>
          </Link>
        </nav>
      </header>

      <main className="mx-auto max-w-6xl px-6 pt-16 pb-24">
        <div className="max-w-3xl">
          <span className="inline-flex items-center rounded-full border border-orange-500/30 bg-orange-500/10 px-3 py-1 text-xs font-medium text-orange-300">
            Operations Control Center
          </span>
          <h1 className="mt-6 text-5xl font-bold leading-tight tracking-tight sm:text-6xl">
            Run your delivery fleet from a single dashboard.
          </h1>
          <p className="mt-5 text-lg text-slate-300">
            Onboard partners, track attendance, manage deliveries and payouts —
            all built to plug into your Android and iOS partner apps.
          </p>
          <div className="mt-8 flex gap-3">
            <Link to="/auth">
              <Button size="lg" className="bg-orange-500 text-white hover:bg-orange-600">
                Open dashboard
              </Button>
            </Link>
          </div>
        </div>

        <div className="mt-20 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: ShieldCheck, title: "Role-based access", desc: "Super admin, HR, ops, finance, dispatchers." },
            { icon: MapPin, title: "Live attendance", desc: "GPS check-in/out with device metadata." },
            { icon: Truck, title: "Partner CRM", desc: "Full onboarding, KYC and vehicle records." },
            { icon: BarChart3, title: "Earnings & reports", desc: "Payouts, deliveries and audit trail." },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} className="rounded-xl border border-white/10 bg-white/5 p-5 backdrop-blur">
              <Icon className="h-6 w-6 text-orange-400" />
              <h3 className="mt-3 font-semibold">{title}</h3>
              <p className="mt-1 text-sm text-slate-400">{desc}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
