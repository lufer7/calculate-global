"use client";

import { useActionState } from "react";
import type { ActionState } from "./actions";

export function ActionForm({
  action,
  children,
  submit = "kaydet",
}: {
  action: (s: ActionState, f: FormData) => Promise<ActionState>;
  children: React.ReactNode;
  submit?: string;
}) {
  const [state, formAction, pending] = useActionState(action, null);
  return (
    <form action={formAction} className="card space-y-4 p-5">
      <div className="grid gap-4 sm:grid-cols-2">{children}</div>
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" className="btn btn-primary" disabled={pending}>
          {pending ? "kaydediliyor..." : submit}
        </button>
        {state && (
          <p role="status" className={`text-sm ${state.ok ? "up" : "down"}`}>
            {state.ok ? "■" : "▲"} {state.mesaj}
          </p>
        )}
      </div>
    </form>
  );
}

export function Field({
  name,
  label,
  hint,
  full,
  children,
}: {
  name: string;
  label: string;
  hint?: string;
  full?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <div className={full ? "sm:col-span-2" : undefined}>
      <label htmlFor={name} className="label">
        {label}
      </label>
      <div className="mt-2">{children ?? <input id={name} name={name} className="input" autoComplete="off" />}</div>
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </div>
  );
}
