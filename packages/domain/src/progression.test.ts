import { describe, expect, expectTypeOf, it } from "vitest";
import type { FieldPosition, TeamSide } from "./game-setup";
import type { PlayObservation } from "./play-observation";
import type { PlayerAttribution } from "./player-attribution";
import { netYards, nextSituation } from "./progression";
import { PROTOTYPE_RULESET } from "./ruleset";
import type { Ruleset } from "./ruleset";
import type { Down, LineToGain, Situation } from "./situation";

const deepFreeze = <T>(value: T): T => {
  if (typeof value === "object" && value !== null) {
    for (const child of Object.values(value)) {
      deepFreeze(child);
    }
    Object.freeze(value);
  }
  return value;
};

const copyOf = <T>(value: T): T => JSON.parse(JSON.stringify(value));

const own = (yardLine: number): FieldPosition => ({ side: "own", yardLine });
const opponent = (yardLine: number): FieldPosition => ({ side: "opponent", yardLine });
const midfield: FieldPosition = { side: "midfield" };

const goal: LineToGain = { kind: "goal" };
const lineAt = (position: FieldPosition): LineToGain => ({ kind: "position", position });

const situation = (
  down: Down,
  ballPosition: FieldPosition,
  lineToGain: LineToGain,
  possession: TeamSide = "home",
): Situation => ({ possession, down, ballPosition, lineToGain });

const carrier: PlayerAttribution = { kind: "identified", playerId: "home-22" };
const passer: PlayerAttribution = { kind: "identified", playerId: "home-7" };
const receiver: PlayerAttribution = { kind: "identified", playerId: "home-81" };
const team: PlayerAttribution = { kind: "unknown" };

const rush = (yards: number): PlayObservation => ({
  family: "rush",
  outcome: "rush",
  period: 1,
  segments: [{ kind: "rush", ballCarrier: carrier, yards }],
});

const kneelDown = (yards: number): PlayObservation => ({
  family: "rush",
  outcome: "rush",
  marker: "kneelDown",
  period: 1,
  segments: [{ kind: "rush", ballCarrier: team, yards }],
});

const complete = (yards: number): PlayObservation => ({
  family: "pass",
  outcome: "complete",
  period: 1,
  segments: [{ kind: "reception", passer, receiver, yards }],
});

const incomplete: PlayObservation = {
  family: "pass",
  outcome: "incomplete",
  period: 1,
  segments: [{ kind: "incompletion", passer, target: receiver }],
};

const spike: PlayObservation = {
  family: "pass",
  outcome: "incomplete",
  marker: "spike",
  period: 1,
  segments: [{ kind: "incompletion", passer: team }],
};

const catchAndRun: PlayObservation = {
  family: "pass",
  outcome: "complete",
  period: 1,
  segments: [
    { kind: "reception", passer, receiver, yards: 10 },
    { kind: "rush", ballCarrier: receiver, yards: 5 },
  ],
};

const next = (before: Situation, observation: PlayObservation) =>
  nextSituation(deepFreeze(before), deepFreeze(observation), PROTOTYPE_RULESET);

describe("netYards", () => {
  it("takes an observation and returns a number", () => {
    expectTypeOf(netYards).parameters.toEqualTypeOf<[observation: PlayObservation]>();
    expectTypeOf(netYards).returns.toEqualTypeOf<number>();
  });

  it.each([
    { name: "a +4 rush", observation: rush(4), yards: 4 },
    { name: "a −3 rush", observation: rush(-3), yards: -3 },
    { name: "a +27 complete pass", observation: complete(27), yards: 27 },
    { name: "an incomplete pass", observation: incomplete, yards: 0 },
    { name: "a −2 kneel-down", observation: kneelDown(-2), yards: -2 },
    { name: "a spike", observation: spike, yards: 0 },
    { name: "a 10-yard catch and 5-yard run", observation: catchAndRun, yards: 15 },
  ])("is $yards for $name", ({ observation, yards }) => {
    expect(netYards(deepFreeze(observation))).toBe(yards);
  });
});

