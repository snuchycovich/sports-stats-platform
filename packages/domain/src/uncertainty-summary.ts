import type { EngineIssue } from "./engine";
import type { PlayRevision } from "./play-revision";

/**
 * Why a play keeps results provisional: an engine issue code or a delivery reason.
 * See docs/technical/domain-model.md, "Ordered log and revisions".
 */
export type UncertaintyReason =
  | "missing_details"
  | "unresolved_identity"
  | "inconsistent_consequence"
  | "unsupported_consequence"
  | "sync_conflict"
  | "pending_delivery";

/**
 * Local delivery state of a play, supplied by the caller; not part of the authoritative payload.
 * See docs/technical/domain-model.md, "Ordered log and revisions".
 */
export type DeliveryStatus = "local" | "pending" | "synced" | "conflict";

/**
 * Unique uncertain plays and the number of plays for each reason. A play may have several
 * reasons, so reason counts need not sum to `playCount`.
 * See docs/technical/domain-model.md, "Ordered log and revisions".
 */
export type UncertaintySummary = {
  readonly playCount: number;
  readonly playIds: readonly string[];
  readonly reasons: { readonly [reason in UncertaintyReason]: number };
};

type SummaryInput = {
  readonly plays: readonly PlayRevision[];
  readonly issues: readonly EngineIssue[];
  readonly deliveryStates: readonly {
    readonly playId: string;
    readonly status: DeliveryStatus;
  }[];
};

type UncertainPlay = { readonly playId: string; readonly reason: UncertaintyReason };

const deliveryReason: { readonly [status in DeliveryStatus]?: UncertaintyReason } = {
  local: "pending_delivery",
  pending: "pending_delivery",
  conflict: "sync_conflict",
};

const compareStrings = (a: string, b: string): number => (a < b ? -1 : Number(a > b));

const byOrderKey = (a: PlayRevision, b: PlayRevision): number =>
  compareStrings(a.orderKey, b.orderKey) || compareStrings(a.playId, b.playId);

const unique = (values: readonly string[]): readonly string[] =>
  values.filter((value, index) => values.indexOf(value) === index);

const uncertainPlaysOf = (input: SummaryInput): readonly UncertainPlay[] => [
  ...input.issues.map(({ playId, code }) => ({ playId, reason: code })),
  ...input.plays
    .filter(({ captureCompleteness }) => captureCompleteness === "needs_details")
    .map(({ playId }): UncertainPlay => ({ playId, reason: "missing_details" })),
  ...input.deliveryStates.flatMap(({ playId, status }) => {
    const reason = deliveryReason[status];
    return reason === undefined ? [] : [{ playId, reason }];
  }),
];

/**
 * Summarizes the uncertain plays of a game from its current plays, the engine issues, and the
 * delivery states. Each reason counts a play at most once. Play IDs follow `orderKey`; IDs known
 * only from issues or delivery states come last, sorted.
 * See docs/technical/domain-model.md, "Ordered log and revisions".
 */
export const summarizeUncertainty = (input: SummaryInput): UncertaintySummary => {
  const uncertain = uncertainPlaysOf(input);
  const uncertainIds = unique(uncertain.map(({ playId }) => playId));
  const orderedPlayIds = [...input.plays].sort(byOrderKey).map(({ playId }) => playId);
  const inLog = orderedPlayIds.filter((playId) => uncertainIds.includes(playId));
  const outsideLog = uncertainIds
    .filter((playId) => !orderedPlayIds.includes(playId))
    .sort(compareStrings);
  const count = (reason: UncertaintyReason): number =>
    unique(uncertain.filter((play) => play.reason === reason).map(({ playId }) => playId)).length;
  const playIds = [...inLog, ...outsideLog];
  return {
    playCount: playIds.length,
    playIds,
    reasons: {
      missing_details: count("missing_details"),
      unresolved_identity: count("unresolved_identity"),
      inconsistent_consequence: count("inconsistent_consequence"),
      unsupported_consequence: count("unsupported_consequence"),
      sync_conflict: count("sync_conflict"),
      pending_delivery: count("pending_delivery"),
    },
  };
};
