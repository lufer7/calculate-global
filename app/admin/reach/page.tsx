import { asc, desc } from "drizzle-orm";
import { reachSettings, REACH_KANALLAR, universeRefs } from "@/db/schema";
import { getDb } from "@/lib/db";
import { formatNumber } from "@/lib/calc/number";
import { formatDate } from "@/lib/format-date";
import { DeleteButton } from "@/components/admin/DeleteButton";
import { addReachSetting, addUniverse } from "../actions";
import { ActionForm, Field } from "../ui";

export default async function AdminReach() {
  const db = getDb()!;
  const [refs, sets] = await Promise.all([
    db.select().from(universeRefs).orderBy(asc(universeRefs.hedefKitleTanimi)),
    db.select().from(reachSettings).orderBy(desc(reachSettings.tarih)),
  ]);
  const today = new Date().toISOString().slice(0, 10);
  return (
    <div className="space-y-12">
      <section className="space-y-4">
        <h1 className="text-2xl font-semibold">Türkiye universe referansları</h1>
        <p className="max-w-3xl text-sm text-muted">
          Toplam internet kullanıcısı, mobil, CTV erişimi, yaş/cinsiyet kırılımı. Her satırda kaynak ve tarih zorunlu (TÜİK, IAB Türkiye, We Are
          Social/Meltwater gibi public kaynaklar). Tablo boşken araç &ldquo;universe değerini sen gir&rdquo; modunda çalışır — uydurma sayı yazma.
        </p>
        <ActionForm action={addUniverse} submit="referans ekle">
          <Field name="hedefKitleTanimi" label="hedef kitle tanımı" hint="örn. Türkiye, 16+ internet kullanıcısı" />
          <Field name="buyukluk" label="büyüklük (kişi)" />
          <Field name="kaynak" label="kaynak" hint="yayın adı ve yılı" />
          <Field name="kaynakUrl" label="kaynak URL (opsiyonel)" />
          <Field name="tarih" label="verinin tarihi">
            <input id="tarih" name="tarih" type="date" required className="input" />
          </Field>
        </ActionForm>
        <ul className="space-y-2">
          {refs.map((r) => (
            <li key={r.id} className="card flex items-center justify-between gap-4 p-3 text-sm">
              <span>
                <span className="text-text">{r.hedefKitleTanimi}</span> <span className="num font-mono text-accent">{formatNumber(r.buyukluk, 0)}</span>
                <span className="block text-xs text-muted">
                  {r.kaynak} · {formatDate(r.tarih)}
                </span>
              </span>
              <DeleteButton tablo="universe" id={r.id} />
            </li>
          ))}
        </ul>
      </section>
      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Reach model parametreleri</h2>
        <p className="max-w-3xl text-sm text-muted">
          <strong className="text-text">r</strong> (negatif binom yoğunlaşma): boş = Poisson. Küçük r, gösterimlerin aynı kişilerde yoğunlaştığını
          varsayar ve 1+ reach&apos;i düşürür. <strong className="text-text">erişilebilir oran</strong>: universe&apos;ün bu kanaldan ulaşılabilir kısmı
          (0–1). Editöryel ayardır; metot notu zorunlu. Kanal ayarı yoksa &ldquo;genel&rdquo; ayar, o da yoksa saf Poisson kullanılır.
        </p>
        <ActionForm action={addReachSetting} submit="ayar ekle">
          <Field name="kanal" label="kanal">
            <select id="kanal" name="kanal" className="input">
              {REACH_KANALLAR.map((k) => (
                <option key={k}>{k}</option>
              ))}
            </select>
          </Field>
          <Field name="nbdR" label="r (opsiyonel)" hint="örn. 2" />
          <Field name="erisilebilirOran" label="erişilebilir oran" hint="0–1, örn. 0,85" />
          <Field name="tarih" label="tarih">
            <input id="tarih" name="tarih" type="date" required defaultValue={today} className="input" />
          </Field>
          <Field name="metotNotu" label="metot notu" full>
            <textarea id="metotNotu" name="metotNotu" required minLength={20} rows={3} className="input py-2" />
          </Field>
        </ActionForm>
        <ul className="space-y-2">
          {sets.map((s) => (
            <li key={s.id} className="card flex items-start justify-between gap-4 p-3 text-sm">
              <span>
                <span className="font-mono text-text">
                  {s.kanal} · r={s.nbdR ?? "Poisson"} · oran={s.erisilebilirOran}
                </span>
                <span className="block text-xs text-muted">
                  {formatDate(s.tarih)} · {s.metotNotu}
                </span>
              </span>
              <DeleteButton tablo="reach" id={s.id} />
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
