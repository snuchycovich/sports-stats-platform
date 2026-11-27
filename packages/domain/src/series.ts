import { fromYardsFromOwnGoal, toYardsFromOwnGoal } from "./field-position";
import type { FieldPosition, StartingContext } from "./game-setup";
import type { Ruleset } from "./ruleset";
import type { LineToGain, Situation } from "./situation";

/**
 * Line to gain of a new series: the series yards beyond the ball, or the opponent's goal line
 * when that is at or nearer than the series yards ("goal to go").
 * See docs/technical/prototype-football-profile.md, "Series and line to gain".
 */
export const lineToGainFrom = (ballPosition: FieldPosition, ruleset: Ruleset): LineToGain => {
  const target = toYardsFromOwnGoal(ballPosition, ruleset) + ruleset.seriesYards;
  return target >= ruleset.fieldLength
    ? { kind: "goal" }
    : { kind: "position", position: fromYardsFromOwnGoal(target, ruleset) };
};

/**
 * Yards from the ball to the line to gain, or `"goal"` in a goal-to-go series.
 * See docs/technical/prototype-football-profile.md, "Series and line to gain".
 */
export const distanceToGain = (situation: Situation, ruleset: Ruleset): number | "goal" =>
  situation.lineToGain.kind === "goal"
    ? "goal"
    : toYardsFromOwnGoal(situation.lineToGain.position, ruleset) -
      toYardsFromOwnGoal(situation.ballPosition, ruleset);

/**
 * First down of a new series from the starting context.
 * See docs/technical/prototype-football-profile.md, "Starting context".
 */
export const initialSituation = (
  startingContext: StartingContext,
  ruleset: Ruleset,
): Situation => ({
  possession: startingContext.possession,
  down: 1,
  ballPosition: startingContext.ballPosition,
  lineToGain: lineToGainFrom(startingContext.ballPosition, ruleset),
});
