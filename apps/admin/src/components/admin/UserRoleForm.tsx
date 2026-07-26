"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

export function UserRoleForm() {
  const router = useRouter();
  const [msg, setMsg] = useState<string | null>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMsg(null);
    const form = new FormData(e.currentTarget);
    const res = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: form.get("email"),
        role: form.get("role"),
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setMsg(data.error || "Failed");
      return;
    }
    setMsg("Role updated");
    e.currentTarget.reset();
    router.refresh();
  }

  return (
    <form
      onSubmit={onSubmit}
      className="mt-6 grid gap-3 rounded-2xl bg-white/5 p-4 ring-1 ring-white/10 sm:grid-cols-3"
    >
      <input
        name="email"
        type="email"
        required
        placeholder="staff@email.com"
        className="input-field bg-white text-ink"
      />
      <select name="role" className="input-field bg-white text-ink" defaultValue="staff">
        <option value="manager">Manager</option>
        <option value="staff">Staff</option>
        <option value="viewer">Viewer</option>
        <option value="owner">Owner</option>
      </select>
      <button type="submit" className="rounded-full bg-coral px-4 py-2 text-sm font-semibold text-white">
        Assign role
      </button>
      {msg && <p className="text-sm text-aqua sm:col-span-3">{msg}</p>}
    </form>
  );
}
