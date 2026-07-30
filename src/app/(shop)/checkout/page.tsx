"use client";

import { useCart } from "@/lib/cart/store";
import { formatInr } from "@/lib/money";
import { getPickupSlots } from "@/lib/pickup";
import { isSupabaseConfigured } from "@/lib/demo-data";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";

type Fulfillment = "pickup" | "delivery";

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open: () => void };
  }
}

type FieldErrors = Partial<
  Record<"fullName" | "email" | "phone" | "line1" | "city" | "state" | "pincode", string>
>;

function Field({
  id,
  label,
  error,
  children,
  className = "",
}: {
  id: string;
  label: string;
  error?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className="label" htmlFor={id}>
        {label}
      </label>
      {children}
      {error ? (
        <p className="mt-1.5 text-[0.8125rem] font-medium text-coral" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export default function CheckoutPage() {
  const router = useRouter();
  const { items, subtotalPaise, gstPaise, totalPaise, clear, pruneInvalid } = useCart();
  const slots = useMemo(() => getPickupSlots(), []);
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [line1, setLine1] = useState("");
  const [line2, setLine2] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [pincode, setPincode] = useState("");
  const [pickupSlot, setPickupSlot] = useState(slots[0] ?? "");
  const [fulfillment, setFulfillment] = useState<Fulfillment>("pickup");
  const [paymentMethod, setPaymentMethod] = useState<"razorpay" | "counter">("counter");
  const [couponInput, setCouponInput] = useState("");
  const [appliedCode, setAppliedCode] = useState<string | null>(null);
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [pricing, setPricing] = useState<{
    subtotalPaise: number;
    discountPaise: number;
    taxablePaise: number;
    gstPaise: number;
    totalPaise: number;
  } | null>(null);
  const [deliveryFeePaise, setDeliveryFeePaise] = useState<number | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    pruneInvalid();
    setReady(true);

    try {
      const raw = localStorage.getItem("maya-guest-checkout");
      if (raw) {
        const saved = JSON.parse(raw) as Record<string, string>;
        if (saved.fullName) setFullName(saved.fullName);
        if (saved.email) setEmail(saved.email);
        if (saved.phone) setPhone(saved.phone);
        if (saved.line1) setLine1(saved.line1);
        if (saved.line2) setLine2(saved.line2);
        if (saved.city) setCity(saved.city);
        if (saved.state) setState(saved.state);
        if (saved.pincode) setPincode(saved.pincode);
      }
    } catch {
      /* ignore bad local storage */
    }

    async function prefills() {
      if (!isSupabaseConfigured()) return;
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setIsLoggedIn(false);
        return;
      }
      setIsLoggedIn(true);
      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();
      const { data: address } = await supabase
        .from("customer_addresses")
        .select("*")
        .eq("customer_id", user.id)
        .eq("is_primary", true)
        .maybeSingle();

      if (profile?.full_name) setFullName(profile.full_name);
      if (profile?.email || user.email) setEmail(profile?.email || user.email || "");
      if (profile?.phone || user.phone) setPhone(profile?.phone || user.phone || "");
      if (address) {
        setLine1(address.line1);
        setLine2(address.line2 || "");
        setCity(address.city);
        setState(address.state);
        setPincode(address.pincode);
      }
    }
    prefills();
  }, [pruneInvalid]);

  const cartWeightKg = useMemo(() => {
    return items.reduce((sum, i) => sum + (i.unit === "kg" ? i.qty : i.qty * 0.5), 0);
  }, [items]);

  useEffect(() => {
    if (fulfillment !== "delivery") {
      setDeliveryFeePaise(null);
      setQuoteError(null);
      setQuoteLoading(false);
      return;
    }

    const phoneOk = phone.replace(/\D/g, "").length >= 10;
    const addressOk =
      line1.trim().length >= 3 &&
      city.trim().length >= 2 &&
      state.trim().length >= 2 &&
      /^\d{6}$/.test(pincode.trim());
    if (!phoneOk || !addressOk) {
      setDeliveryFeePaise(null);
      setQuoteError(null);
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setQuoteLoading(true);
      setQuoteError(null);
      try {
        const res = await fetch("/api/delivery/quote", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: controller.signal,
          body: JSON.stringify({
            phone: phone.trim(),
            fullName: fullName.trim() || undefined,
            address: {
              line1: line1.trim(),
              line2: line2.trim() || undefined,
              city: city.trim(),
              state: state.trim(),
              pincode: pincode.trim(),
            },
            totalWeightKg: cartWeightKg > 0 ? cartWeightKg : undefined,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Could not get delivery quote");
        setDeliveryFeePaise(Number(data.deliveryFeePaise) || 0);
      } catch (err) {
        if (controller.signal.aborted) return;
        setDeliveryFeePaise(null);
        setQuoteError(err instanceof Error ? err.message : "Delivery quote failed");
      } finally {
        if (!controller.signal.aborted) setQuoteLoading(false);
      }
    }, 450);

    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [fulfillment, phone, fullName, line1, line2, city, state, pincode, cartWeightKg]);

  function validate(): FieldErrors {
    const next: FieldErrors = {};
    if (fullName.trim().length < 2) next.fullName = "Enter your full name";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) next.email = "Enter a valid email";
    if (phone.replace(/\D/g, "").length < 10) next.phone = "Enter a 10-digit phone number";
    if (line1.trim().length < 3) next.line1 = "Enter your address";
    if (city.trim().length < 2) next.city = "Enter city";
    if (state.trim().length < 2) next.state = "Enter state";
    if (!/^\d{6}$/.test(pincode.trim())) next.pincode = "Enter a 6-digit pincode";
    return next;
  }

  function markTouched(key: string) {
    setTouched((t) => ({ ...t, [key]: true }));
  }

  function showError(key: keyof FieldErrors) {
    return touched[key] ? fieldErrors[key] : undefined;
  }

  async function loadRazorpay() {
    if (window.Razorpay) return true;
    return new Promise<boolean>((resolve) => {
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  }

  async function applyCoupon() {
    setCouponError(null);
    if (!couponInput.trim()) {
      setCouponError("Enter a coupon code");
      return;
    }
    setCouponLoading(true);
    try {
      const res = await fetch("/api/coupons/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: couponInput.trim(),
          items: items.map((i) => ({ productId: i.productId, qty: i.qty })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Invalid coupon");
      setAppliedCode(data.pricing.couponCode);
      setPricing({
        subtotalPaise: data.pricing.subtotalPaise,
        discountPaise: data.pricing.discountPaise,
        taxablePaise: data.pricing.taxablePaise,
        gstPaise: data.pricing.gstPaise,
        totalPaise: data.pricing.totalPaise,
      });
      setCouponInput(data.pricing.couponCode || couponInput);
    } catch (err) {
      setAppliedCode(null);
      setPricing(null);
      setCouponError(err instanceof Error ? err.message : "Invalid coupon");
    } finally {
      setCouponLoading(false);
    }
  }

  function removeCoupon() {
    setAppliedCode(null);
    setPricing(null);
    setCouponInput("");
    setCouponError(null);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    const errors = validate();
    setFieldErrors(errors);
    setTouched({
      fullName: true,
      email: true,
      phone: true,
      line1: true,
      city: true,
      state: true,
      pincode: true,
    });

    if (Object.keys(errors).length) {
      setError("Please fix the highlighted fields.");
      const first = Object.keys(errors)[0];
      document.getElementById(first === "fullName" ? "name" : first)?.focus();
      return;
    }

    if (items.length === 0) {
      setError("Cart is empty.");
      return;
    }
    if (!isSupabaseConfigured()) {
      setError("Connect Supabase to place live orders. Demo catalog is browse-only.");
      return;
    }
    if (fulfillment === "delivery") {
      if (quoteLoading) {
        setError("Wait for the delivery quote to finish.");
        return;
      }
      if (deliveryFeePaise == null || quoteError) {
        setError(quoteError || "Get a valid delivery quote before placing the order.");
        return;
      }
    }

    setLoading(true);
    try {
      const guestDetails = {
        fullName: fullName.trim(),
        email: email.trim(),
        phone: phone.trim(),
        line1: line1.trim(),
        line2: line2.trim(),
        city: city.trim(),
        state: state.trim(),
        pincode: pincode.trim(),
      };
      try {
        localStorage.setItem("maya-guest-checkout", JSON.stringify(guestDetails));
      } catch {
        /* ignore */
      }

      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: items.map((i) => ({
            productId: i.productId,
            qty: i.qty,
          })),
          customer: {
            fullName: guestDetails.fullName,
            email: guestDetails.email,
            phone: guestDetails.phone,
            address: {
              line1: guestDetails.line1,
              line2: guestDetails.line2,
              city: guestDetails.city,
              state: guestDetails.state,
              pincode: guestDetails.pincode,
            },
          },
          fulfillment,
          pickupSlot: fulfillment === "pickup" ? pickupSlot : undefined,
          paymentMethod,
          couponCode: appliedCode || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to place order");
      if (data.borzoWarning) {
        console.warn("borzoWarning", data.borzoWarning);
      }

      const orderPath = `/orders/${data.order.id}?pickup=${encodeURIComponent(data.order.pickup_code)}`;

      if (paymentMethod === "razorpay" && data.razorpay) {
        const ok = await loadRazorpay();
        if (!ok || !window.Razorpay) throw new Error("Unable to load Razorpay");
        const rzp = new window.Razorpay({
          key: data.razorpay.keyId,
          amount: data.razorpay.amount,
          currency: "INR",
          name: "Maya Fish Mart",
          description:
            fulfillment === "delivery"
              ? `Delivery ${data.order.pickup_code}`
              : `Pickup ${data.order.pickup_code}`,
          order_id: data.razorpay.orderId,
          prefill: { name: fullName, email, contact: phone },
          handler: async (response: {
            razorpay_payment_id: string;
            razorpay_order_id: string;
            razorpay_signature: string;
          }) => {
            await fetch("/api/payments/verify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                orderId: data.order.id,
                ...response,
              }),
            });
            clear();
            router.push(orderPath);
          },
        });
        rzp.open();
      } else {
        clear();
        router.push(orderPath);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Checkout failed");
    } finally {
      setLoading(false);
    }
  }

  if (!ready) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-muted" aria-live="polite">
        Loading checkout…
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-xl px-4 py-24 text-center">
        <h1 className="text-[clamp(1.85rem,4vw,2.4rem)] text-ocean-deep">Nothing to checkout</h1>
        <p className="mt-2 text-muted">Add something from today&apos;s catch first.</p>
        <Link href="/catch" className="btn-primary mt-8 inline-flex">
          Browse catch
        </Link>
      </div>
    );
  }

  const gst = pricing?.gstPaise ?? gstPaise();
  const displaySubtotal = pricing?.subtotalPaise ?? subtotalPaise();
  const displayDiscount = pricing?.discountPaise ?? 0;
  const goodsTotal = pricing?.totalPaise ?? totalPaise();
  const feeForTotal = fulfillment === "delivery" ? deliveryFeePaise ?? 0 : 0;
  const displayTotal = goodsTotal + feeForTotal;
  // GST disabled for now
  // const { cgst, sgst } = splitCgstSgst(gst);
  void gst;
  const itemCount = items.length;
  const canPlaceDelivery =
    fulfillment !== "delivery" ||
    (deliveryFeePaise != null && !quoteLoading && !quoteError);

  function inputClass(key: keyof FieldErrors) {
    return `input-field input-checkout ${showError(key) ? "input-invalid" : ""}`;
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-10 sm:px-6 sm:py-14">
      <Link href="/cart" className="nav-hit text-aqua">
        ← Cart
      </Link>

      <header className="mt-5">
        <h1 className="text-[clamp(2rem,5vw,2.6rem)] text-ocean-deep">Checkout</h1>
        <p className="mt-2 max-w-prose text-[0.95rem] leading-relaxed text-muted">
          Pickup at the shop or delivery to your door. Continue as guest — login is optional.
        </p>
        {!isLoggedIn ? (
          <p className="mt-3 rounded-[0.85rem] bg-foam px-4 py-3 text-sm text-ink">
            Continuing as guest. Have an account?{" "}
            <Link href="/login?next=/checkout" className="font-semibold text-ocean underline">
              Sign in
            </Link>{" "}
            to autofill saved details.
          </p>
        ) : (
          <p className="mt-3 text-sm text-aqua">Signed in — your saved details are filled in.</p>
        )}
      </header>

      <form noValidate onSubmit={onSubmit} className="mt-8 space-y-4">
        {/* Fulfillment */}
        <section className="surface-solid overflow-hidden">
          <div className="border-b border-[var(--line)] px-5 py-4 sm:px-6">
            <h2 className="text-[1.05rem] font-semibold tracking-[-0.015em] text-ink">
              How you get it
            </h2>
          </div>
          <div className="px-5 py-5 sm:px-6">
            <div
              className="grid grid-cols-2 gap-2"
              role="radiogroup"
              aria-label="Pickup or delivery"
            >
              {(
                [
                  ["pickup", "Pickup"],
                  ["delivery", "Delivery"],
                ] as const
              ).map(([value, label]) => {
                const active = fulfillment === value;
                return (
                  <button
                    key={value}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => setFulfillment(value)}
                    className={`pressable rounded-[0.85rem] border px-3 py-3 text-left text-sm font-semibold transition-[background,border-color,color] ${
                      active
                        ? "border-ocean bg-ocean text-white"
                        : "border-[var(--line)] bg-white text-ink hover:bg-foam/60"
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        {/* Contact */}
        <section className="surface-solid overflow-hidden">
          <div className="border-b border-[var(--line)] px-5 py-4 sm:px-6">
            <h2 className="text-[1.05rem] font-semibold tracking-[-0.015em] text-ink">
              Contact
            </h2>
            <p className="mt-0.5 text-[0.8125rem] text-muted">
              {fulfillment === "delivery"
                ? "How we reach you about this delivery"
                : "How we reach you about this pickup"}
            </p>
          </div>
          <div className="space-y-4 px-5 py-5 sm:px-6">
            <Field id="name" label="Full name" error={showError("fullName")}>
              <input
                id="name"
                name="name"
                autoComplete="name"
                className={inputClass("fullName")}
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                onBlur={() => {
                  markTouched("fullName");
                  setFieldErrors(validate());
                }}
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field id="email" label="Email" error={showError("email")}>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  inputMode="email"
                  className={inputClass("email")}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onBlur={() => {
                    markTouched("email");
                    setFieldErrors(validate());
                  }}
                />
              </Field>
              <Field id="phone" label="Phone" error={showError("phone")}>
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  autoComplete="tel"
                  inputMode="tel"
                  className={inputClass("phone")}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  onBlur={() => {
                    markTouched("phone");
                    setFieldErrors(validate());
                  }}
                />
              </Field>
            </div>
          </div>
        </section>

        {/* Address */}
        <section className="surface-solid overflow-hidden">
          <div className="border-b border-[var(--line)] px-5 py-4 sm:px-6">
            <h2 className="text-[1.05rem] font-semibold tracking-[-0.015em] text-ink">
              {fulfillment === "delivery" ? "Delivery address" : "Address"}
            </h2>
            <p className="mt-0.5 text-[0.8125rem] text-muted">
              {fulfillment === "delivery"
                ? "Courier delivers from our Manpada shop to this address"
                : "For your customer record — not for delivery"}
            </p>
          </div>
          <div className="space-y-4 px-5 py-5 sm:px-6">
            <Field id="line1" label="Street address" error={showError("line1")}>
              <input
                id="line1"
                name="line1"
                autoComplete="address-line1"
                className={inputClass("line1")}
                value={line1}
                onChange={(e) => setLine1(e.target.value)}
                onBlur={() => {
                  markTouched("line1");
                  setFieldErrors(validate());
                }}
              />
            </Field>
            <Field id="line2" label="Apartment, landmark (optional)">
              <input
                id="line2"
                name="line2"
                autoComplete="address-line2"
                className="input-field input-checkout"
                value={line2}
                onChange={(e) => setLine2(e.target.value)}
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field id="city" label="City" error={showError("city")}>
                <input
                  id="city"
                  name="city"
                  autoComplete="address-level2"
                  className={inputClass("city")}
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  onBlur={() => {
                    markTouched("city");
                    setFieldErrors(validate());
                  }}
                />
              </Field>
              <Field id="state" label="State" error={showError("state")}>
                <input
                  id="state"
                  name="state"
                  autoComplete="address-level1"
                  className={inputClass("state")}
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  onBlur={() => {
                    markTouched("state");
                    setFieldErrors(validate());
                  }}
                />
              </Field>
            </div>
            <Field id="pincode" label="Pincode" error={showError("pincode")} className="sm:max-w-[10rem]">
              <input
                id="pincode"
                name="pincode"
                inputMode="numeric"
                autoComplete="postal-code"
                maxLength={6}
                className={inputClass("pincode")}
                value={pincode}
                onChange={(e) => setPincode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                onBlur={() => {
                  markTouched("pincode");
                  setFieldErrors(validate());
                }}
              />
            </Field>
          </div>
        </section>

        {/* Pickup & pay */}
        <section className="surface-solid overflow-hidden">
          <div className="border-b border-[var(--line)] px-5 py-4 sm:px-6">
            <h2 className="text-[1.05rem] font-semibold tracking-[-0.015em] text-ink">
              {fulfillment === "delivery" ? "Delivery & payment" : "Pickup & payment"}
            </h2>
          </div>
          <div className="space-y-5 px-5 py-5 sm:px-6">
            {fulfillment === "pickup" ? (
              <div>
                <label className="label" htmlFor="slot">
                  Pickup window
                </label>
                <select
                  id="slot"
                  className="input-field input-checkout"
                  value={pickupSlot}
                  onChange={(e) => setPickupSlot(e.target.value)}
                >
                  {slots.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <p className="text-sm leading-relaxed text-muted">
                Same-day courier from Manpada. Fee is quoted after you enter your address.
                {quoteLoading ? " Getting quote…" : null}
              </p>
            )}

            {fulfillment === "delivery" && quoteError ? (
              <p className="text-sm font-medium text-coral" role="alert">
                {quoteError}
              </p>
            ) : null}

            <div>
              <p className="label" id="pay-label">
                Payment method
              </p>
              <div
                className="grid grid-cols-2 gap-2"
                role="radiogroup"
                aria-labelledby="pay-label"
              >
                {(
                  [
                    [
                      "counter",
                      fulfillment === "delivery" ? "Pay later" : "Pay at counter",
                    ],
                    ["razorpay", "Pay online"],
                  ] as const
                ).map(([value, label]) => {
                  const active = paymentMethod === value;
                  return (
                    <button
                      key={value}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      onClick={() => setPaymentMethod(value)}
                      className={`pressable rounded-[0.85rem] border px-3 py-3 text-left text-sm font-semibold transition-[background,border-color,color] ${
                        active
                          ? "border-ocean bg-ocean text-white"
                          : "border-[var(--line)] bg-white text-ink hover:bg-foam/60"
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        {/* Summary — solid dark for hierarchy, not stacked glass */}
        <section className="rounded-[1.25rem] bg-ocean-deep p-5 text-foam sm:p-6">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="text-[1.05rem] font-semibold tracking-[-0.015em] text-white">
              Order summary
            </h2>
            <p className="text-[0.8125rem] text-foam/60">
              {itemCount} {itemCount === 1 ? "item" : "items"}
            </p>
          </div>
          <ul className="mt-4 space-y-2 border-b border-white/12 pb-4 text-sm text-foam/80">
            {items.map((item) => (
              <li key={item.productId} className="flex justify-between gap-3">
                <span>
                  {item.name}{" "}
                  <span className="text-foam/50">
                    × {item.qty} {item.unit}
                  </span>
                </span>
                <span className="shrink-0 tabular-nums">
                  {formatInr(Math.round(item.qty * item.pricePaise))}
                </span>
              </li>
            ))}
          </ul>

          <div className="mt-4 flex gap-2">
            <input
              value={couponInput}
              onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
              placeholder="Coupon code"
              disabled={!!appliedCode || couponLoading}
              className="input-field flex-1 !bg-white/10 !text-white placeholder:text-foam/40"
              aria-label="Coupon code"
            />
            {appliedCode ? (
              <button
                type="button"
                onClick={removeCoupon}
                className="pressable rounded-full bg-white/15 px-4 py-2 text-sm font-semibold text-foam"
              >
                Remove
              </button>
            ) : (
              <button
                type="button"
                onClick={applyCoupon}
                disabled={couponLoading}
                className="pressable rounded-full bg-aqua px-4 py-2 text-sm font-semibold text-ocean-deep disabled:opacity-50"
              >
                {couponLoading ? "…" : "Apply"}
              </button>
            )}
          </div>
          {couponError && (
            <p className="mt-2 text-sm text-coral" role="alert">
              {couponError}
            </p>
          )}
          {appliedCode && !couponError && (
            <p className="mt-2 text-sm text-aqua" role="status">
              Applied {appliedCode}
            </p>
          )}

          <div className="mt-4 space-y-1.5 text-sm">
            <div className="flex justify-between text-foam/75">
              <span>Subtotal</span>
              <span className="tabular-nums">{formatInr(displaySubtotal)}</span>
            </div>
            {displayDiscount > 0 && (
              <div className="flex justify-between text-aqua">
                <span>Discount{appliedCode ? ` (${appliedCode})` : ""}</span>
                <span className="tabular-nums">−{formatInr(displayDiscount)}</span>
              </div>
            )}
            {fulfillment === "delivery" && (
              <div className="flex justify-between text-foam/75">
                <span>Delivery</span>
                <span className="tabular-nums">
                  {quoteLoading
                    ? "…"
                    : deliveryFeePaise != null
                      ? formatInr(deliveryFeePaise)
                      : "—"}
                </span>
              </div>
            )}
            {/* GST disabled for now
            <div className="flex justify-between text-foam/65">
              <span>CGST</span>
              <span className="tabular-nums">{formatInr(cgst)}</span>
            </div>
            <div className="flex justify-between text-foam/65">
              <span>SGST</span>
              <span className="tabular-nums">{formatInr(sgst)}</span>
            </div>
            */}
            <div className="flex justify-between pt-2 text-[1.125rem] font-semibold tracking-[-0.015em] text-white">
              <span>Total</span>
              <span className="tabular-nums">{formatInr(displayTotal)}</span>
            </div>
          </div>
        </section>

        {error && (
          <p
            className="rounded-[0.85rem] bg-coral/10 px-4 py-3 text-sm font-medium text-coral"
            role="alert"
          >
            {error}
          </p>
        )}

        <button
          type="submit"
          className="btn-primary w-full !py-3.5 text-[1rem]"
          disabled={loading || !canPlaceDelivery}
        >
          {loading
            ? "Placing order…"
            : fulfillment === "delivery"
              ? "Place delivery order"
              : "Place pickup order"}
        </button>
      </form>
    </div>
  );
}
