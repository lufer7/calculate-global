"use client";

import { useRouter } from "next/navigation";
import { useId, useState } from "react";
import { ORNEK_KOMUTLAR, parseCommand } from "@/lib/commands";

export function PromptBar({ autoFocus = false, placeholder = "/cpm  ·  /sozluk vast  ·  /pacing" }: { autoFocus?: boolean; placeholder?: string }) {
  const router = useRouter();
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const id = useId();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const r = parseCommand(value);
    if (r.ok) {
      setError(null);
      router.push(r.href);
    } else setError(r.mesaj);
  }

  return (
    <form onSubmit={submit} role="search" className="w-full">
      <label htmlFor={id} className="label">
        // komut
      </label>
      <div className="mt-2 flex items-center gap-2 rounded-card border border-border bg-panel px-3 focus-within:border-accent">
        <span aria-hidden="true" className="font-mono text-lg text-accent">
          &gt;
        </span>
        <input
          id={id}
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setError(null);
          }}
          autoFocus={autoFocus}
          autoComplete="off"
          autoCapitalize="off"
          spellCheck={false}
          placeholder={placeholder}
          aria-describedby={`${id}-hint`}
          className="min-h-12 flex-1 bg-transparent font-mono text-[15px] text-text outline-none placeholder:text-muted/60"
        />
        <button type="submit" className="btn btn-primary min-h-9 px-3 text-xs">
          çalıştır
        </button>
      </div>
      <p id={`${id}-hint`} className="syslog mt-2" aria-live="polite">
        {error ?? `komutlar: ${ORNEK_KOMUTLAR.join("  ")}`}
      </p>
    </form>
  );
}
