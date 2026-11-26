import { describe, expectTypeOf, it } from "vitest";
import type { FieldPosition, TeamSide } from "./game-setup";
import type { Down, LineToGain, ObservedContext, Situation } from "./situation";

const accept = <T>(value: T): T => value;

describe("Down", () => {
  it("is one of four downs", () => {
    expectTypeOf<Down>().toEqualTypeOf<1 | 2 | 3 | 4>();
  });

  it("rejects downs outside 1 to 4", () => {
    // @ts-expect-error there is no down 0
    accept<Down>(0);
    // @ts-expect-error there is no down 5
    accept<Down>(5);
  });
});

describe("LineToGain", () => {
  it("is the goal line or a field position", () => {
    accept<LineToGain>({ kind: "goal" });
    accept<LineToGain>({ kind: "position", position: { side: "own", yardLine: 35 } });
  });

  it("rejects a goal line to gain with a position", () => {
    // @ts-expect-error a goal line to gain has no position
    accept<LineToGain>({ kind: "goal", position: { side: "opponent", yardLine: 7 } });
  });
});

describe("Situation", () => {
  it("accepts 1st & 10 at own 25", () => {
    accept<Situation>({
      possession: "home",
      down: 1,
      ballPosition: { side: "own", yardLine: 25 },
      lineToGain: { kind: "position", position: { side: "own", yardLine: 35 } },
    });
  });

  it("accepts 1st & goal at opponent 7", () => {
    accept<Situation>({
      possession: "home",
      down: 1,
      ballPosition: { side: "opponent", yardLine: 7 },
      lineToGain: { kind: "goal" },
    });
  });

  it("types each field", () => {
    expectTypeOf<Situation["possession"]>().toEqualTypeOf<TeamSide>();
    expectTypeOf<Situation["down"]>().toEqualTypeOf<Down>();
    expectTypeOf<Situation["ballPosition"]>().toEqualTypeOf<FieldPosition>();
    expectTypeOf<Situation["lineToGain"]>().toEqualTypeOf<LineToGain>();
  });

  it("has readonly properties", () => {
    const mutate = (situation: Situation): void => {
      // @ts-expect-error down is readonly
      situation.down = 2;
      // @ts-expect-error lineToGain is readonly
      situation.lineToGain = { kind: "goal" };
    };

    expectTypeOf(mutate).toBeFunction();
  });
});

describe("ObservedContext", () => {
  it("makes every observed value optional", () => {
    accept<ObservedContext>({});
    accept<ObservedContext>({
      possession: "away",
      down: 3,
      distance: 7,
      ballPosition: { side: "midfield" },
    });
  });

  it("accepts goal as an observed distance", () => {
    accept<ObservedContext>({ down: 1, distance: "goal" });
    expectTypeOf<ObservedContext["distance"]>().toEqualTypeOf<number | "goal" | undefined>();
  });

  it("rejects an observed down outside 1 to 4", () => {
    // @ts-expect-error there is no down 5
    accept<ObservedContext>({ down: 5 });
  });
});
