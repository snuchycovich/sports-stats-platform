import { PROTOTYPE_VERSIONS } from "@stats/domain";
import type {
  EngineOutput,
  GameSetup,
  PlayRevision,
  PlayerAttribution,
  PlayerStatLine,
  PlaySegment,
  TeamSide,
} from "@stats/domain";
import { describe, expect, expectTypeOf, it } from "vitest";
import {
  expectedAfterCorrection,
  expectedBeforeCorrection,
  referenceGameAfterCorrection,
  referenceGameBeforeCorrection,
  referenceGameRevisions,
  referenceGameSetup,
} from "./reference-game";

const currentLogs = [
  { name: "before correction", log: referenceGameBeforeCorrection },
  { name: "after correction", log: referenceGameAfterCorrection },
];

const attributionsOf = (segment: PlaySegment): readonly PlayerAttribution[] => {
  switch (segment.kind) {
    case "rush":
      return [segment.ballCarrier];
    case "reception":
      return [segment.passer, segment.receiver];
    case "incompletion":
      return segment.target === undefined ? [segment.passer] : [segment.passer, segment.target];
  }
};

const attributionsIn = (plays: readonly PlayRevision[]): readonly PlayerAttribution[] =>
  plays.flatMap((play) => play.observation.segments.flatMap(attributionsOf));

const findRevision = (playId: string, revision: number) =>
  referenceGameRevisions.find((play) => play.playId === playId && play.revision === revision);

const yardsOf = (play: PlayRevision | undefined) => {
  const segment = play?.observation.segments[0];
  return segment?.kind === "rush" ? segment.yards : undefined;
};

const lastPlay = (log: readonly PlayRevision[]) => log.at(-1);

const jerseyOf = (attribution: PlayerAttribution): string => {
  if (attribution.kind === "unknown") {
    return `?${attribution.observedJersey ?? ""}`;
  }
  const entry = referenceGameSetup.rosters.home.entries.find(
    ({ playerId }) => playerId === attribution.playerId,
  );
  return `#${entry?.jerseyNumber ?? "?"}`;
};

const summarize = (segment: PlaySegment): string => {
  switch (segment.kind) {
    case "rush":
      return `rush ${jerseyOf(segment.ballCarrier)} ${segment.yards}`;
    case "reception":
      return `complete ${jerseyOf(segment.passer)} to ${jerseyOf(segment.receiver)} ${segment.yards}`;
    case "incompletion":
      return segment.target === undefined
        ? `incomplete ${jerseyOf(segment.passer)}`
        : `incomplete ${jerseyOf(segment.passer)} to ${jerseyOf(segment.target)}`;
  }
};

