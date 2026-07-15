import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import { Bike } from "lucide-react";

export const Route = createFileRoute("/auth")({
  component: AuthPage,
  head: () => ({ meta: [{ title: "Sign in — Tej Delivery" }] }),
});

function AuthPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/dashboard" });
    });
  }, [navigate]);

  const signIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Welcome back");
    navigate({ to: "/dashboard" });
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <Link to="/auth" className="mb-8 flex items-center justify-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-orange-500 text-white">
            <Bike className="h-5 w-5" />
          </div>
          <span className="text-lg font-semibold tracking-tight">Tej Delivery</span>
        </Link>
        <Card className="border-white/10 bg-white/5 backdrop-blur text-slate-100">
          <CardHeader>
            <CardTitle>Operations dashboard</CardTitle>
            <CardDescription className="text-slate-400">
              Sign in with the account provided by your Super Admin.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={signIn} className="space-y-4">
              <Field label="Email" type="email" value={email} onChange={setEmail} />
              <Field label="Password" type="password" value={password} onChange={setPassword} />
              <Button type="submit" disabled={loading} className="w-full bg-orange-500 hover:bg-orange-600">
                {loading ? "Signing in…" : "Sign in"}
              </Button>
            </form>

            <div className="mt-6 rounded-lg border border-white/10 bg-white/5 p-3 text-xs text-slate-300">
              <p className="mb-2 font-semibold text-slate-200">Demo credentials</p>
              <p><span className="text-slate-400">Super Admin:</span> admin@tej.com / TejAdmin@2026</p>
              <p><span className="text-slate-400">Manager:</span> manager@tej.com / TejManager@2026</p>
              <p><span className="text-slate-400">HR:</span> hr@tej.com / TejHR@2026</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Field({ label, type = "text", value, onChange }: {
  label: string; type?: string; value: string; onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Input
        type={type}
        value={value}
        onChange={(e) => e.target && onChange(e.target.value)}
        required
        autoComplete={type === "password" ? "current-password" : "email"}
        className="bg-white/5 border-white/10 text-slate-100"
      />
    </div>
  );
}
