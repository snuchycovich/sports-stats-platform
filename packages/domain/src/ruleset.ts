import type { RulesetVersion } from "./game-setup";

/**
 * Data of a versioned ruleset. The field length sets the yard-line and yards limits; a series
 * gives a number of downs to gain a number of yards.
 * See docs/technical/domain-model.md, "Field position and yards", and
 * docs/technical/prototype-football-profile.md, "Series and line to gain".
 */
export type Ruleset = {
  readonly version: RulesetVersion;
  readonly fieldLength: number;
  readonly downsPerSeries: number;
  readonly seriesYards: number;
};

/** See docs/technical/prototype-football-profile.md, "Field and periods". */
export const PROTOTYPE_RULESET: Ruleset = {
  version: "prototype-tackle/0.1.0",
  fieldLength: 100,
  downsPerSeries: 4,
  seriesYards: 10,
};

const knownRulesets: readonly Ruleset[] = [PROTOTYPE_RULESET];

/** Finds a known ruleset by its exact version; each version is a distinct ruleset. */
export const findRuleset = (version: RulesetVersion): Ruleset | undefined =>
  knownRulesets.find((ruleset) => ruleset.version === version);

/** Yard lines run from 1 to half the field length minus 1; the middle line is `midfield`. */
export const maxYardLine = (ruleset: Ruleset): number => ruleset.fieldLength / 2 - 1;
