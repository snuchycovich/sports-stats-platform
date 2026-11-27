import { describe, expect, expectTypeOf, it } from "vitest";
import type {
  PassingLine,
  PlayerStatLine,
  ReceivingLine,
  RushingLine,
  StatSubject,
  TeamStatLine,
} from "./engine";
import type { FirstDownCredit } from "./first-downs";
import type { TeamSide } from "./game-setup";
import { aggregateStatistics } from "./statistics";

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

const noRushing: RushingLine = { attempts: 0, yards: 0 };
const noPassing: PassingLine = { attempts: 0, completions: 0, yards: 0 };
const noReceiving: ReceivingLine = { receptions: 0, yards: 0 };

const player = (playerId: string): StatSubject => ({ kind: "player", playerId });
const unresolved = (observedJersey: number): StatSubject => ({
  kind: "unresolved",
  observedJersey,
});
const unresolvedWithoutJersey: StatSubject = { kind: "unresolved" };
const teamSubject: StatSubject = { kind: "team" };

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

const rushLine = (subject: StatSubject, yards: number, team: TeamSide = "home") =>
  line(subject, { rushing: { attempts: 1, yards } }, team);

const completion = (passer: StatSubject, receiver: StatSubject, yards: number) => [
  line(passer, { passing: { attempts: 1, completions: 1, yards } }),
  line(receiver, { receiving: { receptions: 1, yards } }),
];

const zeroTotals = (team: TeamSide): TeamStatLine => ({
  team,
  rushing: noRushing,
  passing: noPassing,
  firstDowns: { rushing: 0, passing: 0 },
  totalOffenseYards: 0,
});

const aggregate = (
  credits: readonly PlayerStatLine[],
  firstDowns: readonly FirstDownCredit[] = [],
) => aggregateStatistics(deepFreeze(credits), deepFreeze(firstDowns));

