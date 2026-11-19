"use client";

import { useRouter } from "next/navigation";

export function DeletePreset({ id }: { id: number }) {
  const router = useRouter();
  return (
    <button
      type="button"
      className="btn min-h-9 shrink-0 px-2 text-[11px] text-down"
      aria-label="Kaydı sil"
      onClick={async () => {
        await fetch(`/api/presets?id=${id}`, { method: "DELETE" });
        router.refresh();
      }}
    >
      sil
    </button>
  );
}
