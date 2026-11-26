import type { PlayObservation } from "./play-observation";
import type { PlayerAttribution } from "./player-attribution";

type DraftContext = {
  readonly period: number;
  readonly clockSeconds?: number;
  readonly note?: string;
};

type RushDraft = DraftContext & {
  readonly family: "rush";
  readonly ballCarrier?: PlayerAttribution;
  readonly yards?: number;
  readonly kneelDown?: boolean;
};

type PassDraft = DraftContext & {
  readonly family: "pass";
  readonly outcome?: "complete" | "incomplete";
  readonly passer?: PlayerAttribution;
  readonly receiver?: PlayerAttribution;
  readonly target?: PlayerAttribution;
  readonly yards?: number;
  readonly spike?: boolean;
};

/**
 * Flat capture draft for the supported plays; the domain converts it into segments.
 * See docs/adr/ADR-002-segmented-play-observation.md, decision 2.
 */
export type PlayDraft = RushDraft | PassDraft;

type AttributionField = "ballCarrier" | "passer" | "receiver" | "target";

export type DraftField =
  | "period"
  | "clockSeconds"
  | "outcome"
  | "yards"
  | "kneelDown"
  | "spike"
  | AttributionField
  | `${AttributionField}.observedJersey`;

/** See docs/technical/prototype-football-profile.md, "Required attribution". */
export type DraftIssue = {
  readonly code: "required" | "forbidden" | "not_integer" | "out_of_range";
  readonly field: DraftField;
};

export type DraftValidationOptions = {
  readonly fieldLength: number;
};

const integerIssues = (
  field: DraftField,
  value: number | undefined,
  min: number,
  max = Number.POSITIVE_INFINITY,
): readonly DraftIssue[] => {
  if (value === undefined) {
    return [];
  }
  if (!Number.isInteger(value)) {
    return [{ code: "not_integer", field }];
  }
  return value < min || value > max ? [{ code: "out_of_range", field }] : [];
};

const required = (field: DraftField, present: boolean): readonly DraftIssue[] =>
  present ? [] : [{ code: "required", field }];

const forbidden = (field: DraftField, present: boolean): readonly DraftIssue[] =>
  present ? [{ code: "forbidden", field }] : [];

const attributionIssues = (
  field: AttributionField,
  attribution: PlayerAttribution | undefined,
): readonly DraftIssue[] =>
  attribution?.kind === "unknown"
    ? integerIssues(`${field}.observedJersey`, attribution.observedJersey, 0)
    : [];

const yardsIssues = (yards: number | undefined, fieldLength: number): readonly DraftIssue[] =>
  integerIssues("yards", yards, -(fieldLength - 1), fieldLength - 1);

const contextIssues = (draft: PlayDraft): readonly DraftIssue[] => [
  ...integerIssues("period", draft.period, 1),
  ...integerIssues("clockSeconds", draft.clockSeconds, 0),
];

const rushIssues = (draft: RushDraft, fieldLength: number): readonly DraftIssue[] => [
  ...required("ballCarrier", draft.ballCarrier !== undefined || draft.kneelDown === true),
  ...attributionIssues("ballCarrier", draft.ballCarrier),
  ...required("yards", draft.yards !== undefined),
  ...yardsIssues(draft.yards, fieldLength),
];

const completePassIssues = (draft: PassDraft, fieldLength: number): readonly DraftIssue[] => [
  ...required("passer", draft.passer !== undefined),
  ...attributionIssues("passer", draft.passer),
  ...required("receiver", draft.receiver !== undefined),
  ...attributionIssues("receiver", draft.receiver),
  ...forbidden("target", draft.target !== undefined),
  ...required("yards", draft.yards !== undefined),
  ...yardsIssues(draft.yards, fieldLength),
  ...forbidden("spike", draft.spike === true),
];

const incompletePassIssues = (draft: PassDraft): readonly DraftIssue[] => {
  const spike = draft.spike === true;
  return [
    ...required("passer", draft.passer !== undefined || spike),
    ...attributionIssues("passer", draft.passer),
    ...forbidden("receiver", draft.receiver !== undefined),
    ...forbidden("target", spike && draft.target !== undefined),
    ...attributionIssues("target", draft.target),
    ...forbidden("yards", draft.yards !== undefined),
  ];
};

