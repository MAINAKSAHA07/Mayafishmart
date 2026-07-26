"use client";

import { FormEvent, Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@mayafishmart/shared/supabase/client";
import { isSupabaseConfigured } from "@mayafishmart/shared/config";
import { Logo } from "@/components/ui/Logo";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!isSupabaseConfigured()) {
      setError("Supabase is not configured for the admin app.");
      return;
    }
    setLoading(true);
    const supabase = createClient();
    const { error: signError } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (signError) {
      setError(signError.message);
      return;
    }
    router.push(next);
    router.refresh();
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-16">
      <Logo size={64} priority />
      <h1 className="mt-5 font-display text-3xl text-white">Staff login</h1>
      <p className="mt-2 text-sm text-foam/70">
        Sign in with your staff email to open Maya Ops.
      </p>
      <form onSubmit={onSubmit} className="mt-8 space-y-4 rounded-2xl bg-white/5 p-5 ring-1 ring-white/10">
        <div>
          <label className="label !text-foam/70" htmlFor="email">
            Email
          </label>
          <input
            id="email"
            type="email"
            required
            autoComplete="email"
            className="input-field"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div>
          <label className="label !text-foam/70" htmlFor="password">
            Password
          </label>
          <input
            id="password"
            type="password"
            required
            autoComplete="current-password"
            className="input-field"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        {error && (
          <p className="text-sm text-coral" role="alert">
            {error}
          </p>
        )}
        <button type="submit" className="btn-primary w-full" disabled={loading}>
          {loading ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense fallback={<div className="p-10 text-foam/60">Loading…</div>}>
      <LoginForm />
    </Suspense>
  );
}
