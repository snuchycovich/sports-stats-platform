import type { PlayObservation } from "./play-observation";

/** See docs/technical/domain-model.md, "Ordered log and revisions". */
export type CaptureCompleteness = "minimal" | "needs_details" | "complete";

/** See docs/technical/domain-model.md, "Ordered log and revisions". */
export type ReviewStatus = "draft" | "needs_review" | "confirmed";

/**
 * One revision of a play in the ordered game log. Local delivery state such as `syncStatus`
 * is not part of this authoritative payload.
 * See docs/technical/domain-model.md, "Ordered log and revisions".
 */
export type PlayRevision = {
  readonly playId: string;
  readonly gameId: string;
  /**
   * Position of the play in the game log, compared as a string. It is independent of the
   * display number, the clock, and the play UUID.
   */
  readonly orderKey: string;
  readonly revision: number;
  readonly payloadVersion: 1;
  readonly captureCompleteness: CaptureCompleteness;
  readonly reviewStatus: ReviewStatus;
  readonly observation: PlayObservation;
};
