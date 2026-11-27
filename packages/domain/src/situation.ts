import type { FieldPosition, TeamSide } from "./game-setup";

/** See docs/technical/prototype-football-profile.md, "Series and line to gain". */
export type Down = 1 | 2 | 3 | 4;

/**
 * Fixed when a series starts: a field position, or the opponent's goal line ("goal to go").
 * See docs/technical/prototype-football-profile.md, "Series and line to gain".
 */
export type LineToGain =
  | { readonly kind: "goal" }
  | { readonly kind: "position"; readonly position: FieldPosition };

/** See docs/technical/prototype-football-profile.md, "Series and line to gain". */
export type Situation = {
  readonly possession: TeamSide;
  readonly down: Down;
  readonly ballPosition: FieldPosition;
  readonly lineToGain: LineToGain;
};

/**
 * Situation as observed by the operator before a play. Values may be missing; the engine checks
 * them against the calculated situation and never rewrites them.
 * See docs/technical/domain-model.md, "Ordered log and revisions".
 */
export type ObservedContext = {
  readonly possession?: TeamSide;
  readonly down?: Down;
  readonly distance?: number | "goal";
  readonly ballPosition?: FieldPosition;
};
