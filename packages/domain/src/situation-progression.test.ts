import { describe, expect, expectTypeOf, it } from "vitest";
import type { EngineInput, EngineIssue, PlaySituationResult } from "./engine";
import { PROTOTYPE_VERSIONS } from "./game-setup";
import type { FieldPosition, GameSetup, StartingContext } from "./game-setup";
import type { PlayObservation } from "./play-observation";
import type { PlayRevision } from "./play-revision";
import { PROTOTYPE_RULESET } from "./ruleset";
import type { Ruleset } from "./ruleset";
import { initialSituation } from "./series";
import type { Down, LineToGain, ObservedContext, Situation } from "./situation";
import { progressSituations } from "./situation-progression";

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

const goal: LineToGain = { kind: "goal" };
const lineAt = (position: FieldPosition): LineToGain => ({ kind: "position", position });

const home = (down: Down, ballPosition: FieldPosition, lineToGain: LineToGain): Situation => ({
  possession: "home",
  down,
  ballPosition,
  lineToGain,
});

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

const startAtOwn25 = setupFrom({ possession: "home", ballPosition: own(25) });
const startAtOpponent20 = setupFrom({ possession: "home", ballPosition: opponent(20) });

const rush = (yards: number, observedContext?: ObservedContext): PlayObservation => ({
  family: "rush",
  outcome: "rush",
  period: 1,
  ...(observedContext === undefined ? {} : { observedContext }),
  segments: [{ kind: "rush", ballCarrier: { kind: "unknown" }, yards }],
});

const play = (playId: string, orderKey: string, observation: PlayObservation): PlayRevision => ({
  playId,
  gameId: "game",
  orderKey,
  revision: 1,
  payloadVersion: 1,
  captureCompleteness: "complete",
  reviewStatus: "confirmed",
  observation,
});

const progress = (setup: GameSetup, plays: readonly PlayRevision[]) =>
  progressSituations(deepFreeze({ setup, plays }), PROTOTYPE_RULESET);

const issue = (code: EngineIssue["code"], playId: string): EngineIssue => ({ code, playId });

