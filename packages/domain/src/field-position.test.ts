import { describe, expect, expectTypeOf, it } from "vitest";
import {
  advanceBall,
  fromYardsFromOwnGoal,
  reverseField,
  toYardsFromOwnGoal,
} from "./field-position";
import type { FieldPosition } from "./game-setup";
import { PROTOTYPE_RULESET } from "./ruleset";
import type { Ruleset } from "./ruleset";

const own = (yardLine: number): FieldPosition => ({ side: "own", yardLine });
const opponent = (yardLine: number): FieldPosition => ({ side: "opponent", yardLine });
const midfield: FieldPosition = { side: "midfield" };

describe("toYardsFromOwnGoal", () => {
  it("takes a position and a ruleset and returns a number", () => {
    expectTypeOf(toYardsFromOwnGoal).parameters.toEqualTypeOf<
      [position: FieldPosition, ruleset: Ruleset]
    >();
    expectTypeOf(toYardsFromOwnGoal).returns.toEqualTypeOf<number>();
  });

  it.each([
    { name: "own 25", position: own(25), yards: 25 },
    { name: "midfield", position: midfield, yards: 50 },
    { name: "opponent 44", position: opponent(44), yards: 56 },
  ])("measures $name as $yards yards from the own goal line", ({ position, yards }) => {
    expect(toYardsFromOwnGoal(position, PROTOTYPE_RULESET)).toBe(yards);
  });
});

describe("fromYardsFromOwnGoal", () => {
  it("takes yards and a ruleset and returns a field position", () => {
    expectTypeOf(fromYardsFromOwnGoal).parameters.toEqualTypeOf<
      [yards: number, ruleset: Ruleset]
    >();
    expectTypeOf(fromYardsFromOwnGoal).returns.toEqualTypeOf<FieldPosition>();
  });

  it("is the inverse of toYardsFromOwnGoal for every yard line from 1 to 99", () => {
    for (let yards = 1; yards < PROTOTYPE_RULESET.fieldLength; yards += 1) {
      const position = fromYardsFromOwnGoal(yards, PROTOTYPE_RULESET);
      expect(toYardsFromOwnGoal(position, PROTOTYPE_RULESET)).toBe(yards);
    }
  });
});

describe("advanceBall", () => {
  it("returns a field position or one of the end zones", () => {
    expectTypeOf(advanceBall).parameters.toEqualTypeOf<
      [position: FieldPosition, netYards: number, ruleset: Ruleset]
    >();
    expectTypeOf(advanceBall).returns.toEqualTypeOf<
      | { readonly kind: "field"; readonly position: FieldPosition }
      | { readonly kind: "opponent_end_zone" }
      | { readonly kind: "own_end_zone" }
    >();
  });

  it.each([
    { name: "own 45 + 10 across midfield", from: own(45), netYards: 10, to: opponent(45) },
    { name: "own 29 + 27", from: own(29), netYards: 27, to: opponent(44) },
    { name: "opponent 44 − 3", from: opponent(44), netYards: -3, to: opponent(47) },
    { name: "own 3 − 2", from: own(3), netYards: -2, to: own(1) },
  ])("moves the ball on the field for $name", ({ from, netYards, to }) => {
    expect(advanceBall(from, netYards, PROTOTYPE_RULESET)).toStrictEqual({
      kind: "field",
      position: to,
    });
  });

  it("reaches the opponent end zone from opponent 20 with a 20-yard gain", () => {
    expect(advanceBall(opponent(20), 20, PROTOTYPE_RULESET)).toStrictEqual({
      kind: "opponent_end_zone",
    });
  });

  it("reaches the own end zone from own 3 with a 3-yard loss", () => {
    expect(advanceBall(own(3), -3, PROTOTYPE_RULESET)).toStrictEqual({ kind: "own_end_zone" });
  });
});

describe("reverseField", () => {
  it("takes and returns a field position", () => {
    expectTypeOf(reverseField).parameters.toEqualTypeOf<[position: FieldPosition]>();
    expectTypeOf(reverseField).returns.toEqualTypeOf<FieldPosition>();
  });

  it.each([
    { name: "opponent 30 as own 30", from: opponent(30), to: own(30) },
    { name: "own 36 as opponent 36", from: own(36), to: opponent(36) },
    { name: "midfield as midfield", from: midfield, to: midfield },
  ])("re-expresses $name", ({ from, to }) => {
    expect(reverseField(from)).toStrictEqual(to);
  });
});