describe("aggregateStatistics", () => {
  it("takes the play credits and the first downs", () => {
    expectTypeOf(aggregateStatistics).parameters.toEqualTypeOf<
      [credits: readonly PlayerStatLine[], firstDowns: readonly FirstDownCredit[]]
    >();
  });

  it("returns readonly team totals and player lines", () => {
    expectTypeOf(aggregateStatistics).returns.toEqualTypeOf<{
      readonly teamStats: { readonly home: TeamStatLine; readonly away: TeamStatLine };
      readonly playerStats: readonly PlayerStatLine[];
    }>();
  });

  it("gives both teams zero totals and no lines when there is nothing to credit", () => {
    expect(aggregate([])).toStrictEqual({
      teamStats: { home: zeroTotals("home"), away: zeroTotals("away") },
      playerStats: [],
    });
  });

  describe("player lines", () => {
    it("sums the lines of the same player", () => {
      expect(
        aggregate([rushLine(player("home-22"), 4), rushLine(player("home-22"), 2)]).playerStats,
      ).toStrictEqual([line(player("home-22"), { rushing: { attempts: 2, yards: 6 } })]);
    });

    it("merges two unresolved #33 rushes into one line", () => {
      expect(
        aggregate([rushLine(unresolved(33), -3), rushLine(unresolved(33), 5)]).playerStats,
      ).toStrictEqual([line(unresolved(33), { rushing: { attempts: 2, yards: 2 } })]);
    });

    it("keeps #33 and an unresolved player without a jersey apart", () => {
      expect(
        aggregate([rushLine(unresolved(33), -3), rushLine(unresolvedWithoutJersey, 4)]).playerStats,
      ).toStrictEqual([rushLine(unresolved(33), -3), rushLine(unresolvedWithoutJersey, 4)]);
    });

    it("merges unresolved players without a jersey into one line without a jersey", () => {
      const [merged, ...others] = aggregate([
        rushLine(unresolvedWithoutJersey, 4),
        rushLine(unresolvedWithoutJersey, 1),
      ]).playerStats;

      expect(merged).toStrictEqual(
        line(unresolvedWithoutJersey, { rushing: { attempts: 2, yards: 5 } }),
      );
      expect(merged?.subject).not.toHaveProperty("observedJersey");
      expect(others).toStrictEqual([]);
    });

    it("keeps the same subject of different teams apart", () => {
      expect(
        aggregate([rushLine(unresolved(33), 3, "away"), rushLine(unresolved(33), 4)]).playerStats,
      ).toStrictEqual([rushLine(unresolved(33), 4), rushLine(unresolved(33), 3, "away")]);
    });

    it("orders home then away; player, team, unresolved; then id or jersey, no jersey last", () => {
      const lines = [
        rushLine(unresolvedWithoutJersey, 1),
        rushLine(player("away-12"), 1, "away"),
        rushLine(unresolved(33), 1),
        rushLine(teamSubject, 1),
        rushLine(player("home-7"), 1),
        rushLine(unresolved(5), 1),
        rushLine(player("home-22"), 1),
        rushLine(teamSubject, 1, "away"),
      ];

      expect(aggregate(lines).playerStats).toStrictEqual([
        rushLine(player("home-22"), 1),
        rushLine(player("home-7"), 1),
        rushLine(teamSubject, 1),
        rushLine(unresolved(5), 1),
        rushLine(unresolved(33), 1),
        rushLine(unresolvedWithoutJersey, 1),
        rushLine(player("away-12"), 1, "away"),
        rushLine(teamSubject, 1, "away"),
      ]);
    });
  });

  describe("team totals", () => {
    it("include the Team line of a kneel-down, which is not a player line", () => {
      const result = aggregate([rushLine(teamSubject, -2)]);

      expect(result.teamStats.home).toStrictEqual({
        ...zeroTotals("home"),
        rushing: { attempts: 1, yards: -2 },
        totalOffenseYards: -2,
      });
      expect(result.playerStats).toStrictEqual([rushLine(teamSubject, -2)]);
      expect(result.playerStats.filter(({ subject }) => subject.kind === "player")).toStrictEqual(
        [],
      );
    });

    it("count a 27-yard completion once in total offense, not 54", () => {
      const result = aggregate(completion(player("home-7"), player("home-81"), 27));

      expect(result.teamStats.home).toStrictEqual({
        ...zeroTotals("home"),
        passing: { attempts: 1, completions: 1, yards: 27 },
        totalOffenseYards: 27,
      });
      expect(result.teamStats.home).not.toHaveProperty("receiving");
    });

    it("sum player, Team, and unresolved lines, and add rushing and passing yards", () => {
      const result = aggregate([
        rushLine(player("home-22"), 4),
        rushLine(unresolved(33), -3),
        rushLine(teamSubject, -2),
        ...completion(player("home-7"), unresolvedWithoutJersey, 9),
        line(teamSubject, { passing: { attempts: 1, completions: 0, yards: 0 } }),
      ]);

      expect(result.teamStats.home).toStrictEqual({
        team: "home",
        rushing: { attempts: 3, yards: -1 },
        passing: { attempts: 2, completions: 1, yards: 9 },
        firstDowns: { rushing: 0, passing: 0 },
        totalOffenseYards: 8,
      });
    });

    it("credit each team with its own lines", () => {
      const result = aggregate([
        rushLine(player("home-22"), 4),
        rushLine(player("away-1"), 7, "away"),
      ]);

      expect(result.teamStats.home.rushing).toStrictEqual({ attempts: 1, yards: 4 });
      expect(result.teamStats.away).toStrictEqual({
        ...zeroTotals("away"),
        rushing: { attempts: 1, yards: 7 },
        totalOffenseYards: 7,
      });
    });

    it("count first downs by team and category", () => {
      const result = aggregate(
        [],
        [
          { playId: "p1", team: "home", category: "passing" },
          { playId: "p2", team: "home", category: "rushing" },
          { playId: "p3", team: "home", category: "passing" },
          { playId: "p4", team: "away", category: "rushing" },
        ],
      );

      expect(result.teamStats.home.firstDowns).toStrictEqual({ rushing: 1, passing: 2 });
      expect(result.teamStats.away.firstDowns).toStrictEqual({ rushing: 1, passing: 0 });
    });
  });

  describe("purity", () => {
    const credits = [
      rushLine(player("home-22"), 4),
      rushLine(unresolved(33), -3),
      ...completion(player("home-7"), player("home-81"), 27),
      rushLine(player("home-22"), 2),
    ];
    const firstDowns: readonly FirstDownCredit[] = [
      { playId: "p3", team: "home", category: "passing" },
    ];

    it("leaves its deep-frozen inputs unchanged", () => {
      const creditsCopy = copyOf(credits);
      const firstDownsCopy = copyOf(firstDowns);

      aggregateStatistics(deepFreeze(credits), deepFreeze(firstDowns));

      expect(credits).toStrictEqual(creditsCopy);
      expect(firstDowns).toStrictEqual(firstDownsCopy);
    });

    it("gives the same result whatever the order of the credits", () => {
      expect(aggregate([...credits].reverse(), firstDowns)).toStrictEqual(
        aggregate(credits, firstDowns),
      );
    });

    it("returns identical results for identical inputs", () => {
      expect(aggregate(credits, firstDowns)).toStrictEqual(
        aggregate(copyOf(credits), copyOf(firstDowns)),
      );
    });

    it("returns a result that survives a JSON round trip unchanged", () => {
      const result = aggregate(credits, firstDowns);

      expect(JSON.parse(JSON.stringify(result))).toStrictEqual(result);
    });
  });
});
