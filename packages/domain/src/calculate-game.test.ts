import { describe, expect, expectTypeOf, it } from "vitest";
import { ENGINE_VERSION, calculateGame } from "./calculate-game";
import type {
  CalculateGame,
  EngineInput,
  EngineIssue,
  EngineOutput,
  EngineVersion,
  PassingLine,
  PlayerStatLine,
  ReceivingLine,
  RushingLine,
  StatSubject,
  TeamStatLine,
} from "./engine";
import { PROTOTYPE_VERSIONS } from "./game-setup";
import type { FieldPosition, GameSetup, TeamSide } from "./game-setup";
import type { PlayObservation } from "./play-observation";
import type { PlayRevision } from "./play-revision";
import type { PlayerAttribution } from "./player-attribution";
import { PROTOTYPE_RULESET } from "./ruleset";
import type { Ruleset } from "./ruleset";
import { initialSituation } from "./series";
import type { ObservedContext } from "./situation";

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

const startAt = (ballPosition: FieldPosition): GameSetup => ({
  gameId: "game",
  home: { id: "team-home", name: "Home" },
  away: { id: "team-away", name: "Away" },
  rosters: {
    home: { teamId: "team-home", entries: [] },
    away: { teamId: "team-away", entries: [] },
  },
  startingContext: { possession: "home", ballPosition },
  versions: PROTOTYPE_VERSIONS,
});

const runningBack: PlayerAttribution = { kind: "identified", playerId: "home-22" };
const awayRunner: PlayerAttribution = { kind: "identified", playerId: "away-1" };
const unknown33: PlayerAttribution = { kind: "unknown", observedJersey: 33 };

const rush = (
  ballCarrier: PlayerAttribution,
  yards: number,
  observedContext?: ObservedContext,
): PlayObservation => ({
  family: "rush",
  outcome: "rush",
  period: 1,
  ...(observedContext === undefined ? {} : { observedContext }),
  segments: [{ kind: "rush", ballCarrier, yards }],
});

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

const calculate = (setup: GameSetup, plays: readonly PlayRevision[]) =>
  calculateGame(deepFreeze({ setup, plays }), PROTOTYPE_RULESET);

const noRushing: RushingLine = { attempts: 0, yards: 0 };
const noPassing: PassingLine = { attempts: 0, completions: 0, yards: 0 };
const noReceiving: ReceivingLine = { receptions: 0, yards: 0 };

const zeroTotals = (team: TeamSide): TeamStatLine => ({
  team,
  rushing: noRushing,
  passing: noPassing,
  firstDowns: { rushing: 0, passing: 0 },
  totalOffenseYards: 0,
});

const rushLine = (subject: StatSubject, attempts: number, yards: number, team: TeamSide = "home") =>
  ({
    team,
    subject,
    rushing: { attempts, yards },
    passing: noPassing,
    receiving: noReceiving,
  }) satisfies PlayerStatLine;

const issue = (code: EngineIssue["code"], playId: string): EngineIssue => ({ code, playId });

const engineVersions = { ...PROTOTYPE_VERSIONS, engine: "0.1.0" };

describe("ENGINE_VERSION", () => {
  it("is engine version 0.1.0", () => {
    expectTypeOf(ENGINE_VERSION).toEqualTypeOf<EngineVersion>();
    expect(ENGINE_VERSION).toBe("0.1.0");
  });
});

