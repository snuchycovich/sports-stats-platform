import { PROTOTYPE_RULESET, calculateGame, selectCurrentPlays } from "@stats/domain";
import type {
  EngineIssue,
  FieldPosition,
  ObservedContext,
  PlayObservation,
  PlayRevision,
  PlayerAttribution,
  Situation,
  TeamStatLine,
} from "@stats/domain";
import { describe, expect, it } from "vitest";
import {
  expectedAfterCorrection,
  referenceGameRevisions,
  referenceGameSetup,
} from "./reference-game";

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

const calculateFrom = (history: readonly PlayRevision[]) =>
  calculateGame(
    deepFreeze({ setup: referenceGameSetup, plays: selectCurrentPlays(deepFreeze(history)) }),
    PROTOTYPE_RULESET,
  );

const own = (yardLine: number): FieldPosition => ({ side: "own", yardLine });
const opponent = (yardLine: number): FieldPosition => ({ side: "opponent", yardLine });

const situation = (
  possession: Situation["possession"],
  down: Situation["down"],
  ballPosition: FieldPosition,
  line: FieldPosition,
): Situation => ({
  possession,
  down,
  ballPosition,
  lineToGain: { kind: "position", position: line },
});

const player = (playerId: string): PlayerAttribution => ({ kind: "identified", playerId });

const withContext = (observedContext: ObservedContext | undefined) =>
  observedContext === undefined ? {} : { observedContext };

const rush = (
  ballCarrier: PlayerAttribution,
  yards: number,
  observedContext?: ObservedContext,
): PlayObservation => ({
  family: "rush",
  outcome: "rush",
  period: 1,
  ...withContext(observedContext),
  segments: [{ kind: "rush", ballCarrier, yards }],
});

const complete = (
  passer: PlayerAttribution,
  receiver: PlayerAttribution,
  yards: number,
  observedContext?: ObservedContext,
): PlayObservation => ({
  family: "pass",
  outcome: "complete",
  period: 1,
  ...withContext(observedContext),
  segments: [{ kind: "reception", passer, receiver, yards }],
});

const newPlay = (
  playId: string,
  orderKey: string,
  observation: PlayObservation,
  revision = 1,
): PlayRevision => ({
  playId,
  gameId: referenceGameSetup.gameId,
  orderKey,
  revision,
  payloadVersion: 1,
  captureCompleteness: "complete",
  reviewStatus: "confirmed",
  observation,
});

const recorded = (playId: string, revision = 1): PlayRevision => {
  const found = referenceGameRevisions.find(
    (play) => play.playId === playId && play.revision === revision,
  );
  if (found === undefined) {
    throw new Error(`${playId} revision ${revision} is not in the fixture`);
  }
  return found;
};

const issue = (code: EngineIssue["code"], playId: string): EngineIssue => ({ code, playId });
const unresolvedOnPlay4 = issue("unresolved_identity", "ref-play-4");

const inconsistentPlays = (issues: readonly EngineIssue[]) =>
  issues.filter(({ code }) => code === "inconsistent_consequence").map(({ playId }) => playId);

const historyBeforePlay6Correction = referenceGameRevisions.filter(
  (play) => !(play.playId === "ref-play-6" && play.revision === 2),
);

const observationsOf = (history: readonly PlayRevision[]) =>
  history.map(({ observation }) => observation);

const awayPlays = (observedContexts: readonly (ObservedContext | undefined)[]) => {
  const [play7, play8, play9] = observedContexts;
  return [
    newPlay("ref-play-7", "0700", rush(player("away-1"), 3, play7)),
    newPlay("ref-play-8", "0800", complete(player("away-12"), player("away-55"), 8, play8)),
    newPlay("ref-play-9", "0900", rush(player("away-1"), 2, play9)),
  ];
};

