/**
 * ads.txt ayrıştırıcı — IAB Tech Lab ads.txt 1.1 spesifikasyonuna göre.
 * Satır: <reklam sistemi alan adı>, <satıcı hesap kimliği>, <DIRECT|RESELLER>[, <sertifika kimliği>]
 * Değişkenler: contact=, subdomain=, inventorypartnerdomain=, ownerdomain=, managerdomain=
 * Saf fonksiyon; ağ erişimi yok.
 */

export type AdsTxtRecord = {
  ssp: string; // reklam sistemi alan adı (küçük harf)
  sellerId: string;
  iliski: "DIRECT" | "RESELLER";
  certId: string | null;
  satir: number;
};

export type AdsTxtResult = {
  kayitlar: AdsTxtRecord[];
  degiskenler: { ad: string; deger: string }[];
  hatalar: { satir: number; metin: string; neden: string }[];
};

const DOMAIN_RE = /^(?=.{1,253}$)([a-z0-9](-*[a-z0-9])*)(\.[a-z0-9](-*[a-z0-9])*)+$/;
const VARIABLES = new Set(["contact", "subdomain", "inventorypartnerdomain", "ownerdomain", "managerdomain"]);

export function parseAdsTxt(text: string): AdsTxtResult {
  const out: AdsTxtResult = { kayitlar: [], degiskenler: [], hatalar: [] };
  const seen = new Set<string>();
  const lines = text.replace(/^﻿/, "").split(/\r\n|\r|\n/);
  lines.forEach((raw, i) => {
    const satir = i + 1;
    const line = raw.split("#")[0]!.trim();
    if (!line) return;
    const eq = line.match(/^([A-Za-z]+)\s*=\s*(.+)$/);
    if (eq && !line.includes(",")) {
      const ad = eq[1]!.toLowerCase();
      if (VARIABLES.has(ad)) out.degiskenler.push({ ad, deger: eq[2]!.trim() });
      else out.hatalar.push({ satir, metin: raw, neden: "bilinmeyen değişken" });
      return;
    }
    const parts = line.split(",").map((p) => p.trim());
    if (parts.length < 3) {
      out.hatalar.push({ satir, metin: raw, neden: "eksik alan" });
      return;
    }
    const ssp = parts[0]!.toLowerCase();
    const sellerId = parts[1]!;
    const rel = parts[2]!.toUpperCase();
    if (!DOMAIN_RE.test(ssp)) {
      out.hatalar.push({ satir, metin: raw, neden: "geçersiz reklam sistemi alan adı" });
      return;
    }
    if (!sellerId) {
      out.hatalar.push({ satir, metin: raw, neden: "boş satıcı kimliği" });
      return;
    }
    if (rel !== "DIRECT" && rel !== "RESELLER") {
      out.hatalar.push({ satir, metin: raw, neden: "ilişki DIRECT ya da RESELLER olmalı" });
      return;
    }
    const key = `${ssp}|${sellerId}|${rel}`;
    if (seen.has(key)) return; // tekrar eden satırlar tek sayılır
    seen.add(key);
    out.kayitlar.push({ ssp, sellerId, iliski: rel, certId: parts[3] ? parts[3] : null, satir });
  });
  return out;
}

export type AdsTxtOzet = {
  sspSayisi: number;
  seatSayisi: number;
  direct: number;
  reseller: number;
  ssp: { ssp: string; direct: number; reseller: number; seat: number }[];
};

export function summarizeAdsTxt(kayitlar: AdsTxtRecord[]): AdsTxtOzet {
  const by = new Map<string, { direct: number; reseller: number; seats: Set<string> }>();
  for (const k of kayitlar) {
    const e = by.get(k.ssp) ?? { direct: 0, reseller: 0, seats: new Set<string>() };
    if (k.iliski === "DIRECT") e.direct++;
    else e.reseller++;
    e.seats.add(k.sellerId);
    by.set(k.ssp, e);
  }
  const ssp = [...by.entries()]
    .map(([s, e]) => ({ ssp: s, direct: e.direct, reseller: e.reseller, seat: e.seats.size }))
    .sort((a, b) => b.direct - a.direct || b.seat - a.seat || a.ssp.localeCompare(b.ssp));
  return {
    sspSayisi: ssp.length,
    seatSayisi: ssp.reduce((a, s) => a + s.seat, 0),
    direct: kayitlar.filter((k) => k.iliski === "DIRECT").length,
    reseller: kayitlar.filter((k) => k.iliski === "RESELLER").length,
    ssp,
  };
}
