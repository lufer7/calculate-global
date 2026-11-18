import "server-only";
import { lookup } from "node:dns/promises";
import { isPublicIp } from "./ip";
import { SITE_URL } from "@/lib/site";

/** Crawl etiği (§4.2c): User-Agent'ta site adı ve iletişim URL'i. */
export const BOT_UA = `PRGTURK-adstxt-bot/1.0 (+${SITE_URL}/bot)`;

export type SafeFetchResult =
  | { ok: true; status: number; body: string; contentType: string; finalUrl: string }
  | { ok: false; status: number | null; neden: "engelli_adres" | "zaman_asimi" | "cok_buyuk" | "http" | "ag" | "yonlendirme" };

async function hostIsPublic(host: string): Promise<boolean> {
  try {
    const addrs = await lookup(host, { all: true });
    return addrs.length > 0 && addrs.every((a) => isPublicIp(a.address));
  } catch {
    return false;
  }
}

/**
 * - yalnızca https/http, public IP'ye çözülen host'lar
 * - en fazla `maxRedirects` yönlendirme ve her adımda IP kontrolü; `allowRedirect(host)` false ise durur
 * - gövde `maxBytes`'ı aşarsa kesilir
 */
export async function safeFetch(
  url: string,
  opts: { maxBytes: number; timeoutMs: number; maxRedirects?: number; allowRedirect?: (host: string) => boolean },
): Promise<SafeFetchResult> {
  let current = new URL(url);
  const deadline = Date.now() + opts.timeoutMs;
  for (let hop = 0; hop <= (opts.maxRedirects ?? 3); hop++) {
    if (!["http:", "https:"].includes(current.protocol)) return { ok: false, status: null, neden: "engelli_adres" };
    if (!(await hostIsPublic(current.hostname))) return { ok: false, status: null, neden: "engelli_adres" };
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), Math.max(1, deadline - Date.now()));
    let res: Response;
    try {
      res = await fetch(current, {
        redirect: "manual",
        signal: ctrl.signal,
        headers: { "user-agent": BOT_UA, accept: "text/plain, application/json;q=0.9, */*;q=0.1" },
        cache: "no-store",
      });
    } catch (e) {
      clearTimeout(timer);
      return { ok: false, status: null, neden: (e as Error).name === "AbortError" ? "zaman_asimi" : "ag" };
    }
    if (res.status >= 300 && res.status < 400) {
      clearTimeout(timer);
      const loc = res.headers.get("location");
      if (!loc) return { ok: false, status: res.status, neden: "yonlendirme" };
      const next = new URL(loc, current);
      if (opts.allowRedirect && !opts.allowRedirect(next.hostname)) return { ok: false, status: res.status, neden: "yonlendirme" };
      current = next;
      continue;
    }
    try {
      const reader = res.body?.getReader();
      const chunks: Uint8Array[] = [];
      let size = 0;
      if (reader) {
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          size += value.byteLength;
          if (size > opts.maxBytes) {
            await reader.cancel();
            return { ok: false, status: res.status, neden: "cok_buyuk" };
          }
          chunks.push(value);
        }
      }
      const body = new TextDecoder("utf-8").decode(Buffer.concat(chunks));
      if (!res.ok) return { ok: false, status: res.status, neden: "http" };
      return { ok: true, status: res.status, body, contentType: res.headers.get("content-type") ?? "", finalUrl: current.toString() };
    } catch (e) {
      return { ok: false, status: res.status, neden: (e as Error).name === "AbortError" ? "zaman_asimi" : "ag" };
    } finally {
      clearTimeout(timer);
    }
  }
  return { ok: false, status: null, neden: "yonlendirme" };
}
