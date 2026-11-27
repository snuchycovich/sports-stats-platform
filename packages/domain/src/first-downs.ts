import type { PlaySituationResult } from "./engine";
import { advanceBall, toYardsFromOwnGoal } from "./field-position";
import type { FieldPosition, TeamSide } from "./game-setup";
import type { PlayObservation } from "./play-observation";
import type { PlayRevision } from "./play-revision";
import { netYards } from "./progression";
import type { Ruleset } from "./ruleset";
import type { Situation } from "./situation";
import type { SituationProgression } from "./situation-progression";

/**
 * A first down credited to the team in possession, by the category of the play.
 * See docs/technical/prototype-football-profile.md, "Credits".
 */
export type FirstDownCredit = {
  readonly playId: string;
  readonly team: TeamSide;
  readonly category: "rushing" | "passing";
};

/**
 * Ball position before the latest play of the same team that started at first down, walking back
 * through known situations only; unknown when an unknown situation or the other team comes first.
 */
const seriesStart = (
  results: readonly PlaySituationResult[],
  index: number,
  team: TeamSide,
): FieldPosition | undefined => {
  for (let current = index; current >= 0; current -= 1) {
    const before = results[current]?.before ?? null;
    if (before === null || before.possession !== team) {
      return undefined;
    }
    if (before.down === 1) {
      return before.ballPosition;
    }
  }
  return undefined;
};

const startsNewSeries = (before: Situation, after: Situation): boolean =>
  after.possession === before.possession && after.down === 1;

const isTouchdown = (before: Situation, observation: PlayObservation, ruleset: Ruleset): boolean =>
  advanceBall(before.ballPosition, netYards(observation), ruleset).kind === "opponent_end_zone";

const startedFarEnough = (start: FieldPosition | undefined, ruleset: Ruleset): boolean =>
  start !== undefined &&
  ruleset.fieldLength - toYardsFromOwnGoal(start, ruleset) >= ruleset.seriesYards;

const earnsFirstDown = (
  results: readonly PlaySituationResult[],
  index: number,
  observation: PlayObservation,
  ruleset: Ruleset,
): boolean => {
  const result = results[index];
  const before = result?.before ?? null;
  if (before === null || observation.outcome === "incomplete") {
    return false;
  }
  const after = result?.after ?? null;
  if (after !== null) {
    return startsNewSeries(before, after);
  }
  return (
    isTouchdown(before, observation, ruleset) &&
    startedFarEnough(seriesStart(results, index, before.possession), ruleset)
  );
};

/**
 * First downs of the ordered plays: a play that starts a new series for the same team, or a
 * touchdown whose series started at least the series yards from the opponent's goal line. A
 * safety, a turnover on downs, and a play with an unknown situation or series start earn none.
 * See docs/technical/prototype-football-profile.md, "Credits".
 */
export const firstDowns = (
  plays: readonly PlayRevision[],
  progression: SituationProgression,
  ruleset: Ruleset,
): readonly FirstDownCredit[] =>
  progression.plays.flatMap((result, index) => {
    const observation = plays.find(({ playId }) => playId === result.playId)?.observation;
    const team = result.before?.possession;
    if (
      observation === undefined ||
      team === undefined ||
      !earnsFirstDown(progression.plays, index, observation, ruleset)
    ) {
      return [];
    }
    const credit: FirstDownCredit = {
      playId: result.playId,
      team,
      category: observation.family === "rush" ? "rushing" : "passing",
    };
    return [credit];
  });
