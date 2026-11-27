import { describe, expect, expectTypeOf, it } from "vitest";
import { firstDowns } from "./first-downs";
import { PROTOTYPE_VERSIONS } from "./game-setup";
import type { FieldPosition, GameSetup, StartingContext, TeamSide } from "./game-setup";
import type { PlayObservation } from "./play-observation";
import type { PlayRevision } from "./play-revision";
import type { PlayerAttribution } from "./player-attribution";
import { PROTOTYPE_RULESET } from "./ruleset";
import type { Ruleset } from "./ruleset";
import { progressSituations } from "./situation-progression";
import type { SituationProgression } from "./situation-progression";
import type { Down, ObservedContext, Situation } from "./situation";

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

const setupFrom = (startingContext: StartingContext): GameSetup => ({
  gameId: "game",
  home: { id: "team-home", name: "Home" },
  away: { id: "team-away", name: "Away" },
  rosters: {
    home: { teamId: "team-home", entries: [] },
    away: { teamId: "team-away", entries: [] },
  },
  startingContext,
  versions: PROTOTYPE_VERSIONS,
});

const startAt = (ballPosition: FieldPosition): GameSetup =>
  setupFrom({ possession: "home", ballPosition });

const carrier: PlayerAttribution = { kind: "identified", playerId: "home-22" };
const passer: PlayerAttribution = { kind: "identified", playerId: "home-7" };
const receiver: PlayerAttribution = { kind: "identified", playerId: "home-81" };

const withContext = (observedContext: ObservedContext | undefined) =>
  observedContext === undefined ? {} : { observedContext };