describe("progressSituations", () => {
  it("takes an engine input and a ruleset", () => {
    expectTypeOf(progressSituations).parameters.toEqualTypeOf<
      [input: EngineInput, ruleset: Ruleset]
    >();
  });

  it("returns readonly plays, the current situation, and issues", () => {
    expectTypeOf(progressSituations).returns.toEqualTypeOf<{
      readonly plays: readonly PlaySituationResult[];
      readonly situation: Situation | null;
      readonly issues: readonly EngineIssue[];
    }>();
  });

  it("starts from the initial situation when the log is empty", () => {
    expect(progress(startAtOwn25, [])).toStrictEqual({
      plays: [],
      situation: initialSituation(startAtOwn25.startingContext, PROTOTYPE_RULESET),
      issues: [],
    });
  });

  it("chains each play from the previous situation", () => {
    const result = progress(startAtOwn25, [
      play("p1", "0100", rush(4)),
      play("p2", "0200", rush(3)),
    ]);

    expect(result).toStrictEqual({
      plays: [
        {
          playId: "p1",
          before: home(1, own(25), lineAt(own(35))),
          after: home(2, own(29), lineAt(own(35))),
        },
        {
          playId: "p2",
          before: home(2, own(29), lineAt(own(35))),
          after: home(3, own(32), lineAt(own(35))),
        },
      ],
      situation: home(3, own(32), lineAt(own(35))),
      issues: [],
    });
  });

  describe("order", () => {
    const first = play("p1", "0100", rush(4));
    const second = play("p2", "0200", rush(3));
    const third = play("p3", "0300", rush(12));

    it("gives the same result whatever the input order", () => {
      expect(progress(startAtOwn25, [third, first, second])).toStrictEqual(
        progress(startAtOwn25, [first, second, third]),
      );
    });

    it("compares order keys as strings", () => {
      const result = progress(startAtOwn25, [
        play("nine", "9", rush(3)),
        play("ten", "10", rush(4)),
      ]);

      expect(result.plays.map(({ playId }) => playId)).toStrictEqual(["ten", "nine"]);
      expect(result.plays[0]?.before).toStrictEqual(home(1, own(25), lineAt(own(35))));
    });
  });

  describe("unsupported consequence", () => {
    const firstPlay = play("p1", "0100", rush(5));
    const touchdown = play("p2", "0200", rush(15));
    const firstPlayResult: PlaySituationResult = {
      playId: "p1",
      before: home(1, opponent(20), lineAt(opponent(10))),
      after: home(2, opponent(15), lineAt(opponent(10))),
    };
    const touchdownResult: PlaySituationResult = {
      playId: "p2",
      before: home(2, opponent(15), lineAt(opponent(10))),
      after: null,
    };

    it("reports the touchdown and restarts from the next complete observed context", () => {
      const restart = rush(4, {
        possession: "away",
        down: 1,
        distance: 10,
        ballPosition: own(25),
      });

      expect(
        progress(startAtOpponent20, [firstPlay, touchdown, play("p3", "0300", restart)]),
      ).toStrictEqual({
        plays: [
          firstPlayResult,
          touchdownResult,
          {
            playId: "p3",
            before: {
              possession: "away",
              down: 1,
              ballPosition: own(25),
              lineToGain: lineAt(own(35)),
            },
            after: {
              possession: "away",
              down: 2,
              ballPosition: own(29),
              lineToGain: lineAt(own(35)),
            },
          },
        ],
        situation: {
          possession: "away",
          down: 2,
          ballPosition: own(29),
          lineToGain: lineAt(own(35)),
        },
        issues: [issue("unsupported_consequence", "p2")],
      });
    });

    it("leaves the next play uncalculated when it has no observed context", () => {
      expect(
        progress(startAtOpponent20, [firstPlay, touchdown, play("p3", "0300", rush(4))]),
      ).toStrictEqual({
        plays: [firstPlayResult, touchdownResult, { playId: "p3", before: null, after: null }],
        situation: null,
        issues: [issue("unsupported_consequence", "p2")],
      });
    });

    it("stays uncalculated until a complete observed context appears", () => {
      const partial = rush(4, { possession: "away", down: 1 });
      const complete = rush(2, {
        possession: "away",
        down: 2,
        distance: "goal",
        ballPosition: opponent(8),
      });

      const result = progress(startAtOpponent20, [
        firstPlay,
        touchdown,
        play("p3", "0300", partial),
        play("p4", "0400", complete),
      ]);

      expect(result.plays.slice(2)).toStrictEqual([
        { playId: "p3", before: null, after: null },
        {
          playId: "p4",
          before: { possession: "away", down: 2, ballPosition: opponent(8), lineToGain: goal },
          after: { possession: "away", down: 3, ballPosition: opponent(6), lineToGain: goal },
        },
      ]);
      expect(result.issues).toStrictEqual([issue("unsupported_consequence", "p2")]);
    });

    it("reports a safety with no following situation", () => {
      const setup = setupFrom({ possession: "home", ballPosition: own(3) });

      expect(progress(setup, [play("p1", "0100", rush(-3))])).toStrictEqual({
        plays: [{ playId: "p1", before: home(1, own(3), lineAt(own(13))), after: null }],
        situation: null,
        issues: [issue("unsupported_consequence", "p1")],
      });
    });
  });

  describe("observed context", () => {
    it("is not flagged when it matches the calculation", () => {
      const result = progress(startAtOwn25, [
        play("p1", "0100", rush(4)),
        play(
          "p2",
          "0200",
          rush(3, { possession: "home", down: 2, distance: 6, ballPosition: own(29) }),
        ),
      ]);

      expect(result.issues).toStrictEqual([]);
    });

    it("flags an incomplete context that differs and continues from the calculation", () => {
      const contradicted = play("p2", "0200", rush(3, { down: 3 }));
      const observationCopy = copyOf(contradicted.observation);

      const result = progress(startAtOwn25, [
        play("p1", "0100", rush(4)),
        contradicted,
        play("p3", "0300", rush(1, { down: 3, distance: 3, ballPosition: own(32) })),
      ]);

      expect(result.issues).toStrictEqual([issue("inconsistent_consequence", "p2")]);
      expect(result.plays[1]).toStrictEqual({
        playId: "p2",
        before: home(2, own(29), lineAt(own(35))),
        after: home(3, own(32), lineAt(own(35))),
      });
      expect(contradicted.observation).toStrictEqual(observationCopy);
    });

    it("flags a complete context that differs and continues from the observed context", () => {
      const contradicted = play(
        "p2",
        "0200",
        rush(4, { possession: "home", down: 2, distance: 6, ballPosition: own(30) }),
      );
      const observationCopy = copyOf(contradicted.observation);

      const result = progress(startAtOwn25, [
        play("p1", "0100", rush(4)),
        contradicted,
        play(
          "p3",
          "0300",
          rush(1, { possession: "home", down: 3, distance: 2, ballPosition: own(34) }),
        ),
      ]);

      expect(result.issues).toStrictEqual([issue("inconsistent_consequence", "p2")]);
      expect(result.plays.slice(1)).toStrictEqual([
        {
          playId: "p2",
          before: home(2, own(30), lineAt(own(36))),
          after: home(3, own(34), lineAt(own(36))),
        },
        {
          playId: "p3",
          before: home(3, own(34), lineAt(own(36))),
          after: home(4, own(35), lineAt(own(36))),
        },
      ]);
      expect(contradicted.observation).toStrictEqual(observationCopy);
    });

    it("orders the issues of one play by code", () => {
      const result = progress(startAtOpponent20, [play("p1", "0100", rush(20, { down: 2 }))]);

      expect(result.issues).toStrictEqual([
        issue("inconsistent_consequence", "p1"),
        issue("unsupported_consequence", "p1"),
      ]);
    });
  });

  describe("purity", () => {
    const plays = [
      play("p1", "0100", rush(4)),
      play("p2", "0200", rush(3, { down: 4 })),
      play("p3", "0300", rush(20)),
    ];

    it("leaves its deep-frozen input unchanged", () => {
      const input = { setup: startAtOwn25, plays };
      const inputCopy = copyOf(input);

      progressSituations(deepFreeze(input), PROTOTYPE_RULESET);

      expect(input).toStrictEqual(inputCopy);
    });

    it("returns identical results for identical inputs", () => {
      expect(progress(startAtOwn25, plays)).toStrictEqual(
        progress(copyOf(startAtOwn25), copyOf(plays)),
      );
    });

    it("returns a result that survives a JSON round trip unchanged", () => {
      const result = progress(startAtOwn25, plays);

      expect(JSON.parse(JSON.stringify(result))).toStrictEqual(result);
    });
  });
});