describe("reference game fixture", () => {
  it("is typed with the domain types", () => {
    expectTypeOf(referenceGameSetup).toEqualTypeOf<GameSetup>();
    expectTypeOf(referenceGameRevisions).toEqualTypeOf<readonly PlayRevision[]>();
    expectTypeOf(referenceGameBeforeCorrection).toEqualTypeOf<readonly PlayRevision[]>();
    expectTypeOf(referenceGameAfterCorrection).toEqualTypeOf<readonly PlayRevision[]>();
  });

  describe("setup", () => {
    it("uses the prototype ruleset and statistical policy", () => {
      expect(referenceGameSetup.versions).toStrictEqual(PROTOTYPE_VERSIONS);
    });

    it("starts with the home team at its own 25", () => {
      expect(referenceGameSetup.startingContext).toStrictEqual({
        possession: "home",
        ballPosition: { side: "own", yardLine: 25 },
      });
    });

    it("has distinct teams whose rosters point back to them", () => {
      const { home, away, rosters } = referenceGameSetup;
      expect(home.id).not.toBe(away.id);
      expect(rosters.home.teamId).toBe(home.id);
      expect(rosters.away.teamId).toBe(away.id);
    });

    it("rosters home #7, #22, #81, #85 and a small away roster", () => {
      const homeJerseys = referenceGameSetup.rosters.home.entries.map(
        (entry) => entry.jerseyNumber,
      );
      expect(homeJerseys).toEqual(expect.arrayContaining([7, 22, 81, 85]));
      expect(referenceGameSetup.rosters.away.entries.length).toBeGreaterThan(0);
    });

    it("has unique player IDs and jersey numbers per roster", () => {
      for (const roster of [referenceGameSetup.rosters.home, referenceGameSetup.rosters.away]) {
        const playerIds = roster.entries.map((entry) => entry.playerId);
        const jerseys = roster.entries.map((entry) => entry.jerseyNumber);
        expect(new Set(playerIds).size).toBe(playerIds.length);
        expect(new Set(jerseys).size).toBe(jerseys.length);
      }
    });

    it("leaves #33 off every roster", () => {
      const allEntries = [
        ...referenceGameSetup.rosters.home.entries,
        ...referenceGameSetup.rosters.away.entries,
      ];
      expect(allEntries.map((entry) => entry.jerseyNumber)).not.toContain(33);
    });
  });

  describe("revision history", () => {
    it("holds the six plays at revision 1 and one correction of the last play", () => {
      expect(referenceGameRevisions).toHaveLength(7);
      expect(new Set(referenceGameRevisions.map((play) => play.playId)).size).toBe(6);
    });

    it("has unique (playId, revision) pairs", () => {
      const pairs = referenceGameRevisions.map((play) => `${play.playId}#${play.revision}`);
      expect(new Set(pairs).size).toBe(pairs.length);
    });

    it("numbers the revisions of each play consecutively from 1", () => {
      const playIds = new Set(referenceGameRevisions.map((play) => play.playId));
      for (const playId of playIds) {
        const numbers = referenceGameRevisions
          .filter((play) => play.playId === playId)
          .map((play) => play.revision)
          .sort((a, b) => a - b);
        expect(numbers).toStrictEqual(numbers.map((_, index) => index + 1));
      }
    });

    it("belongs to the setup game", () => {
      for (const play of referenceGameRevisions) {
        expect(play.gameId).toBe(referenceGameSetup.gameId);
      }
    });

    it("resolves every identified player to the home roster", () => {
      const homePlayerIds = referenceGameSetup.rosters.home.entries.map((entry) => entry.playerId);
      for (const attribution of attributionsIn(referenceGameRevisions)) {
        if (attribution.kind === "identified") {
          expect(homePlayerIds).toContain(attribution.playerId);
        }
      }
    });
  });

  describe.each(currentLogs)("current log $name", ({ log }) => {
    it("has the six plays once each", () => {
      const playIds = log.map((play) => play.playId);
      expect(playIds).toHaveLength(6);
      expect(new Set(playIds).size).toBe(6);
    });

    it("orders plays by strictly increasing order keys", () => {
      const keys = log.map((play) => play.orderKey);
      for (const [index, key] of keys.entries()) {
        const next = keys[index + 1];
        if (next !== undefined) {
          expect(key < next).toBe(true);
        }
      }
    });

    it("leaves gaps between order keys for insertion", () => {
      const keys = log.map((play) => play.orderKey);
      for (const key of keys) {
        expect(key).toMatch(/^\d+$/);
        expect(key).toHaveLength(keys[0]?.length ?? 0);
      }
      for (const [index, key] of keys.entries()) {
        const next = keys[index + 1];
        if (next !== undefined) {
          expect(Number(next) - Number(key)).toBeGreaterThan(1);
        }
      }
    });

    it("contains only revisions recorded in the history", () => {
      for (const play of log) {
        expect(findRevision(play.playId, play.revision)).toStrictEqual(play);
      }
    });
  });

  describe("correction of the last play", () => {
    const before = lastPlay(referenceGameBeforeCorrection);
    const after = lastPlay(referenceGameAfterCorrection);

    it("leaves the first five plays unchanged", () => {
      expect(referenceGameAfterCorrection.slice(0, 5)).toStrictEqual(
        referenceGameBeforeCorrection.slice(0, 5),
      );
    });

    it("corrects the same play from +2 at revision 1 to +4 at revision 2", () => {
      expect(after?.playId).toBe(before?.playId);
      expect(after?.orderKey).toBe(before?.orderKey);
      expect(before?.revision).toBe(1);
      expect(after?.revision).toBe(2);
      expect(yardsOf(before)).toBe(2);
      expect(yardsOf(after)).toBe(4);
    });

    it("keeps revision 1 unchanged in the history", () => {
      expect(before).toBeDefined();
      expect(findRevision(before?.playId ?? "", 1)).toStrictEqual(before);
    });
  });

  describe("profile series", () => {
    it("replays the six plays of the prototype profile example", () => {
      expect(
        referenceGameBeforeCorrection.map((play) => play.observation.segments.map(summarize)),
      ).toStrictEqual([
        ["rush #22 4"],
        ["complete #7 to #81 27"],
        ["incomplete #7 to #81"],
        ["rush ?33 -3"],
        ["complete #7 to #85 9"],
        ["rush #22 2"],
      ]);
    });
  });

  describe("unresolved player", () => {
    it("records play 4 as a rush by unknown #33 needing details", () => {
      const play = referenceGameBeforeCorrection[3];
      expect(play?.captureCompleteness).toBe("needs_details");
      expect(play?.observation.outcome).toBe("rush");
      expect(play?.observation.segments).toStrictEqual([
        { kind: "rush", ballCarrier: { kind: "unknown", observedJersey: 33 }, yards: -3 },
      ]);
    });
  });

  it("survives a JSON round trip unchanged", () => {
    const fixture = {
      referenceGameSetup,
      referenceGameRevisions,
      referenceGameBeforeCorrection,
      referenceGameAfterCorrection,
    };
    expect(JSON.parse(JSON.stringify(fixture))).toStrictEqual(fixture);
  });
});