const rush = (yards: number, observedContext?: ObservedContext): PlayObservation => ({
  family: "rush",
  outcome: "rush",
  period: 1,
  ...withContext(observedContext),
  segments: [{ kind: "rush", ballCarrier: carrier, yards }],
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
  segments: [{ kind: "incompletion", passer }],
};

const log = (...observations: readonly PlayObservation[]): readonly PlayRevision[] =>
  observations.map((observation, index) => ({
    playId: `p${index + 1}`,
    gameId: "game",
    orderKey: String((index + 1) * 100).padStart(4, "0"),
    revision: 1,
    payloadVersion: 1,
    captureCompleteness: "complete",
    reviewStatus: "confirmed",
    observation,
  }));

const creditFirstDowns = (
  setup: GameSetup,
  plays: readonly PlayRevision[],
  ruleset: Ruleset = PROTOTYPE_RULESET,
) =>
  firstDowns(deepFreeze(plays), deepFreeze(progressSituations({ setup, plays }, ruleset)), ruleset);

const earned = (playId: string, category: "rushing" | "passing", team: TeamSide = "home") => ({
  playId,
  team,
  category,
});

const home = (down: Down, ballPosition: FieldPosition, line: FieldPosition): Situation => ({
  possession: "home",
  down,
  ballPosition,
  lineToGain: { kind: "position", position: line },
});

describe("firstDowns", () => {
  it("takes the ordered plays, their progression, and a ruleset", () => {
    expectTypeOf(firstDowns).parameters.toEqualTypeOf<
      [plays: readonly PlayRevision[], progression: SituationProgression, ruleset: Ruleset]
    >();
  });

  it("returns readonly first-down credits", () => {
    expectTypeOf(firstDowns).returns.toEqualTypeOf<
      readonly {
        readonly playId: string;
        readonly team: TeamSide;
        readonly category: "rushing" | "passing";
      }[]
    >();
  });

  it("credits nothing for an empty log", () => {
    expect(creditFirstDowns(startAt(own(25)), [])).toStrictEqual([]);
  });

  describe("new series for the same team", () => {
    it("credits a rushing first down to a rush that reaches the line", () => {
      expect(creditFirstDowns(startAt(own(25)), log(rush(4), rush(6)))).toStrictEqual([
        earned("p2", "rushing"),
      ]);
    });

    it("credits a passing first down to a completion that reaches the line", () => {
      expect(creditFirstDowns(startAt(own(29)), log(complete(27)))).toStrictEqual([
        earned("p1", "passing"),
      ]);
    });

    it("credits the team in possession", () => {
      const awayStart = setupFrom({ possession: "away", ballPosition: own(25) });

      expect(creditFirstDowns(awayStart, log(rush(12)))).toStrictEqual([
        earned("p1", "rushing", "away"),
      ]);
    });

    it("credits nothing to a play that does not reach the line", () => {
      expect(creditFirstDowns(startAt(own(25)), log(rush(4), complete(5)))).toStrictEqual([]);
    });
  });

  describe("credited team", () => {
    it("credits the observed possession when it differs from the calculated one", () => {
      expect(
        creditFirstDowns(startAt(own(25)), log(rush(12, { possession: "away" }))),
      ).toStrictEqual([earned("p1", "rushing", "away")]);
    });

    it("credits the calculated possession when none is observed", () => {
      expect(creditFirstDowns(startAt(own(25)), log(rush(12, { down: 1 })))).toStrictEqual([
        earned("p1", "rushing"),
      ]);
    });

    it("credits no first down to a turnover on downs, even with an observed possession", () => {
      const plays = log(rush(0), rush(0), rush(0), rush(2, { possession: "away" }));

      expect(creditFirstDowns(startAt(opponent(20)), plays)).toStrictEqual([]);
    });
  });

  describe("turnover on downs", () => {
    it("credits no team with the new series it starts", () => {
      const plays = log(rush(0), rush(0), rush(0), rush(2));

      expect(creditFirstDowns(startAt(opponent(20)), plays)).toStrictEqual([]);
    });
  });

  describe("touchdown", () => {
    it("credits a rushing first down when the series started 20 yards out", () => {
      expect(creditFirstDowns(startAt(opponent(20)), log(rush(20)))).toStrictEqual([
        earned("p1", "rushing"),
      ]);
    });

    it("credits nothing when the series started 8 yards out", () => {
      expect(creditFirstDowns(startAt(opponent(8)), log(complete(8)))).toStrictEqual([]);
    });

    it("credits a first down when the series started exactly 10 yards out", () => {
      expect(creditFirstDowns(startAt(opponent(10)), log(rush(4), complete(6)))).toStrictEqual([
        earned("p2", "passing"),
      ]);
    });

    it("measures from the start of the scoring series, not from an earlier series", () => {
      expect(
        creditFirstDowns(startAt(opponent(15)), log(rush(10), rush(4), rush(1))),
      ).toStrictEqual([earned("p1", "rushing")]);
    });

    it("uses the series yards of the ruleset", () => {
      const longSeriesRuleset: Ruleset = { ...PROTOTYPE_RULESET, seriesYards: 15 };

      expect(creditFirstDowns(startAt(opponent(12)), log(rush(12)))).toStrictEqual([
        earned("p1", "rushing"),
      ]);
      expect(
        creditFirstDowns(startAt(opponent(12)), log(rush(12)), longSeriesRuleset),
      ).toStrictEqual([]);
    });
  });

  describe("safety", () => {
    it("credits nothing on 2nd & 12 at own 3 with a 3-yard loss", () => {
      expect(creditFirstDowns(startAt(own(5)), log(rush(-2), rush(-3)))).toStrictEqual([]);
    });
  });

  describe("unknown situations", () => {
    it("credits nothing to a play whose situation is unknown", () => {
      const plays = log(rush(20), rush(30));

      expect(creditFirstDowns(startAt(opponent(20)), plays)).toStrictEqual([
        earned("p1", "rushing"),
      ]);
    });

    it("credits nothing when the series start is unknown after a restart mid-series", () => {
      const restartAtThirdAndGoal = rush(5, {
        possession: "away",
        down: 3,
        distance: "goal",
        ballPosition: opponent(5),
      });

      const result = creditFirstDowns(startAt(opponent(20)), log(rush(20), restartAtThirdAndGoal));

      expect(result).toStrictEqual([earned("p1", "rushing")]);
    });

    it("finds the series start after a restart at first down", () => {
      const restartAtFirstDown = rush(4, {
        possession: "away",
        down: 1,
        distance: 10,
        ballPosition: opponent(30),
      });

      const result = creditFirstDowns(
        startAt(opponent(20)),
        log(rush(20), restartAtFirstDown, rush(26)),
      );

      expect(result).toStrictEqual([earned("p1", "rushing"), earned("p3", "rushing", "away")]);
    });
  });

  describe("plays that never move the ball", () => {
    it.each([
      { name: "an incomplete pass", observation: incomplete },
      { name: "a spike", observation: spike },
    ])(
      "credits nothing to $name, even in a progression that starts a new series",
      ({ observation }) => {
        const plays = log(observation);
        const progression: SituationProgression = {
          plays: [
            {
              playId: "p1",
              before: home(2, own(40), midfield),
              after: home(1, own(40), opponent(40)),
            },
          ],
          situation: home(1, own(40), opponent(40)),
          issues: [],
        };

        expect(
          firstDowns(deepFreeze(plays), deepFreeze(progression), PROTOTYPE_RULESET),
        ).toStrictEqual([]);
      },
    );
  });

  describe("purity", () => {
    const setup = startAt(opponent(20));
    const plays = log(rush(5), rush(6), rush(9));

    it("leaves its deep-frozen inputs unchanged", () => {
      const progression = progressSituations({ setup, plays }, PROTOTYPE_RULESET);
      const playsCopy = copyOf(plays);
      const progressionCopy = copyOf(progression);

      firstDowns(deepFreeze(plays), deepFreeze(progression), PROTOTYPE_RULESET);

      expect(plays).toStrictEqual(playsCopy);
      expect(progression).toStrictEqual(progressionCopy);
    });

    it("returns identical results for identical inputs", () => {
      expect(creditFirstDowns(setup, plays)).toStrictEqual(
        creditFirstDowns(copyOf(setup), copyOf(plays)),
      );
    });

    it("returns credits that survive a JSON round trip unchanged", () => {
      const credits = creditFirstDowns(setup, plays);

      expect(JSON.parse(JSON.stringify(credits))).toStrictEqual(credits);
    });
  });
});
