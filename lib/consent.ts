/** Çerez/izin tercihi (tarayıcı tarafı). Değer: "kabul" | "red" | null (sorulmadı). */
export const CONSENT_KEY = "prgturk:consent";
export const CONSENT_EVENT = "prgturk:consent-change";

export function readConsent(): "kabul" | "red" | null {
  try {
    const v = localStorage.getItem(CONSENT_KEY);
    return v === "kabul" || v === "red" ? v : null;
  } catch {
    return null;
  }
}

export function writeConsent(v: "kabul" | "red" | null) {
  try {
    if (v) localStorage.setItem(CONSENT_KEY, v);
    else localStorage.removeItem(CONSENT_KEY);
  } catch {
    /* depolama kapalı */
  }
  window.dispatchEvent(new Event(CONSENT_EVENT));
}

export const thirdPartyConfigured = () => !!(process.env.NEXT_PUBLIC_GA_ID || process.env.NEXT_PUBLIC_ADSENSE_CLIENT);
