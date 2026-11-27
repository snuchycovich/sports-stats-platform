import { advanceBall, reverseField, toYardsFromOwnGoal } from "./field-position";
import type { BallAdvance } from "./field-position";
import type { FieldPosition, TeamSide } from "./game-setup";
import type { PlayObservation, PlaySegment } from "./play-observation";
import type { Ruleset } from "./ruleset";
import { initialSituation } from "./series";
import type { Down, Situation } from "./situation";

/**
 * Situation after a supported play, or the consequence the profile cannot calculate.
 * See docs/technical/prototype-football-profile.md, "Situation after a supported play".
 */
export type SituationProgress =
  | { readonly kind: "situation"; readonly situation: Situation }
  | {
      readonly kind: "unsupported_consequence";
      readonly consequence: "touchdown" | "safety";
    };

const segmentYards = (segment: PlaySegment): number =>
  segment.kind === "incompletion" ? 0 : segment.yards;

/**
 * Net yards of a play: the sum of its segment yards; an incompletion adds none.
 * See docs/technical/domain-model.md, "Field position and yards".
 */
export const netYards = (observation: PlayObservation): number =>
  observation.segments.reduce((total, segment) => total + segmentYards(segment), 0);

const followingDown: { readonly [down in Down]?: Down } = { 1: 2, 2: 3, 3: 4 };

const otherTeam = (team: TeamSide): TeamSide => (team === "home" ? "away" : "home");

const unsupportedConsequence = (
  spot: Exclude<BallAdvance, { kind: "field" }>,
): SituationProgress => ({
  kind: "unsupported_consequence",
  consequence: spot.kind === "opponent_end_zone" ? "touchdown" : "safety",
});

const firstDown = (
  situation: Situation,
  spot: FieldPosition,
  ruleset: Ruleset,
): Situation | undefined => {
  const { lineToGain } = situation;
  const reached =
    lineToGain.kind === "position" &&
    toYardsFromOwnGoal(spot, ruleset) >= toYardsFromOwnGoal(lineToGain.position, ruleset);
  return reached
    ? initialSituation({ possession: situation.possession, ballPosition: spot }, ruleset)
    : undefined;
};

const nextDown = (
  situation: Situation,
  spot: FieldPosition,
  ruleset: Ruleset,
): Situation | undefined => {
  const down = situation.down < ruleset.downsPerSeries ? followingDown[situation.down] : undefined;
  return down === undefined ? undefined : { ...situation, down, ballPosition: spot };
};

const turnoverOnDowns = (situation: Situation, spot: FieldPosition, ruleset: Ruleset): Situation =>
  initialSituation(
    { possession: otherTeam(situation.possession), ballPosition: reverseField(spot) },
    ruleset,
  );

/**
 * Applies the profile rules in order: unsupported consequence, first down, next down, then
 * turnover on downs. The observation is never altered.
 * See docs/technical/prototype-football-profile.md, "Situation after a supported play".
 */
export const nextSituation = (
  situation: Situation,
  observation: PlayObservation,
  ruleset: Ruleset,
): SituationProgress => {
  const spot = advanceBall(situation.ballPosition, netYards(observation), ruleset);
  if (spot.kind !== "field") {
    return unsupportedConsequence(spot);
  }
  return {
    kind: "situation",
    situation:
      firstDown(situation, spot.position, ruleset) ??
      nextDown(situation, spot.position, ruleset) ??
      turnoverOnDowns(situation, spot.position, ruleset),
  };
};
