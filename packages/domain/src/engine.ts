import type { GameSetup, TeamSide, VersionReferences } from "./game-setup";
import type { PlayRevision } from "./play-revision";
import type { Ruleset } from "./ruleset";
import type { Situation } from "./situation";

/** See docs/technical/domain-model.md, "Three independent versions". */
export type EngineVersion = `${number}.${number}.${number}`;

/** See docs/technical/domain-model.md, "Three independent versions". */
export type EngineVersionReferences = VersionReferences & {
  readonly engine: EngineVersion;
};

export type RushingLine = {
  readonly attempts: number;
  readonly yards: number;
};

export type PassingLine = {
  readonly attempts: number;
  readonly completions: number;
  readonly yards: number;
};

export type ReceivingLine = {
  readonly receptions: number;
  readonly yards: number;
};

/**
 * Who a statistical line belongs to: a roster player, the "Team" line, or an unresolved player
 * that is never assigned an invented identity.
 * See docs/technical/prototype-football-profile.md, "Credits".
 */
export type StatSubject =
  | { readonly kind: "player"; readonly playerId: string }
  | { readonly kind: "team" }
  | { readonly kind: "unresolved"; readonly observedJersey?: number };

/** See docs/technical/prototype-football-profile.md, "Credits". */
export type PlayerStatLine = {
  readonly team: TeamSide;
  readonly subject: StatSubject;
  readonly rushing: RushingLine;
  readonly passing: PassingLine;
  readonly receiving: ReceivingLine;
};

/**
 * Team totals. Receiving yards are never part of team offense, so there is no receiving line.
 * See docs/technical/prototype-football-profile.md, "Credits".
 */
export type TeamStatLine = {
  readonly team: TeamSide;
  readonly rushing: RushingLine;
  readonly passing: PassingLine;
  readonly firstDowns: {
    readonly rushing: number;
    readonly passing: number;
  };
  readonly totalOffenseYards: number;
};

/** See docs/technical/domain-model.md, "Ordered log and revisions". */
export type EngineIssue = {
  readonly code:
    | "unresolved_identity"
    | "missing_details"
    | "unsupported_consequence"
    | "inconsistent_consequence";
  readonly playId: string;
};

/** A situation is `null` when it could not be calculated, for example after an unsupported consequence. */
export type PlaySituationResult = {
  readonly playId: string;
  readonly before: Situation | null;
  readonly after: Situation | null;
};

/** See docs/technical/domain-model.md, "Initial engine contract". */
export type EngineInput = {
  readonly setup: GameSetup;
  readonly plays: readonly PlayRevision[];
};

/**
 * Engine result. Lists are in a deterministic order so equal inputs give equal outputs.
 * See docs/technical/domain-model.md, "Initial engine contract".
 */
export type EngineOutput = {
  readonly versions: EngineVersionReferences;
  /** Situation after the last calculated play, or `null` when it could not be calculated. */
  readonly situation: Situation | null;
  /** Ordered by `orderKey`, compared as a string. */
  readonly plays: readonly PlaySituationResult[];
  readonly teamStats: {
    readonly home: TeamStatLine;
    readonly away: TeamStatLine;
  };
  /**
   * Ordered home before away; then player, team, and unresolved subjects; then by `playerId`
   * for players or observed jersey for unresolved subjects.
   */
  readonly playerStats: readonly PlayerStatLine[];
  /** Ordered by play (in `plays` order), then by `code`. */
  readonly issues: readonly EngineIssue[];
};

/**
 * Pure engine entry point, calculated under the given ruleset.
 * See docs/technical/domain-model.md, "Initial engine contract".
 */
export type CalculateGame = (input: EngineInput, ruleset: Ruleset) => EngineOutput;
