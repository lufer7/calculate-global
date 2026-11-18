/**
 * sellers.json ayrıştırma ve ads.txt satırlarının doğrulanması (IAB Tech Lab sellers.json 1.0).
 * DIRECT ↔ seller_type PUBLISHER/BOTH, RESELLER ↔ INTERMEDIARY/BOTH.
 */
import type { AdsTxtRecord } from "./parse";

export type Seller = {
  sellerId: string;
  sellerType: "PUBLISHER" | "INTERMEDIARY" | "BOTH";
  name: string | null;
  domain: string | null;
  gizli: boolean;
};

export function parseSellersJson(json: unknown): Seller[] | null {
  if (!json || typeof json !== "object" || !Array.isArray((json as { sellers?: unknown }).sellers)) return null;
  const out: Seller[] = [];
  for (const s of (json as { sellers: unknown[] }).sellers) {
    if (!s || typeof s !== "object") continue;
    const o = s as Record<string, unknown>;
    const id = o.seller_id;
    const type = typeof o.seller_type === "string" ? o.seller_type.toUpperCase() : "";
    if ((typeof id !== "string" && typeof id !== "number") || !["PUBLISHER", "INTERMEDIARY", "BOTH"].includes(type)) continue;
    out.push({
      sellerId: String(id),
      sellerType: type as Seller["sellerType"],
      name: typeof o.name === "string" ? o.name : null,
      domain: typeof o.domain === "string" ? o.domain.toLowerCase() : null,
      gizli: o.is_confidential === 1 || o.is_confidential === true,
    });
  }
  return out;
}

export type Dogrulama = "dogrulandi" | "bulunamadi" | "tip_uyusmuyor" | "alan_adi_uyusmuyor" | "gizli";

/**
 * Bir ads.txt satırını SSP'nin sellers.json'ı ile karşılaştırır.
 * Alan adı kontrolü yalnızca PUBLISHER kayıtları için yapılır (aracıların domain'i başkadır).
 */
export function verifyRecord(rec: AdsTxtRecord, sellers: Map<string, Seller>, yayinciDomain: string): Dogrulama {
  const s = sellers.get(rec.sellerId);
  if (!s) return "bulunamadi";
  const tipOk = rec.iliski === "DIRECT" ? s.sellerType !== "INTERMEDIARY" : s.sellerType !== "PUBLISHER";
  if (!tipOk) return "tip_uyusmuyor";
  if (s.gizli) return "gizli";
  if (rec.iliski === "DIRECT" && s.sellerType === "PUBLISHER" && s.domain && s.domain !== yayinciDomain && !yayinciDomain.endsWith(`.${s.domain}`)) {
    return "alan_adi_uyusmuyor";
  }
  return "dogrulandi";
}

export function indexSellers(list: Seller[]): Map<string, Seller> {
  return new Map(list.map((s) => [s.sellerId, s]));
}