const passIssues = (draft: PassDraft, fieldLength: number): readonly DraftIssue[] => {
  if (draft.outcome === undefined) {
    return required("outcome", false);
  }
  return draft.outcome === "complete"
    ? completePassIssues(draft, fieldLength)
    : incompletePassIssues(draft);
};

/**
 * Reports every problem of a capture draft, in field order, without checking the roster.
 * Yards are whole numbers from −(field length − 1) to field length − 1.
 * See docs/adr/ADR-002-segmented-play-observation.md, decision 2, and docs/field-capture.md, "Live Capture".
 */
export const validatePlayDraft = (
  draft: PlayDraft,
  { fieldLength }: DraftValidationOptions,
): readonly DraftIssue[] => [
  ...contextIssues(draft),
  ...(draft.family === "rush" ? rushIssues(draft, fieldLength) : passIssues(draft, fieldLength)),
];

export type CreatePlayObservationResult =
  | { readonly ok: true; readonly observation: PlayObservation }
  | { readonly ok: false; readonly issues: readonly [DraftIssue, ...DraftIssue[]] };

const unknownPlayer: PlayerAttribution = { kind: "unknown" };

const missingYards: CreatePlayObservationResult = {
  ok: false,
  issues: [{ code: "required", field: "yards" }],
};

const observationContext = (draft: PlayDraft) => ({
  period: draft.period,
  ...(draft.clockSeconds === undefined ? {} : { clockSeconds: draft.clockSeconds }),
  ...(draft.note === undefined ? {} : { note: draft.note }),
});

const rushObservation = (draft: RushDraft): CreatePlayObservationResult => {
  if (draft.yards === undefined) {
    return missingYards;
  }
  return {
    ok: true,
    observation: {
      family: "rush",
      outcome: "rush",
      ...(draft.kneelDown === true ? { marker: "kneelDown" } : {}),
      ...observationContext(draft),
      segments: [
        { kind: "rush", ballCarrier: draft.ballCarrier ?? unknownPlayer, yards: draft.yards },
      ],
    },
  };
};

const completePassObservation = (draft: PassDraft): CreatePlayObservationResult => {
  if (draft.yards === undefined) {
    return missingYards;
  }
  return {
    ok: true,
    observation: {
      family: "pass",
      outcome: "complete",
      ...observationContext(draft),
      segments: [
        {
          kind: "reception",
          passer: draft.passer ?? unknownPlayer,
          receiver: draft.receiver ?? unknownPlayer,
          yards: draft.yards,
        },
      ],
    },
  };
};

const incompletePassObservation = (draft: PassDraft): CreatePlayObservationResult => ({
  ok: true,
  observation: {
    family: "pass",
    outcome: "incomplete",
    ...(draft.spike === true ? { marker: "spike" } : {}),
    ...observationContext(draft),
    segments: [
      {
        kind: "incompletion",
        passer: draft.passer ?? unknownPlayer,
        ...(draft.target === undefined ? {} : { target: draft.target }),
      },
    ],
  },
});

const toObservation = (draft: PlayDraft): CreatePlayObservationResult => {
  if (draft.family === "rush") {
    return rushObservation(draft);
  }
  return draft.outcome === "complete"
    ? completePassObservation(draft)
    : incompletePassObservation(draft);
};

/**
 * Validates a capture draft and builds its observation with the first segment matching the
 * outcome, so callers never assemble segments. A missing kneel-down carrier or spike passer is
 * recorded as an unknown player. An invalid draft returns exactly the `validatePlayDraft` issues.
 * See docs/adr/ADR-002-segmented-play-observation.md, decision 2.
 */
export const createPlayObservation = (
  draft: PlayDraft,
  options: DraftValidationOptions,
): CreatePlayObservationResult => {
  const [first, ...rest] = validatePlayDraft(draft, options);
  return first === undefined ? toObservation(draft) : { ok: false, issues: [first, ...rest] };
};