describe("nextSituation", () => {
  it("takes a situation, an observation, and a ruleset", () => {
    expectTypeOf(nextSituation).parameters.toEqualTypeOf<
      [situation: Situation, observation: PlayObservation, ruleset: Ruleset]
    >();
  });

  it("returns a situation or an unsupported touchdown or safety", () => {
    expectTypeOf(nextSituation).returns.toEqualTypeOf<
      | { readonly kind: "situation"; readonly situation: Situation }
      | {
          readonly kind: "unsupported_consequence";
          readonly consequence: "touchdown" | "safety";
        }
    >();
  });

  describe("next down", () => {
    it.each([
      {
        name: "1st & 10 own 25, rush +4 → 2nd & 6 own 29",
        before: situation(1, own(25), lineAt(own(35))),
        observation: rush(4),
        after: situation(2, own(29), lineAt(own(35))),
      },
      {
        name: "1st & 10 opponent 44, incomplete → 2nd & 10 opponent 44",
        before: situation(1, opponent(44), lineAt(opponent(34))),
        observation: incomplete,
        after: situation(2, opponent(44), lineAt(opponent(34))),
      },
      {
        name: "1st & goal opponent 7, rush −3 → 2nd & goal opponent 10",
        before: situation(1, opponent(7), goal),
        observation: rush(-3),
        after: situation(2, opponent(10), goal),
      },
      {
        name: "3rd & 2 own 20, kneel-down −2 → 4th & 4 own 18",
        before: situation(3, own(20), lineAt(own(22))),
        observation: kneelDown(-2),
        after: situation(4, own(18), lineAt(own(22))),
      },
      {
        name: "2nd & 10 own 40, spike → 3rd & 10 own 40",
        before: situation(2, own(40), lineAt(midfield)),
        observation: spike,
        after: situation(3, own(40), lineAt(midfield)),
      },
      {
        name: "2nd & 12 own 3, rush stopped at own 1 (−2) → 3rd & 14 own 1",
        before: situation(2, own(3), lineAt(own(15))),
        observation: rush(-2),
        after: situation(3, own(1), lineAt(own(15))),
      },
    ])("keeps the line to gain: $name", ({ before, observation, after }) => {
      expect(next(before, observation)).toStrictEqual({ kind: "situation", situation: after });
    });
  });

  describe("first down", () => {
    it.each([
      {
        name: "2nd & 6 own 29, complete +27 → 1st & 10 opponent 44",
        before: situation(2, own(29), lineAt(own(35))),
        observation: complete(27),
        after: situation(1, opponent(44), lineAt(opponent(34))),
      },
      {
        name: "1st & 10 own 45, rush +10 across midfield → 1st & 10 opponent 45",
        before: situation(1, own(45), lineAt(opponent(45))),
        observation: rush(10),
        after: situation(1, opponent(45), lineAt(opponent(35))),
      },
      {
        name: "2nd & 4 opponent 12, complete +5 → 1st & goal opponent 7",
        before: situation(2, opponent(12), lineAt(opponent(8))),
        observation: complete(5),
        after: situation(1, opponent(7), goal),
      },
      {
        name: "4th & 4 opponent 38, rush +4 exactly to the line → 1st & 10 opponent 34",
        before: situation(4, opponent(38), lineAt(opponent(34))),
        observation: rush(4),
        after: situation(1, opponent(34), lineAt(opponent(24))),
      },
    ])("starts a new series for the same team: $name", ({ before, observation, after }) => {
      expect(next(before, observation)).toStrictEqual({ kind: "situation", situation: after });
    });
  });

  describe("turnover on downs", () => {
    it.each([
      {
        name: "4th & 1 own 30, incomplete → other team 1st & 10 opponent 30",
        before: situation(4, own(30), lineAt(own(31))),
        observation: incomplete,
        after: situation(1, opponent(30), lineAt(opponent(20)), "away"),
      },
      {
        name: "4th & goal opponent 2, rush +1 → other team 1st & 10 own 1",
        before: situation(4, opponent(2), goal),
        observation: rush(1),
        after: situation(1, own(1), lineAt(own(11)), "away"),
      },
      {
        name: "4th & 4 opponent 38, rush +2 → other team 1st & 10 own 36",
        before: situation(4, opponent(38), lineAt(opponent(34))),
        observation: rush(2),
        after: situation(1, own(36), lineAt(own(46)), "away"),
      },
      {
        name: "4th & 5 for the away team at midfield, rush 0 → home 1st & 10 midfield",
        before: situation(4, midfield, lineAt(opponent(45)), "away"),
        observation: rush(0),
        after: situation(1, midfield, lineAt(opponent(40)), "home"),
      },
    ])("re-expresses the spot for the other team: $name", ({ before, observation, after }) => {
      expect(next(before, observation)).toStrictEqual({ kind: "situation", situation: after });
    });
  });

  describe("unsupported consequence", () => {
    it.each([
      {
        name: "1st & 10 opponent 20, rush +20",
        before: situation(1, opponent(20), lineAt(opponent(10))),
        observation: rush(20),
        consequence: "touchdown",
      },
      {
        name: "1st & goal opponent 8, complete +8",
        before: situation(1, opponent(8), goal),
        observation: complete(8),
        consequence: "touchdown",
      },
      {
        name: "4th & goal opponent 2, rush +2, before turnover on downs",
        before: situation(4, opponent(2), goal),
        observation: rush(2),
        consequence: "touchdown",
      },
      {
        name: "2nd & 12 own 3, officials' spot in own end zone (−3)",
        before: situation(2, own(3), lineAt(own(15))),
        observation: rush(-3),
        consequence: "safety",
      },
      {
        name: "4th & 5 own 3, rush −3, before turnover on downs",
        before: situation(4, own(3), lineAt(own(8))),
        observation: rush(-3),
        consequence: "safety",
      },
    ])("reports a $consequence: $name", ({ before, observation, consequence }) => {
      expect(next(before, observation)).toStrictEqual({
        kind: "unsupported_consequence",
        consequence,
      });
    });
  });

  it("leaves its deep-frozen inputs unchanged", () => {
    const before = situation(4, own(30), lineAt(own(31)));
    const observation = complete(5);
    const beforeCopy = copyOf(before);
    const observationCopy = copyOf(observation);

    next(before, observation);

    expect(before).toStrictEqual(beforeCopy);
    expect(observation).toStrictEqual(observationCopy);
  });

  it("returns identical results for identical inputs", () => {
    const before = situation(4, opponent(38), lineAt(opponent(34)));

    expect(nextSituation(before, rush(2), PROTOTYPE_RULESET)).toStrictEqual(
      nextSituation(copyOf(before), rush(2), PROTOTYPE_RULESET),
    );
  });

  it("returns a result that survives a JSON round trip unchanged", () => {
    const result = nextSituation(
      situation(2, own(29), lineAt(own(35))),
      complete(27),
      PROTOTYPE_RULESET,
    );

    expect(JSON.parse(JSON.stringify(result))).toStrictEqual(result);
  });
});
