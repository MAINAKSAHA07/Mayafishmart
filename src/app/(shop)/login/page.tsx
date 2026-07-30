"use client";

import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/demo-data";
import { Logo } from "@/components/ui/Logo";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useState } from "react";

function emailRedirectTo(nextPath: string) {
  const base =
    typeof window !== "undefined"
      ? window.location.origin
      : process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const next = nextPath.startsWith("/") ? nextPath : "/account";
  return `${base.replace(/\/$/, "")}/auth/callback?next=${encodeURIComponent(next)}`;
}

function friendlyAuthError(message: string, intent: "signin" | "signup") {
  const m = message.toLowerCase();
  if (m.includes("email not confirmed") || m.includes("not confirmed")) {
    return "Confirm your email first — check your inbox (and spam), then sign in.";
  }
  if (m.includes("invalid login credentials") || m.includes("invalid credentials")) {
    return intent === "signin"
      ? "Wrong email or password. Try again, or create an account."
      : message;
  }
  if (m.includes("user already registered") || m.includes("already been registered")) {
    return "That email already has an account. Sign in instead.";
  }
  if (m.includes("password")) {
    return message;
  }
  return message;
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/account";
  const guestHref = next.startsWith("/") && next !== "/login" ? next : "/checkout";
  const cameFromCheckout = next === "/checkout" || next.startsWith("/checkout");
  const [authMode, setAuthMode] = useState<"signin" | "signup">("signin");
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

    if (authMode === "signin") {
      const { error: signError } = await supabase.auth.signInWithPassword({ email, password });
      setLoading(false);
      if (signError) {
        setError(friendlyAuthError(signError.message, "signin"));
        return;
      }
      router.push(next);
      router.refresh();
      return;
    }

    const { data, error: upError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { role: "customer" },
        emailRedirectTo: emailRedirectTo(next),
      },
    });
    setLoading(false);
    if (upError) {
      setError(friendlyAuthError(upError.message, "signup"));
      return;
    }

    // Supabase returns a user with empty identities when email already exists (anti-enumeration)
    const identities = data.user?.identities ?? [];
    if (data.user && identities.length === 0) {
      setError("That email already has an account. Sign in instead.");
      setAuthMode("signin");
      return;
    }

    if (data.session) {
      router.push(next);
      router.refresh();
      return;
    }

    setInfo("Account created. Check your email to confirm, then sign in.");
    setAuthMode("signin");
  }

  async function sendOtp(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
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
      <h1 className="mt-5 text-[clamp(2rem,5vw,2.6rem)] text-ocean-deep">
        {cameFromCheckout ? "Almost there" : authMode === "signup" ? "Create account" : "Sign in"}
      </h1>
      <p className="mt-3 text-[0.975rem] leading-relaxed text-muted">
        {cameFromCheckout
          ? "No account needed to place an order. Continue as guest, or sign in to autofill."
          : "Sign in for order history — or continue as guest to checkout."}
      </p>

      <Link href={guestHref} className="btn-primary mt-6 flex w-full justify-center !py-3.5 text-[1rem]">
        Continue as guest
      </Link>
      <p className="mt-3 text-center text-sm text-muted">Login is optional</p>

      <div className="surface mt-8 p-5 sm:p-6">
        <p className="mb-4 text-sm font-semibold text-ink">Or use your account</p>

        {mode === "email" ? (
          <div className="mb-4 flex gap-2" role="tablist" aria-label="Account action">
            <button
              type="button"
              role="tab"
              aria-selected={authMode === "signin"}
              onClick={() => {
                setAuthMode("signin");
                setError(null);
                setInfo(null);
              }}
              className={`chip ${authMode === "signin" ? "chip-active" : "chip-idle"}`}
            >
              Sign in
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={authMode === "signup"}
              onClick={() => {
                setAuthMode("signup");
                setError(null);
                setInfo(null);
              }}
              className={`chip ${authMode === "signup" ? "chip-active" : "chip-idle"}`}
            >
              Create account
            </button>
          </div>
        ) : null}

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
                autoComplete={authMode === "signup" ? "new-password" : "current-password"}
                className="input-field"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <button type="submit" className="btn-ghost w-full" disabled={loading}>
              {loading
                ? "Please wait…"
                : authMode === "signup"
                  ? "Create account"
                  : "Sign in"}
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
            <button type="submit" className="btn-ghost w-full" disabled={loading}>
              {loading ? "Please wait…" : otpSent ? "Verify OTP" : "Send OTP"}
            </button>
          </form>
        )}

        {error && (
          <p className="mt-4 text-sm text-coral" role="alert">
            {error}
          </p>
        )}
        {info && (
          <p className="mt-4 text-sm text-aqua" role="status">
            {info}
          </p>
        )}
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
