import { describe, expect, expectTypeOf, it } from "vitest";
import type {
  PassingLine,
  PlayerStatLine,
  ReceivingLine,
  RushingLine,
  StatSubject,
} from "./engine";
import type { TeamSide } from "./game-setup";
import { creditPlay, identityIssueNeeded } from "./play-credits";
import type { PlayObservation } from "./play-observation";
import type { PlayerAttribution } from "./player-attribution";

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

const quarterback: PlayerAttribution = { kind: "identified", playerId: "home-7" };
const runningBack: PlayerAttribution = { kind: "identified", playerId: "home-22" };
const receiver: PlayerAttribution = { kind: "identified", playerId: "home-81" };
const unknown33: PlayerAttribution = { kind: "unknown", observedJersey: 33 };
const unknownWithoutJersey: PlayerAttribution = { kind: "unknown" };

const rush = (ballCarrier: PlayerAttribution, yards: number): PlayObservation => ({
  family: "rush",
  outcome: "rush",
  period: 1,
  segments: [{ kind: "rush", ballCarrier, yards }],
});

const kneelDown = (ballCarrier: PlayerAttribution, yards: number): PlayObservation => ({
  family: "rush",
  outcome: "rush",
  marker: "kneelDown",
  period: 1,
  segments: [{ kind: "rush", ballCarrier, yards }],
});

const complete = (
  passer: PlayerAttribution,
  catcher: PlayerAttribution,
  yards: number,
): PlayObservation => ({
  family: "pass",
  outcome: "complete",
  period: 1,
  segments: [{ kind: "reception", passer, receiver: catcher, yards }],
});

const incomplete = (passer: PlayerAttribution, target?: PlayerAttribution): PlayObservation => ({
  family: "pass",
  outcome: "incomplete",
  period: 1,
  segments: [{ kind: "incompletion", passer, ...(target === undefined ? {} : { target }) }],
});

const spike = (passer: PlayerAttribution): PlayObservation => ({
  family: "pass",
  outcome: "incomplete",
  marker: "spike",
  period: 1,
  segments: [{ kind: "incompletion", passer }],
});

const noRushing: RushingLine = { attempts: 0, yards: 0 };
const noPassing: PassingLine = { attempts: 0, completions: 0, yards: 0 };
const noReceiving: ReceivingLine = { receptions: 0, yards: 0 };

const line = (
  subject: StatSubject,
  credits: Partial<Pick<PlayerStatLine, "rushing" | "passing" | "receiving">>,
  team: TeamSide = "home",
): PlayerStatLine => ({
  team,
  subject,
  rushing: credits.rushing ?? noRushing,
  passing: credits.passing ?? noPassing,
  receiving: credits.receiving ?? noReceiving,
});

const player = (playerId: string): StatSubject => ({ kind: "player", playerId });
const teamSubject: StatSubject = { kind: "team" };

const credit = (observation: PlayObservation, team: TeamSide = "home") =>
  creditPlay(deepFreeze(observation), team);

const needsIdentity = (observation: PlayObservation) =>
  identityIssueNeeded(deepFreeze(observation));

