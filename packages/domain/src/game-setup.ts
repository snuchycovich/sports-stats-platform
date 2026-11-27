export type TeamSide = "home" | "away";

export type Team = {
  readonly id: string;
  readonly name: string;
};

export type RosterEntry = {
  readonly playerId: string;
  readonly jerseyNumber: number;
  readonly displayName?: string;
};

export type Roster = {
  readonly teamId: string;
  readonly entries: readonly RosterEntry[];
};

/**
 * Ball position from the point of view of the team in possession at the snap.
 * See docs/technical/domain-model.md, "Field position and yards".
 */
export type FieldPosition =
  | { readonly side: "own" | "opponent"; readonly yardLine: number }
  | { readonly side: "midfield" };

export type StartingContext = {
  readonly possession: TeamSide;
  readonly ballPosition: FieldPosition;
};

export type RulesetVersion = `${string}/${number}.${number}.${number}`;

export type StatisticalPolicyVersion = `${string}/${number}.${number}.${number}`;

/**
 * Independent ruleset and statistical-policy references selected for a game.
 * See docs/technical/domain-model.md, "Three independent versions".
 */
export type VersionReferences = {
  readonly ruleset: RulesetVersion;
  readonly statisticalPolicy: StatisticalPolicyVersion;
};

export type GameSetup = {
  readonly gameId: string;
  readonly home: Team;
  readonly away: Team;
  readonly rosters: {
    readonly home: Roster;
    readonly away: Roster;
  };
  readonly startingContext: StartingContext;
  readonly versions: VersionReferences;
};

export const PROTOTYPE_VERSIONS = {
  ruleset: "prototype-tackle/0.1.0",
  statisticalPolicy: "prototype-rush-pass/0.1.0",
} as const satisfies VersionReferences;
