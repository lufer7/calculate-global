import { deleteRow } from "@/app/admin/actions";

export function DeleteButton({ tablo, id }: { tablo: string; id: number }) {
  return (
    <form action={deleteRow}>
      <input type="hidden" name="tablo" value={tablo} />
      <input type="hidden" name="id" value={id} />
      <button type="submit" className="btn min-h-9 px-2 text-[11px] text-down" aria-label={`${id} numaralı satırı sil`}>
        sil
      </button>
    </form>
  );
}
