"use client";

import { createBrowserClient } from "@supabase/ssr";
import { useState } from "react";

export function LoginForm({ url, anonKey }: { url: string; anonKey: string }) {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"bos" | "gonderiliyor" | "gonderildi" | "hata">("bos");
  const [msg, setMsg] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setState("gonderiliyor");
    const supabase = createBrowserClient(url, anonKey);
    const next = new URLSearchParams(window.location.search).get("next") ?? "/hesabim";
    const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "/hesabim";
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(safeNext)}`, shouldCreateUser: true },
    });
    if (error) {
      setState("hata");
      setMsg(error.message);
    } else setState("gonderildi");
  }

  if (state === "gonderildi") {
    return <p className="syslog">link gönderildi. gelen kutusuna bak; spam klasörü de sayılır.</p>;
  }
  return (
    <form onSubmit={submit} className="card space-y-4 p-5">
      <div>
        <label htmlFor="email" className="label">
          e-posta
        </label>
        <input
          id="email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="input mt-2"
        />
      </div>
      <button type="submit" className="btn btn-primary w-full" disabled={state === "gonderiliyor"}>
        {state === "gonderiliyor" ? "gönderiliyor..." : "magic link gönder"}
      </button>
      {state === "hata" && (
        <p role="alert" className="text-sm text-down">
          ▲ {msg}
        </p>
      )}
    </form>
  );
}