describe("calculateGame", () => {
  it("is the engine entry point", () => {
    expectTypeOf(calculateGame).toEqualTypeOf<CalculateGame>();
    expectTypeOf(calculateGame).parameters.toEqualTypeOf<[input: EngineInput, ruleset: Ruleset]>();
    expectTypeOf(calculateGame).returns.toEqualTypeOf<EngineOutput>();
  });

  it("returns the initial situation, zero totals, and no lines or issues for an empty log", () => {
    const setup = startAt(own(25));

    expect(calculate(setup, [])).toStrictEqual({
      versions: engineVersions,
      situation: initialSituation(setup.startingContext, PROTOTYPE_RULESET),
      plays: [],
      teamStats: { home: zeroTotals("home"), away: zeroTotals("away") },
      playerStats: [],
      issues: [],
    });
  });

  it("references the setup versions and the engine version", () => {
    expect(calculate(startAt(own(25)), log(rush(runningBack, 4))).versions).toStrictEqual(
      engineVersions,
    );
  });

  it("credits the attempt, yards, and first down of a touchdown, without points", () => {
    expect(calculate(startAt(opponent(20)), log(rush(runningBack, 20)))).toStrictEqual({
      versions: engineVersions,
      situation: null,
      plays: [
        {
          playId: "p1",
          before: {
            possession: "home",
            down: 1,
            ballPosition: opponent(20),
            lineToGain: { kind: "position", position: opponent(10) },
          },
          after: null,
        },
      ],
      teamStats: {
        home: {
          team: "home",
          rushing: { attempts: 1, yards: 20 },
          passing: noPassing,
          firstDowns: { rushing: 1, passing: 0 },
          totalOffenseYards: 20,
        },
        away: zeroTotals("away"),
      },
      playerStats: [rushLine({ kind: "player", playerId: "home-22" }, 1, 20)],
      issues: [issue("unsupported_consequence", "p1")],
    });
  });

  describe("acting team", () => {
    const touchdown = rush(runningBack, 20);

    it("credits a play without a calculated situation to its observed possession", () => {
      const result = calculate(
        startAt(opponent(20)),
        log(touchdown, rush(awayRunner, 6, { possession: "away" })),
      );

      expect(result.plays[1]).toStrictEqual({ playId: "p2", before: null, after: null });
      expect(result.playerStats).toContainEqual(
        rushLine({ kind: "player", playerId: "away-1" }, 1, 6, "away"),
      );
      expect(result.teamStats.away.rushing).toStrictEqual({ attempts: 1, yards: 6 });
      expect(result.issues).toStrictEqual([issue("unsupported_consequence", "p1")]);
    });

    it("credits nothing and reports missing details when no team is known", () => {
      const result = calculate(startAt(opponent(20)), log(touchdown, rush(unknown33, 6)));

      expect(result.teamStats).toStrictEqual({
        home: {
          team: "home",
          rushing: { attempts: 1, yards: 20 },
          passing: noPassing,
          firstDowns: { rushing: 1, passing: 0 },
          totalOffenseYards: 20,
        },
        away: zeroTotals("away"),
      });
      expect(result.playerStats).toStrictEqual([
        rushLine({ kind: "player", playerId: "home-22" }, 1, 20),
      ]);
      expect(result.issues).toStrictEqual([
        issue("unsupported_consequence", "p1"),
        issue("missing_details", "p2"),
      ]);
    });
  });

  describe("credited team", () => {
    it("prefers the observed possession over the calculated one", () => {
      const result = calculate(startAt(own(25)), log(rush(awayRunner, 6, { possession: "away" })));

      expect(result.playerStats).toStrictEqual([
        rushLine({ kind: "player", playerId: "away-1" }, 1, 6, "away"),
      ]);
      expect(result.teamStats).toStrictEqual({
        home: zeroTotals("home"),
        away: {
          ...zeroTotals("away"),
          rushing: { attempts: 1, yards: 6 },
          totalOffenseYards: 6,
        },
      });
      expect(result.issues).toStrictEqual([issue("inconsistent_consequence", "p1")]);
    });

    it("uses the calculated possession when none is observed", () => {
      const result = calculate(startAt(own(25)), log(rush(runningBack, 4, { down: 1 })));

      expect(result.playerStats).toStrictEqual([
        rushLine({ kind: "player", playerId: "home-22" }, 1, 4),
      ]);
      expect(result.teamStats.home.rushing).toStrictEqual({ attempts: 1, yards: 4 });
      expect(result.teamStats.away).toStrictEqual(zeroTotals("away"));
      expect(result.issues).toStrictEqual([]);
    });

    it("uses the observed possession when no situation is calculated", () => {
      const result = calculate(
        startAt(opponent(20)),
        log(rush(runningBack, 20), rush(awayRunner, 6, { possession: "away" })),
      );

      expect(result.plays[1]).toStrictEqual({ playId: "p2", before: null, after: null });
      expect(result.playerStats).toStrictEqual([
        rushLine({ kind: "player", playerId: "home-22" }, 1, 20),
        rushLine({ kind: "player", playerId: "away-1" }, 1, 6, "away"),
      ]);
      expect(result.issues).toStrictEqual([issue("unsupported_consequence", "p1")]);
    });
  });

  describe("issues", () => {
    it("reports an unresolved identity for an unknown required actor", () => {
      const result = calculate(startAt(own(25)), log(rush(unknown33, -3)));

      expect(result.issues).toStrictEqual([issue("unresolved_identity", "p1")]);
      expect(result.playerStats).toStrictEqual([
        rushLine({ kind: "unresolved", observedJersey: 33 }, 1, -3),
      ]);
    });

    it("orders the issues of one play by code", () => {
      const result = calculate(startAt(opponent(20)), log(rush(unknown33, 20, { down: 2 })));

      expect(result.issues).toStrictEqual([
        issue("inconsistent_consequence", "p1"),
        issue("unresolved_identity", "p1"),
        issue("unsupported_consequence", "p1"),
      ]);
    });

    it("orders issues by play order, whatever the input order", () => {
      const [first, second] = log(rush(unknown33, 4), rush(runningBack, 3, { down: 3 }));
      const plays = [second, first].filter((play) => play !== undefined);

      expect(calculate(startAt(own(25)), plays).issues).toStrictEqual([
        issue("unresolved_identity", "p1"),
        issue("inconsistent_consequence", "p2"),
      ]);
    });
  });

  describe("purity", () => {
    const setup = startAt(opponent(20));
    const plays = log(
      rush(unknown33, 4),
      rush(runningBack, 6, { down: 3 }),
      rush(runningBack, 10),
      rush(awayRunner, 2),
    );

    it("leaves its deep-frozen input unchanged", () => {
      const input = { setup, plays };
      const inputCopy = copyOf(input);

      calculateGame(deepFreeze(input), PROTOTYPE_RULESET);

      expect(input).toStrictEqual(inputCopy);
    });

    it("returns identical results for identical inputs", () => {
      expect(calculate(setup, plays)).toStrictEqual(calculate(copyOf(setup), copyOf(plays)));
    });

    it("gives the same result whatever the input order", () => {
      expect(calculate(setup, [...plays].reverse())).toStrictEqual(calculate(setup, plays));
    });

    it("returns a result that survives a JSON round trip unchanged", () => {
      const result = calculate(setup, plays);

      expect(JSON.parse(JSON.stringify(result))).toStrictEqual(result);
    });
  });
});