const awayTotalsOfPlays7To9: TeamStatLine = {
  team: "away",
  rushing: { attempts: 2, yards: 5 },
  passing: { attempts: 1, completions: 1, yards: 8 },
  firstDowns: { rushing: 0, passing: 1 },
  totalOffenseYards: 13,
};

const awayLinesOfPlays7To9 = [
  {
    team: "away",
    subject: { kind: "player", playerId: "away-1" },
    rushing: { attempts: 2, yards: 5 },
    passing: { attempts: 0, completions: 0, yards: 0 },
    receiving: { receptions: 0, yards: 0 },
  },
  {
    team: "away",
    subject: { kind: "player", playerId: "away-12" },
    rushing: { attempts: 0, yards: 0 },
    passing: { attempts: 1, completions: 1, yards: 8 },
    receiving: { receptions: 0, yards: 0 },
  },
  {
    team: "away",
    subject: { kind: "player", playerId: "away-55" },
    rushing: { attempts: 0, yards: 0 },
    passing: { attempts: 0, completions: 0, yards: 0 },
    receiving: { receptions: 1, yards: 8 },
  },
];

describe("reference game corrections", () => {
  describe("reference correction of play 6", () => {
    it("equals the expected snapshot after the correction", () => {
      const { versions: _versions, ...output } = calculateFrom(referenceGameRevisions);

      expect(output).toStrictEqual(expectedAfterCorrection);
    });

    it("leaves the revision history unchanged", () => {
      const historyCopy = copyOf(referenceGameRevisions);

      calculateFrom(referenceGameRevisions);

      expect(referenceGameRevisions).toStrictEqual(historyCopy);
    });

    it("does not count superseded revisions: home rushing is 3 for 5, not 4 for 7", () => {
      expect(calculateFrom(referenceGameRevisions).teamStats.home.rushing).toStrictEqual({
        attempts: 3,
        yards: 5,
      });
    });
  });

  describe("play 5 corrected from +9 to +14", () => {
    const play5Correction = newPlay(
      "ref-play-5",
      "0500",
      complete(player("home-7"), player("home-85"), 14, {
        possession: "home",
        down: 3,
        distance: 13,
        ballPosition: opponent(47),
      }),
      2,
    );
    const history = [...historyBeforePlay6Correction, play5Correction];

    it("ends play 5 at 1st & 10 opponent 33", () => {
      expect(calculateFrom(history).plays[4]).toStrictEqual({
        playId: "ref-play-5",
        before: situation("home", 3, opponent(47), opponent(34)),
        after: situation("home", 1, opponent(33), opponent(23)),
      });
    });

    it("credits 2 of 3 passing for 41 yards and 2 passing first downs", () => {
      expect(calculateFrom(history).teamStats.home).toStrictEqual({
        team: "home",
        rushing: { attempts: 3, yards: 3 },
        passing: { attempts: 3, completions: 2, yards: 41 },
        firstDowns: { rushing: 0, passing: 2 },
        totalOffenseYards: 44,
      });
    });

    it("flags play 6 once and continues from its observed 4th & 4 to the turnover on downs", () => {
      const output = calculateFrom(history);

      expect(output.issues).toStrictEqual([
        unresolvedOnPlay4,
        issue("inconsistent_consequence", "ref-play-6"),
      ]);
      expect(output.plays[5]).toStrictEqual({
        playId: "ref-play-6",
        before: situation("home", 4, opponent(38), opponent(34)),
        after: situation("away", 1, own(36), own(46)),
      });
      expect(output.situation).toStrictEqual(situation("away", 1, own(36), own(46)));
    });
  });

  describe("possession change after the play 6 correction", () => {
    it("flags only play 7 when it has a complete observed context", () => {
      const history = [
        ...referenceGameRevisions,
        ...awayPlays([
          { possession: "away", down: 1, distance: 10, ballPosition: own(36) },
          undefined,
          undefined,
        ]),
      ];

      const output = calculateFrom(history);

      expect(inconsistentPlays(output.issues)).toStrictEqual(["ref-play-7"]);
      expect(output.plays.slice(6)).toStrictEqual([
        {
          playId: "ref-play-7",
          before: situation("away", 1, own(36), own(46)),
          after: situation("away", 2, own(39), own(46)),
        },
        {
          playId: "ref-play-8",
          before: situation("away", 2, own(39), own(46)),
          after: situation("away", 1, own(47), opponent(43)),
        },
        {
          playId: "ref-play-9",
          before: situation("away", 1, own(47), opponent(43)),
          after: situation("away", 2, own(49), opponent(43)),
        },
      ]);
      expect(output.teamStats).toStrictEqual({
        home: expectedAfterCorrection.teamStats.home,
        away: awayTotalsOfPlays7To9,
      });
      expect(output.playerStats.filter(({ team }) => team === "away")).toStrictEqual(
        awayLinesOfPlays7To9,
      );
    });

    it("flags plays 7, 8, and 9 when each observes only the away possession", () => {
      const awayOnly: ObservedContext = { possession: "away" };
      const history = [...referenceGameRevisions, ...awayPlays([awayOnly, awayOnly, awayOnly])];

      const output = calculateFrom(history);

      expect(inconsistentPlays(output.issues)).toStrictEqual([
        "ref-play-7",
        "ref-play-8",
        "ref-play-9",
      ]);
      expect(output.teamStats).toStrictEqual({
        home: expectedAfterCorrection.teamStats.home,
        away: awayTotalsOfPlays7To9,
      });
      expect(output.playerStats.filter(({ team }) => team === "away")).toStrictEqual(
        awayLinesOfPlays7To9,
      );
    });
  });

  describe("missed play", () => {
    const withoutPlay3 = referenceGameRevisions.filter(({ playId }) => playId !== "ref-play-3");

    it("flags play 4 once when play 3 is missing", () => {
      expect(inconsistentPlays(calculateFrom(withoutPlay3).issues)).toStrictEqual(["ref-play-4"]);
    });

    it("flags nothing once play 3 is inserted again with order key 0250", () => {
      const reinserted = newPlay(
        "ref-play-3-reinserted",
        "0250",
        recorded("ref-play-3").observation,
      );

      const output = calculateFrom([...withoutPlay3, reinserted]);

      expect(output.issues).toStrictEqual([unresolvedOnPlay4]);
      expect(output.plays.map(({ playId }) => playId)).toStrictEqual([
        "ref-play-1",
        "ref-play-2",
        "ref-play-3-reinserted",
        "ref-play-4",
        "ref-play-5",
        "ref-play-6",
      ]);
      expect(output.teamStats).toStrictEqual(expectedAfterCorrection.teamStats);
      expect(output.playerStats).toStrictEqual(expectedAfterCorrection.playerStats);
    });
  });

  describe("observations", () => {
    const scenarios = [
      { name: "the reference correction", history: referenceGameRevisions },
      {
        name: "a possession change",
        history: [
          ...referenceGameRevisions,
          ...awayPlays([{ possession: "away" }, undefined, { possession: "away" }]),
        ],
      },
      {
        name: "a missed play",
        history: referenceGameRevisions.filter(({ playId }) => playId !== "ref-play-3"),
      },
    ];

    it.each(scenarios)("are unchanged by calculating $name", ({ history }) => {
      const observationsCopy = copyOf(observationsOf(history));

      calculateFrom(history);

      expect(observationsOf(history)).toStrictEqual(observationsCopy);
    });

    it.each(scenarios)("give identical results for identical inputs in $name", ({ history }) => {
      expect(calculateFrom(history)).toStrictEqual(calculateFrom(copyOf(history)));
    });

    it.each(scenarios)("give a result that survives a JSON round trip in $name", ({ history }) => {
      const output = calculateFrom(history);

      expect(JSON.parse(JSON.stringify(output))).toStrictEqual(output);
    });
  });
});
