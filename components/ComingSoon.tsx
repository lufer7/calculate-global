import Link from "next/link";
import { PageHeader } from "./PageHeader";

/** Henüz yapılmamış modüller için dürüst bir "yapım aşamasında" sayfası. */
export function ComingSoon({
  etiket,
  baslik,
  aciklama,
  faz,
  maddeler,
  sistem,
}: {
  etiket: string;
  baslik: string;
  aciklama: string;
  faz: string;
  maddeler: string[];
  sistem: string;
}) {
  return (
    <>
      <PageHeader etiket={etiket} baslik={baslik} sistem={sistem}>
        <p>{aciklama}</p>
      </PageHeader>
      <div className="mx-auto max-w-6xl px-4 py-10">
        <div className="card max-w-2xl p-6">
          <p className="label">
            // durum: <span className="text-accent">{faz}</span>
          </p>
          <p className="mt-3 text-sm text-muted">Bu modül yapım aşamasında. Geldiğinde şunları yapacak:</p>
          <ul className="mt-4 space-y-2">
            {maddeler.map((m) => (
              <li key={m} className="flex gap-3 text-sm text-text">
                <span aria-hidden="true" className="font-mono text-accent">
                  &gt;
                </span>
                {m}
              </li>
            ))}
          </ul>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/hesapla" className="btn btn-primary">
              Metrik Hesapla&apos;ya git
            </Link>
            <Link href="/sozluk" className="btn">
              Sözlüğe bak
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
