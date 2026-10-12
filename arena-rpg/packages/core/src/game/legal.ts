/** Shared by server and app; bump when the texts change so players re-accept them. */
export const LEGAL_VERSIONS = { terms: '2026-10-13', privacy: '2026-10-13' } as const;

/** Minimum age confirmed at sign-up (checkbox; no birth date is collected). */
export const MIN_AGE = 16;

/**
 * Storage and destruction periods ("Saklama ve İmha Politikası").
 * The retention job enforces exactly these numbers and the privacy notice quotes them,
 * so text and behaviour cannot drift apart.
 */
export const RETENTION = {
  /** Sign-ups that never verified their email. */
  pendingAccountDays: 7,
  /** No activity for this long → warning email. */
  inactiveWarnDays: 700,
  /** No activity for this long and warned at least `warnGraceDays` ago → account deleted. */
  inactiveDeleteDays: 730,
  warnGraceDays: 30,
  /** Expedition/research reports in the in-game inbox (also finished keşif/raid records, banner activity log and help records). */
  reportsDays: 90,
  /** Owner notifications ("new member", "new fighter"). */
  adminNotificationsDays: 90,
  /** Admin audit log (accountability for access to personal data). */
  auditDays: 730,
  /** KVKK applications, counted from the answer date. */
  dataRequestsDays: 730,
  /** Statutory answer deadline for KVKK applications (md. 13). */
  dataRequestAnswerDays: 30,
} as const;
