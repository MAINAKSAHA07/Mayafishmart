"use client";

import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/demo-data";
import { Logo } from "@/components/ui/Logo";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useState } from "react";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/account";
  const [mode, setMode] = useState<"email" | "phone">("email");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [info, setInfo] = useState<string | null>(null);

  async function onEmailSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    if (!isSupabaseConfigured()) {
      setError("Connect Supabase env vars to enable login. See .env.example.");
      return;
    }
    setLoading(true);
    const supabase = createClient();
    const { error: signError } = await supabase.auth.signInWithPassword({ email, password });
    if (signError) {
      const { error: upError } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { role: "customer" } },
      });
      if (upError) {
        setError(upError.message);
        setLoading(false);
        return;
      }
      setInfo("Account created. Check email if confirmation is required, then sign in.");
      setLoading(false);
      return;
    }
    router.push(next);
    router.refresh();
  }

  async function sendOtp(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!isSupabaseConfigured()) {
      setError("Connect Supabase env vars to enable phone OTP.");
      return;
    }
    setLoading(true);
    const supabase = createClient();
    const formatted = phone.startsWith("+") ? phone : `+91${phone.replace(/\D/g, "")}`;
    const { error: otpError } = await supabase.auth.signInWithOtp({ phone: formatted });
    setLoading(false);
    if (otpError) {
      setError(otpError.message);
      return;
    }
    setOtpSent(true);
    setInfo("OTP sent to your phone.");
  }

  async function verifyOtp(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const supabase = createClient();
    const formatted = phone.startsWith("+") ? phone : `+91${phone.replace(/\D/g, "")}`;
    const { error: verifyError } = await supabase.auth.verifyOtp({
      phone: formatted,
      token: otp,
      type: "sms",
    });
    setLoading(false);
    if (verifyError) {
      setError(verifyError.message);
      return;
    }
    router.push(next);
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-md px-4 py-14 sm:px-6 sm:py-20">
      <Logo size={64} priority />
      <h1 className="mt-5 text-[clamp(2rem,5vw,2.6rem)] text-ocean-deep">Customer login</h1>
      <p className="mt-3 text-[0.975rem] leading-relaxed text-muted">
        Sign in to place a pickup order. We save your email, phone, and address only when you
        checkout.
      </p>

      <div className="surface mt-8 p-5 sm:p-6">
        <div className="flex gap-2" role="tablist" aria-label="Login method">
          <button
            type="button"
            role="tab"
            aria-selected={mode === "email"}
            onClick={() => setMode("email")}
            className={`chip ${mode === "email" ? "chip-active" : "chip-idle"}`}
          >
            Email
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === "phone"}
            onClick={() => setMode("phone")}
            className={`chip ${mode === "phone" ? "chip-active" : "chip-idle"}`}
          >
            Phone OTP
          </button>
        </div>

        {mode === "email" ? (
          <form onSubmit={onEmailSubmit} className="mt-6 space-y-4">
            <div>
              <label className="label" htmlFor="email">
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
              <label className="label" htmlFor="password">
                Password
              </label>
              <input
                id="password"
                type="password"
                required
                minLength={6}
                autoComplete="current-password"
                className="input-field"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <button type="submit" className="btn-primary w-full" disabled={loading}>
              {loading ? "Please wait…" : "Sign in / Sign up"}
            </button>
          </form>
        ) : (
          <form onSubmit={otpSent ? verifyOtp : sendOtp} className="mt-6 space-y-4">
            <div>
              <label className="label" htmlFor="phone">
                Phone (India)
              </label>
              <input
                id="phone"
                type="tel"
                required
                inputMode="tel"
                placeholder="9876543210"
                autoComplete="tel"
                className="input-field"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
            {otpSent && (
              <div>
                <label className="label" htmlFor="otp">
                  OTP
                </label>
                <input
                  id="otp"
                  type="text"
                  required
                  inputMode="numeric"
                  className="input-field"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                />
              </div>
            )}
            <button type="submit" className="btn-primary w-full" disabled={loading}>
              {loading ? "Please wait…" : otpSent ? "Verify OTP" : "Send OTP"}
            </button>
          </form>
        )}

        {error && (
          <p className="mt-4 text-sm text-coral" role="alert">
            {error}
          </p>
        )}
        {info && <p className="mt-4 text-sm text-aqua">{info}</p>}
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="p-10 text-muted">Loading…</div>}>
      <LoginForm />
    </Suspense>
  );
}
