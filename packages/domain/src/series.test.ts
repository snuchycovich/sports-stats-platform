import { describe, expect, expectTypeOf, it } from "vitest";
import type { FieldPosition, StartingContext } from "./game-setup";
import { PROTOTYPE_RULESET } from "./ruleset";
import type { Ruleset } from "./ruleset";
import { distanceToGain, initialSituation, lineToGainFrom } from "./series";
import type { LineToGain, Situation } from "./situation";

const deepFreeze = <T>(value: T): T => {
  if (typeof value === "object" && value !== null) {
    for (const child of Object.values(value)) {
      deepFreeze(child);
    }
    Object.freeze(value);
  }
  return value;
};

const own = (yardLine: number): FieldPosition => ({ side: "own", yardLine });
const opponent = (yardLine: number): FieldPosition => ({ side: "opponent", yardLine });
const midfield: FieldPosition = { side: "midfield" };

const goal: LineToGain = { kind: "goal" };
const lineAt = (position: FieldPosition): LineToGain => ({ kind: "position", position });

const longSeriesRuleset: Ruleset = { ...PROTOTYPE_RULESET, seriesYards: 15 };

describe("lineToGainFrom", () => {
  it("takes a ball position and a ruleset and returns a line to gain", () => {
    expectTypeOf(lineToGainFrom).parameters.toEqualTypeOf<
      [ballPosition: FieldPosition, ruleset: Ruleset]
    >();
    expectTypeOf(lineToGainFrom).returns.toEqualTypeOf<LineToGain>();
  });

  it.each([
    { name: "own 25", ball: own(25), line: lineAt(own(35)) },
    { name: "own 45, across midfield", ball: own(45), line: lineAt(opponent(45)) },
    { name: "own 40, at midfield", ball: own(40), line: lineAt(midfield) },
    { name: "opponent 11", ball: opponent(11), line: lineAt(opponent(1)) },
  ])("sets the line 10 yards beyond $name", ({ ball, line }) => {
    expect(lineToGainFrom(deepFreeze(ball), PROTOTYPE_RULESET)).toStrictEqual(line);
  });

  it.each([
    { name: "opponent 10, exactly 10 yards out", ball: opponent(10) },
    { name: "opponent 7", ball: opponent(7) },
  ])("sets goal to go from $name", ({ ball }) => {
    expect(lineToGainFrom(deepFreeze(ball), PROTOTYPE_RULESET)).toStrictEqual(goal);
  });

  it("uses the series yards of the ruleset", () => {
    expect(lineToGainFrom(own(25), longSeriesRuleset)).toStrictEqual(lineAt(own(40)));
    expect(lineToGainFrom(opponent(15), longSeriesRuleset)).toStrictEqual(goal);
  });
});

describe("distanceToGain", () => {
  it("takes a situation and a ruleset and returns yards or goal", () => {
    expectTypeOf(distanceToGain).parameters.toEqualTypeOf<
      [situation: Situation, ruleset: Ruleset]
    >();
    expectTypeOf(distanceToGain).returns.toEqualTypeOf<number | "goal">();
  });

  it.each<{ name: string; situation: Situation; distance: number | "goal" }>([
    {
      name: "2nd at own 29 with the line at own 35",
      situation: {
        possession: "home",
        down: 2,
        ballPosition: own(29),
        lineToGain: lineAt(own(35)),
      },
      distance: 6,
    },
    {
      name: "3rd at opponent 47 with the line at opponent 34, across midfield",
      situation: {
        possession: "home",
        down: 3,
        ballPosition: opponent(47),
        lineToGain: lineAt(opponent(34)),
      },
      distance: 13,
    },
    {
      name: "1st & goal at opponent 7",
      situation: { possession: "home", down: 1, ballPosition: opponent(7), lineToGain: goal },
      distance: "goal",
    },
    {
      name: "2nd & goal at opponent 10, after a loss",
      situation: { possession: "home", down: 2, ballPosition: opponent(10), lineToGain: goal },
      distance: "goal",
    },
  ])("is $distance for $name", ({ situation, distance }) => {
    expect(distanceToGain(deepFreeze(situation), PROTOTYPE_RULESET)).toBe(distance);
  });
});

describe("initialSituation", () => {
  const startAtOwn25: StartingContext = { possession: "home", ballPosition: own(25) };
  const startAtOpponent7: StartingContext = { possession: "away", ballPosition: opponent(7) };

  it("takes a starting context and a ruleset and returns a situation", () => {
    expectTypeOf(initialSituation).parameters.toEqualTypeOf<
      [startingContext: StartingContext, ruleset: Ruleset]
    >();
    expectTypeOf(initialSituation).returns.toEqualTypeOf<Situation>();
  });

  it("starts 1st & 10 at own 25 with the line at own 35", () => {
    const situation = initialSituation(deepFreeze(startAtOwn25), PROTOTYPE_RULESET);

    expect(situation).toStrictEqual({
      possession: "home",
      down: 1,
      ballPosition: own(25),
      lineToGain: lineAt(own(35)),
    });
    expect(distanceToGain(situation, PROTOTYPE_RULESET)).toBe(10);
  });

  it("starts 1st & goal at opponent 7", () => {
    const situation = initialSituation(deepFreeze(startAtOpponent7), PROTOTYPE_RULESET);

    expect(situation).toStrictEqual({
      possession: "away",
      down: 1,
      ballPosition: opponent(7),
      lineToGain: goal,
    });
    expect(distanceToGain(situation, PROTOTYPE_RULESET)).toBe("goal");
  });

  it("returns identical results for identical inputs", () => {
    expect(initialSituation(startAtOwn25, PROTOTYPE_RULESET)).toStrictEqual(
      initialSituation({ possession: "home", ballPosition: own(25) }, PROTOTYPE_RULESET),
    );
  });

  it("survives a JSON round trip unchanged", () => {
    const situation = initialSituation(startAtOwn25, PROTOTYPE_RULESET);

    expect(JSON.parse(JSON.stringify(situation))).toStrictEqual(situation);
  });
});