describe("expected snapshots", () => {
  const snapshots = [
    {
      name: "before correction",
      expected: expectedBeforeCorrection,
      log: referenceGameBeforeCorrection,
    },
    {
      name: "after correction",
      expected: expectedAfterCorrection,
      log: referenceGameAfterCorrection,
    },
  ];
  const teams: readonly TeamSide[] = ["home", "away"];

  const sum = (lines: readonly PlayerStatLine[], value: (line: PlayerStatLine) => number) =>
    lines.reduce((total, line) => total + value(line), 0);

  const compareStrings = (a: string, b: string): number => (a < b ? -1 : Number(a > b));
  const subjectRank = { player: 0, team: 1, unresolved: 2 } as const;
  const teamRank = { home: 0, away: 1 } as const;
  const subjectKey = (line: PlayerStatLine): string | number => {
    switch (line.subject.kind) {
      case "player":
        return line.subject.playerId;
      case "unresolved":
        return line.subject.observedJersey ?? Number.POSITIVE_INFINITY;
      case "team":
        return "";
    }
  };
  const compareLines = (a: PlayerStatLine, b: PlayerStatLine): number => {
    const keyA = subjectKey(a);
    const keyB = subjectKey(b);
    return (
      teamRank[a.team] - teamRank[b.team] ||
      subjectRank[a.subject.kind] - subjectRank[b.subject.kind] ||
      (typeof keyA === "number" && typeof keyB === "number"
        ? keyA - keyB
        : compareStrings(String(keyA), String(keyB)))
    );
  };

  it("is typed as an engine output without versions", () => {
    expectTypeOf(expectedBeforeCorrection).toEqualTypeOf<Omit<EngineOutput, "versions">>();
    expectTypeOf(expectedAfterCorrection).toEqualTypeOf<Omit<EngineOutput, "versions">>();
  });

  describe.each(snapshots)("$name", ({ expected, log }) => {
    it.each(teams)("sums the %s player lines into the team totals", (team) => {
      const lines = expected.playerStats.filter((line) => line.team === team);
      const totals = expected.teamStats[team];

      expect(totals.team).toBe(team);
      expect(totals.rushing).toStrictEqual({
        attempts: sum(lines, (line) => line.rushing.attempts),
        yards: sum(lines, (line) => line.rushing.yards),
      });
      expect(totals.passing).toStrictEqual({
        attempts: sum(lines, (line) => line.passing.attempts),
        completions: sum(lines, (line) => line.passing.completions),
        yards: sum(lines, (line) => line.passing.yards),
      });
    });

    it.each(teams)("counts %s total offense as rushing plus passing yards", (team) => {
      const totals = expected.teamStats[team];

      expect(totals).not.toHaveProperty("receiving");
      expect(totals.totalOffenseYards).toBe(totals.rushing.yards + totals.passing.yards);
    });

    it.each(teams)("credits %s receiving yards equal to passing yards", (team) => {
      const lines = expected.playerStats.filter((line) => line.team === team);

      expect(sum(lines, (line) => line.receiving.yards)).toBe(
        expected.teamStats[team].passing.yards,
      );
    });

    it("refers only to plays of the current log, in log order", () => {
      const logIds = log.map((play) => play.playId);
      const playIndexes = expected.plays.map((play) => logIds.indexOf(play.playId));

      expect(playIndexes).not.toContain(-1);
      expect(playIndexes).toStrictEqual([...playIndexes].sort((a, b) => a - b));
      expect(new Set(playIndexes).size).toBe(playIndexes.length);
      for (const issue of expected.issues) {
        expect(logIds).toContain(issue.playId);
      }
    });

    it("orders issues by play, then code", () => {
      const logIds = log.map((play) => play.playId);
      const sorted = [...expected.issues].sort(
        (a, b) =>
          logIds.indexOf(a.playId) - logIds.indexOf(b.playId) || compareStrings(a.code, b.code),
      );

      expect(expected.issues).toStrictEqual(sorted);
    });

    it("orders player lines home to away, then player, team, unresolved, then id or jersey", () => {
      expect(expected.playerStats).toStrictEqual([...expected.playerStats].sort(compareLines));
    });

    it("resolves every player subject to its team's roster", () => {
      for (const line of expected.playerStats) {
        if (line.subject.kind === "player") {
          const roster = referenceGameSetup.rosters[line.team];
          expect(roster.entries.map((entry) => entry.playerId)).toContain(line.subject.playerId);
        }
      }
    });

    it("keeps the unknown carrier as an unresolved #33 line", () => {
      const unresolved = expected.playerStats.filter((line) => line.subject.kind === "unresolved");

      expect(unresolved.length).toBeGreaterThan(0);
      for (const line of unresolved) {
        expect(line.subject).toStrictEqual({ kind: "unresolved", observedJersey: 33 });
      }
    });
  });

  it("changes at least one team total and the final situation after the correction", () => {
    expect(expectedAfterCorrection.teamStats).not.toStrictEqual(expectedBeforeCorrection.teamStats);
    expect(expectedAfterCorrection.situation).not.toStrictEqual(expectedBeforeCorrection.situation);
  });

  it("survives a JSON round trip unchanged", () => {
    const snapshotsOnly = { expectedBeforeCorrection, expectedAfterCorrection };
    expect(JSON.parse(JSON.stringify(snapshotsOnly))).toStrictEqual(snapshotsOnly);
  });
});
