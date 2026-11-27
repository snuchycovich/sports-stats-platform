import type { FieldPosition } from "./game-setup";
import type { Ruleset } from "./ruleset";

/**
 * Where the ball ends after moving: on the field, or in one of the end zones.
 * See docs/technical/prototype-football-profile.md, "Situation after a supported play".
 */
export type BallAdvance =
  | { readonly kind: "field"; readonly position: FieldPosition }
  | { readonly kind: "opponent_end_zone" }
  | { readonly kind: "own_end_zone" };

/**
 * Yards from the possessing team's own goal line.
 * See docs/technical/domain-model.md, "Field position and yards".
 */
export const toYardsFromOwnGoal = (position: FieldPosition, ruleset: Ruleset): number => {
  switch (position.side) {
    case "own":
      return position.yardLine;
    case "midfield":
      return ruleset.fieldLength / 2;
    case "opponent":
      return ruleset.fieldLength - position.yardLine;
  }
};

/**
 * Field position at the given yards from the own goal line, from 1 to field length minus 1.
 * See docs/technical/domain-model.md, "Field position and yards".
 */
export const fromYardsFromOwnGoal = (yards: number, ruleset: Ruleset): FieldPosition => {
  const middle = ruleset.fieldLength / 2;
  if (yards === middle) {
    return { side: "midfield" };
  }
  return yards < middle
    ? { side: "own", yardLine: yards }
    : { side: "opponent", yardLine: ruleset.fieldLength - yards };
};

/**
 * Moves the ball by net yards toward the opponent's goal line, through midfield.
 * See docs/technical/prototype-football-profile.md, "Situation after a supported play".
 */
export const advanceBall = (
  position: FieldPosition,
  netYards: number,
  ruleset: Ruleset,
): BallAdvance => {
  const yards = toYardsFromOwnGoal(position, ruleset) + netYards;
  if (yards >= ruleset.fieldLength) {
    return { kind: "opponent_end_zone" };
  }
  if (yards <= 0) {
    return { kind: "own_end_zone" };
  }
  return { kind: "field", position: fromYardsFromOwnGoal(yards, ruleset) };
};

/**
 * Re-expresses a position from the other team's point of view.
 * See docs/technical/prototype-football-profile.md, "Situation after a supported play".
 */
export const reverseField = (position: FieldPosition): FieldPosition => {
  switch (position.side) {
    case "own":
      return { side: "opponent", yardLine: position.yardLine };
    case "opponent":
      return { side: "own", yardLine: position.yardLine };
    case "midfield":
      return position;
  }
};
