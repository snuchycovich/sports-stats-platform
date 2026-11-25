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
