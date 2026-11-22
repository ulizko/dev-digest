import type { FindingActionKind, Severity, SeverityCounts } from "@devdigest/shared";

/** Severity filter levels, in display order. */
export const SEVERITIES = ["CRITICAL", "WARNING", "SUGGESTION"] as const satisfies readonly Severity[];

/** Severity → its key under `prReview.severityCount` (and in PrMeta.severity_counts). */
export const SEVERITY_KEY = {
  CRITICAL: "critical",
  WARNING: "warning",
  SUGGESTION: "suggestion",
} as const satisfies Record<Severity, keyof SeverityCounts>;

/** Sort weight per severity (lower = shown first). */
export const SEVERITY_ORDER: Record<string, number> = {
  CRITICAL: 0,
  WARNING: 1,
  SUGGESTION: 2,
  INFO: 3,
};

/** Confidence below this is hidden when "hide low confidence" is on. */
export const LOW_CONFIDENCE_THRESHOLD = 0.65;

/** Keyboard shortcut → finding action. */
export const KEY_TO_ACTION: Record<string, FindingActionKind> = {
  a: "accept",
  d: "dismiss",
};
