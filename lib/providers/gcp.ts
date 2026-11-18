import "server-only";
import { createSign } from "node:crypto";

/**
 * KİŞİSEL GCP projesine BigQuery REST erişimi (bağımlılıksız, servis hesabı JWT ile).
 * §0: ajansın GCP projesi / servis hesabı ASLA kullanılmaz.
 */
type ServiceAccount = { client_email: string; private_key: string };

export function gcpConfigured(): boolean {
  return !!process.env.GCP_PROJECT_ID && !!process.env.GCP_SERVICE_ACCOUNT_JSON;
}

function sa(): ServiceAccount {
  const raw = process.env.GCP_SERVICE_ACCOUNT_JSON!;
  const json = raw.trim().startsWith("{") ? raw : Buffer.from(raw, "base64").toString("utf8");
  return JSON.parse(json) as ServiceAccount;
}

const b64u = (b: Buffer | string) => Buffer.from(b).toString("base64url");

async function accessToken(): Promise<string> {
  const { client_email, private_key } = sa();
  const now = Math.floor(Date.now() / 1000);
  const header = b64u(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claim = b64u(
    JSON.stringify({ iss: client_email, scope: "https://www.googleapis.com/auth/bigquery.readonly", aud: "https://oauth2.googleapis.com/token", iat: now, exp: now + 3600 }),
  );
  const signer = createSign("RSA-SHA256");
  signer.update(`${header}.${claim}`);
  const jwt = `${header}.${claim}.${b64u(signer.sign(private_key))}`;
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: jwt }),
  });
  if (!res.ok) throw new Error(`GCP token alınamadı: ${res.status}`);
  return ((await res.json()) as { access_token: string }).access_token;
}

/** Sorguyu çalıştırır, sonuçları sayfa sayfa döndürür. */
export async function* bigQueryRows(query: string, params: Record<string, number>): AsyncGenerator<unknown[]> {
  const project = process.env.GCP_PROJECT_ID!;
  const token = await accessToken();
  const h = { authorization: `Bearer ${token}`, "content-type": "application/json" };
  const start = await fetch(`https://bigquery.googleapis.com/bigquery/v2/projects/${project}/queries`, {
    method: "POST",
    headers: h,
    body: JSON.stringify({
      query,
      useLegacySql: false,
      timeoutMs: 60000,
      maxResults: 50000,
      parameterMode: "NAMED",
      queryParameters: Object.entries(params).map(([name, v]) => ({ name, parameterType: { type: "INT64" }, parameterValue: { value: String(v) } })),
    }),
  });
  if (!start.ok) throw new Error(`BigQuery sorgusu başarısız: ${start.status} ${(await start.text()).slice(0, 200)}`);
  type Page = { jobComplete: boolean; jobReference: { jobId: string; location?: string }; rows?: { f: { v: unknown }[] }[]; pageToken?: string };
  let page = (await start.json()) as Page;
  const { jobId, location } = page.jobReference;
  for (;;) {
    if (page.jobComplete) for (const r of page.rows ?? []) yield r.f.map((c) => c.v);
    if (page.jobComplete && !page.pageToken) return;
    const q = new URLSearchParams({ maxResults: "50000", timeoutMs: "60000", ...(location ? { location } : {}), ...(page.pageToken ? { pageToken: page.pageToken } : {}) });
    const next = await fetch(`https://bigquery.googleapis.com/bigquery/v2/projects/${project}/queries/${jobId}?${q}`, { headers: h });
    if (!next.ok) throw new Error(`BigQuery sonuç sayfası alınamadı: ${next.status}`);
    page = (await next.json()) as Page;
  }
}
