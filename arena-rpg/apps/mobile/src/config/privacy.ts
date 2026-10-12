/**
 * Single place that states what the app may do on the network.
 * Review this file before every release – it is what the privacy notice promises.
 */
export const PRIVACY = {
  /** No analytics, crash-reporting or attribution SDKs are bundled. Keep it that way. */
  analytics: false,
  /** Online features (PvP, ladder, cloud transfer) are OFF until the player turns them on. */
  onlineDefault: false,
  /**
   * Ads are off by default. If enabled later, ONLY with non-personalized / "Limited Ads"
   * configuration and an updated privacy notice + store data-safety labels (see docs/ARCHITECTURE.md §7).
   */
  adsEnabled: false,
} as const;

export const API_BASE_URL = 'https://api.example.invalid';