describe("creditPlay", () => {
  it("takes an observation and the team in possession and returns stat lines", () => {
    expectTypeOf(creditPlay).parameters.toEqualTypeOf<
      [observation: PlayObservation, team: TeamSide]
    >();
    expectTypeOf(creditPlay).returns.toEqualTypeOf<readonly PlayerStatLine[]>();
  });

  describe("rush", () => {
    it("credits the ball carrier with 1 rush and its yards", () => {
      expect(credit(rush(runningBack, 4))).toStrictEqual([
        line(player("home-22"), { rushing: { attempts: 1, yards: 4 } }),
      ]);
    });

    it("credits the lines to the given team", () => {
      expect(credit(rush(runningBack, 4), "away")).toStrictEqual([
        line(player("home-22"), { rushing: { attempts: 1, yards: 4 } }, "away"),
      ]);
    });

    it("keeps an unknown #33 as an unresolved line", () => {
      expect(credit(rush(unknown33, -3))).toStrictEqual([
        line({ kind: "unresolved", observedJersey: 33 }, { rushing: { attempts: 1, yards: -3 } }),
      ]);
    });

    it("omits the jersey of an unknown carrier who has none", () => {
      const [unresolved] = credit(rush(unknownWithoutJersey, 2));

      expect(unresolved).toStrictEqual(
        line({ kind: "unresolved" }, { rushing: { attempts: 1, yards: 2 } }),
      );
      expect(unresolved?.subject).not.toHaveProperty("observedJersey");
    });
  });

  describe("pass", () => {
    it("credits a completion to the passer and a reception to the receiver", () => {
      expect(credit(complete(quarterback, receiver, 27))).toStrictEqual([
        line(player("home-7"), { passing: { attempts: 1, completions: 1, yards: 27 } }),
        line(player("home-81"), { receiving: { receptions: 1, yards: 27 } }),
      ]);
    });

    it("credits only a pass attempt to the passer of an incomplete pass", () => {
      expect(credit(incomplete(quarterback, receiver))).toStrictEqual([
        line(player("home-7"), { passing: { attempts: 1, completions: 0, yards: 0 } }),
      ]);
    });

    it("keeps an unknown passer as an unresolved passing line", () => {
      expect(credit(complete(unknown33, receiver, 9))).toStrictEqual([
        line(
          { kind: "unresolved", observedJersey: 33 },
          { passing: { attempts: 1, completions: 1, yards: 9 } },
        ),
        line(player("home-81"), { receiving: { receptions: 1, yards: 9 } }),
      ]);
    });
  });

  describe("team plays", () => {
    it.each([
      { name: "a known carrier", carrier: runningBack },
      { name: "an unknown carrier", carrier: unknown33 },
    ])("charges a kneel-down by $name to the Team line", ({ carrier }) => {
      expect(credit(kneelDown(carrier, -2))).toStrictEqual([
        line(teamSubject, { rushing: { attempts: 1, yards: -2 } }),
      ]);
    });

    it.each([
      { name: "a known passer", passer: quarterback },
      { name: "an unknown passer", passer: unknownWithoutJersey },
    ])("charges a spike by $name to the Team line", ({ passer }) => {
      expect(credit(spike(passer))).toStrictEqual([
        line(teamSubject, { passing: { attempts: 1, completions: 0, yards: 0 } }),
      ]);
    });
  });

  it("leaves its deep-frozen input unchanged", () => {
    const observation = complete(quarterback, receiver, 27);
    const observationCopy = copyOf(observation);

    creditPlay(deepFreeze(observation), "home");

    expect(observation).toStrictEqual(observationCopy);
  });

  it("returns identical results for identical inputs", () => {
    const observation = complete(quarterback, receiver, 27);

    expect(credit(observation)).toStrictEqual(credit(copyOf(observation)));
  });

  it("returns lines that survive a JSON round trip unchanged", () => {
    const lines = credit(rush(unknownWithoutJersey, 2));

    expect(JSON.parse(JSON.stringify(lines))).toStrictEqual(lines);
  });
});

describe("identityIssueNeeded", () => {
  it("takes an observation and returns a boolean", () => {
    expectTypeOf(identityIssueNeeded).parameters.toEqualTypeOf<[observation: PlayObservation]>();
    expectTypeOf(identityIssueNeeded).returns.toEqualTypeOf<boolean>();
  });

  it.each([
    { name: "an unknown ball carrier", observation: rush(unknown33, -3) },
    { name: "an unknown carrier without a jersey", observation: rush(unknownWithoutJersey, 2) },
    { name: "an unknown passer of a complete pass", observation: complete(unknown33, receiver, 9) },
    {
      name: "an unknown receiver of a complete pass",
      observation: complete(quarterback, unknown33, 9),
    },
    { name: "an unknown passer of an incomplete pass", observation: incomplete(unknown33) },
  ])("is true for $name", ({ observation }) => {
    expect(needsIdentity(observation)).toBe(true);
  });

  it.each([
    { name: "a rush by a known carrier", observation: rush(runningBack, 4) },
    {
      name: "a complete pass between known players",
      observation: complete(quarterback, receiver, 27),
    },
    {
      name: "an incomplete pass with an unknown target",
      observation: incomplete(quarterback, unknown33),
    },
    { name: "an incomplete pass with no target", observation: incomplete(quarterback) },
    { name: "a kneel-down by an unknown carrier", observation: kneelDown(unknown33, -2) },
    { name: "a spike by an unknown passer", observation: spike(unknownWithoutJersey) },
  ])("is false for $name", ({ observation }) => {
    expect(needsIdentity(observation)).toBe(false);
  });
});
