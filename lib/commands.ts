/**
 * Hero komut çubuğu (§1): "/cpm banner", "/sozluk vast", "/reach" ...
 * Saf ayrıştırıcı — hedef URL'i ya da hata mesajını döndürür.
 */
import { TOOLS } from "./calc/tools";
import { normalizeHost } from "./envanter/domain";

export type CommandResult = { ok: true; href: string } | { ok: false; mesaj: string };

const ALIASES: Record<string, string> = {
  sozluk: "/sozluk",
  sözlük: "/sozluk",
  terim: "/sozluk",
  hesapla: "/hesapla",
  reach: "/reach-tahmin",
  frekans: "/reach-tahmin",
  envanter: "/envanter",
  site: "/envanter",
  kitle: "/hedef-kitle",
  "hedef-kitle": "/hedef-kitle",
  rapor: "/rapor",
  mecra: "/mecra",
  spec: "/mecra",
  vcr: "/hesapla/vtr",
  impression: "/hesapla/cpm?bilinmeyen=b",
  butce: "/hesapla/cpm?bilinmeyen=a",
  bütçe: "/hesapla/cpm?bilinmeyen=a",
};

export const ORNEK_KOMUTLAR = ["/cpm", "/reach", "/pacing", "/sozluk vast", "/mecra twitch"];

export function parseCommand(input: string): CommandResult {
  const raw = input.trim();
  if (!raw) return { ok: false, mesaj: "boş komut. dene: /cpm, /sozluk vast" };
  const [head = "", ...rest] = raw.replace(/^\/+/, "").split(/\s+/);
  const cmd = head.toLocaleLowerCase("tr-TR");
  const arg = rest.join(" ").trim();

  if (["sozluk", "sözlük", "terim"].includes(cmd)) {
    return { ok: true, href: arg ? `/sozluk?q=${encodeURIComponent(arg)}` : "/sozluk" };
  }
  if (cmd === "mecra" || cmd === "spec") {
    return { ok: true, href: arg ? `/mecra?q=${encodeURIComponent(arg)}` : "/mecra" };
  }
  if (cmd === "envanter" || cmd === "site") {
    if (!arg) return { ok: true, href: "/envanter" };
    const n = normalizeHost(arg);
    return n ? { ok: true, href: `/envanter/${n.domain}` } : { ok: false, mesaj: `"${arg}" geçerli bir alan adı değil.` };
  }
  const tool = TOOLS.find((t) => t.slug === cmd);
  if (tool) return { ok: true, href: `/hesapla/${tool.slug}` };
  const alias = ALIASES[cmd];
  if (alias) return { ok: true, href: alias };
  // Komut değil, düz metin yazıldıysa sözlükte ara
  if (!raw.startsWith("/")) return { ok: true, href: `/sozluk?q=${encodeURIComponent(raw)}` };
  return { ok: false, mesaj: `"/${cmd}" diye bir komut yok. dene: ${ORNEK_KOMUTLAR.join(", ")}` };
}
