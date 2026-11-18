/**
 * SSRF koruması: crawler yalnızca public IP'lere bağlanır.
 * Özel, loopback, link-local, CGNAT, multicast, rezerve aralıklar reddedilir.
 */
function v4ToInt(ip: string): number | null {
  const p = ip.split(".");
  if (p.length !== 4) return null;
  let n = 0;
  for (const x of p) {
    if (!/^\d{1,3}$/.test(x)) return null;
    const v = Number(x);
    if (v > 255) return null;
    n = n * 256 + v;
  }
  return n;
}

const V4_BLOCKED: [string, number][] = [
  ["0.0.0.0", 8],
  ["10.0.0.0", 8],
  ["100.64.0.0", 10],
  ["127.0.0.0", 8],
  ["169.254.0.0", 16],
  ["172.16.0.0", 12],
  ["192.0.0.0", 24],
  ["192.0.2.0", 24],
  ["192.168.0.0", 16],
  ["198.18.0.0", 15],
  ["198.51.100.0", 24],
  ["203.0.113.0", 24],
  ["224.0.0.0", 4],
  ["240.0.0.0", 4],
];

function inV4Range(n: number, base: string, bits: number): boolean {
  const b = v4ToInt(base)!;
  const size = 2 ** (32 - bits);
  return n >= b && n < b + size;
}

export function isPublicIp(ip: string): boolean {
  const v4 = v4ToInt(ip);
  if (v4 !== null) return !V4_BLOCKED.some(([b, bits]) => inV4Range(v4, b, bits));
  const s = ip.toLowerCase().replace(/^\[|\]$/g, "");
  if (!s.includes(":")) return false;
  const mapped = s.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (mapped) return isPublicIp(mapped[1]!);
  if (s === "::" || s === "::1") return false;
  const first = parseInt(s.split(":")[0] || "0", 16);
  if ((first & 0xfe00) === 0xfc00) return false; // fc00::/7 unique local
  if ((first & 0xffc0) === 0xfe80) return false; // fe80::/10 link-local
  if ((first & 0xff00) === 0xff00) return false; // multicast
  if (s.startsWith("2001:db8")) return false; // dokümantasyon
  return true;
}
