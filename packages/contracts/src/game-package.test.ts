import { PROTOTYPE_VERSIONS } from "@stats/domain";
import type { FieldPosition, GameSetup, RosterEntry } from "@stats/domain";
import { describe, expect, expectTypeOf, it } from "vitest";
import type { ContractResult } from "./contract-result";
import { parseGamePackage } from "./game-package";
import type { GamePackage } from "./game-package";

type Path = readonly (string | number)[];

const deepFreeze = <T>(value: T): T => {
  if (typeof value === "object" && value !== null && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value)) {
      deepFreeze(child);
    }
  }
  return value;
};

const parse = (input: unknown) => parseGamePackage(deepFreeze(input));

const issueAt = (...path: Path) => ({
  path,
  code: expect.stringMatching(/.+/),
  message: expect.stringMatching(/.+/),
});

const pathsOf = (result: ContractResult<GamePackage>): readonly string[] =>
  result.ok ? [] : result.issues.map((issue) => JSON.stringify(issue.path));

const homeEntries: readonly RosterEntry[] = [
  { playerId: "home-7", jerseyNumber: 7, displayName: "Home quarterback" },
  { playerId: "home-22", jerseyNumber: 22 },
  { playerId: "home-81", jerseyNumber: 81 },
  { playerId: "home-85", jerseyNumber: 85 },
];

const setup: GameSetup = {
  gameId: "ref-game",
  home: { id: "ref-home", name: "Reference Home" },
  away: { id: "ref-away", name: "Reference Away" },
  rosters: {
    home: { teamId: "ref-home", entries: homeEntries },
    away: { teamId: "ref-away", entries: [{ playerId: "away-1", jerseyNumber: 1 }] },
  },
  startingContext: { possession: "home", ballPosition: { side: "own", yardLine: 25 } },
  versions: PROTOTYPE_VERSIONS,
};

const gamePackage: GamePackage = { setup, gameRevision: 1 };

const withSetup = (patch: Record<string, unknown>) => ({
  ...gamePackage,
  setup: { ...setup, ...patch },
});

const withHomeEntries = (entries: readonly unknown[]) =>
  withSetup({ rosters: { ...setup.rosters, home: { teamId: "ref-home", entries } } });

const withBallPosition = (ballPosition: unknown) =>
  withSetup({ startingContext: { possession: "home", ballPosition } });

const withVersions = (patch: Record<string, unknown>) =>
  withSetup({ versions: { ...PROTOTYPE_VERSIONS, ...patch } });

const withoutGameRevision = { setup };

describe("parseGamePackage", () => {
  it("returns a game package built from the domain GameSetup", () => {
    expectTypeOf<GamePackage>().toEqualTypeOf<{
      readonly setup: GameSetup;
      readonly gameRevision: number;
    }>();
    expectTypeOf(parseGamePackage).parameters.toEqualTypeOf<[input: unknown]>();
    expectTypeOf(parseGamePackage).returns.toEqualTypeOf<ContractResult<GamePackage>>();
  });

  describe("valid input", () => {
    it("accepts two teams, their rosters, a start at own 25, and the prototype versions", () => {
      expect(parse(gamePackage)).toStrictEqual({ ok: true, value: gamePackage });
    });

    it.each<{ name: string; ballPosition: FieldPosition }>([
      { name: "own 1", ballPosition: { side: "own", yardLine: 1 } },
      { name: "opponent 49", ballPosition: { side: "opponent", yardLine: 49 } },
      { name: "midfield", ballPosition: { side: "midfield" } },
    ])("accepts a start at $name on the prototype 100-yard field", ({ ballPosition }) => {
      const input = withBallPosition(ballPosition);
      expect(parse(input)).toStrictEqual({ ok: true, value: input });
    });

    it("accepts jerseys 0 and 99 and an empty roster", () => {
      const input = withSetup({
        rosters: {
          home: {
            teamId: "ref-home",
            entries: [
              { playerId: "home-0", jerseyNumber: 0 },
              { playerId: "home-99", jerseyNumber: 99 },
            ],
          },
          away: { teamId: "ref-away", entries: [] },
        },
      });
      expect(parse(input)).toStrictEqual({ ok: true, value: input });
    });

    it("accepts a later game revision", () => {
      expect(parse({ ...gamePackage, gameRevision: 7 }).ok).toBe(true);
    });
  });

  describe("teams and rosters", () => {
    it.each<{ name: string; input: unknown; path: Path }>([
      {
        name: "home and away with the same team id",
        input: withSetup({
          away: { id: "ref-home", name: "Reference Away" },
          rosters: { ...setup.rosters, away: { teamId: "ref-home", entries: [] } },
        }),
        path: ["setup", "away", "id"],
      },
      {
        name: "a home roster for another team",
        input: withSetup({
          rosters: { ...setup.rosters, home: { teamId: "ref-away", entries: homeEntries } },
        }),
        path: ["setup", "rosters", "home", "teamId"],
      },
      {
        name: "an away roster for another team",
        input: withSetup({ rosters: { ...setup.rosters, away: { teamId: "other", entries: [] } } }),
        path: ["setup", "rosters", "away", "teamId"],
      },
      {
        name: "a duplicate jersey",
        input: withHomeEntries([
          { playerId: "home-7", jerseyNumber: 7 },
          { playerId: "home-77", jerseyNumber: 7 },
        ]),
        path: ["setup", "rosters", "home", "entries", 1, "jerseyNumber"],
      },
      {
        name: "a duplicate playerId",
        input: withHomeEntries([
          { playerId: "home-7", jerseyNumber: 7 },
          { playerId: "home-7", jerseyNumber: 17 },
        ]),
        path: ["setup", "rosters", "home", "entries", 1, "playerId"],
      },
      {
        name: "a jersey below 0",
        input: withHomeEntries([{ playerId: "home-x", jerseyNumber: -1 }]),
        path: ["setup", "rosters", "home", "entries", 0, "jerseyNumber"],
      },
      {
        name: "a jersey above 99",
        input: withHomeEntries([{ playerId: "home-x", jerseyNumber: 100 }]),
        path: ["setup", "rosters", "home", "entries", 0, "jerseyNumber"],
      },
      {
        name: "a fractional jersey",
        input: withHomeEntries([{ playerId: "home-x", jerseyNumber: 7.5 }]),
        path: ["setup", "rosters", "home", "entries", 0, "jerseyNumber"],
      },
      {
        name: "an explicit undefined displayName",
        input: withHomeEntries([{ playerId: "home-x", jerseyNumber: 7, displayName: undefined }]),
        path: ["setup", "rosters", "home", "entries", 0, "displayName"],
      },
    ])("rejects $name at its path", ({ input, path }) => {
      expect(parse(input)).toStrictEqual({ ok: false, issues: [issueAt(...path)] });
    });
  });

  describe("starting context", () => {
    it.each<{ name: string; input: unknown; path: Path }>([
      {
        name: "midfield with a yard line",
        input: withBallPosition({ side: "midfield", yardLine: 50 }),
        path: ["setup", "startingContext", "ballPosition", "yardLine"],
      },
      {
        name: "yard line 0",
        input: withBallPosition({ side: "own", yardLine: 0 }),
        path: ["setup", "startingContext", "ballPosition", "yardLine"],
      },
      {
        name: "yard line 50 on a 100-yard field",
        input: withBallPosition({ side: "own", yardLine: 50 }),
        path: ["setup", "startingContext", "ballPosition", "yardLine"],
      },
      {
        name: "a fractional yard line",
        input: withBallPosition({ side: "opponent", yardLine: 7.5 }),
        path: ["setup", "startingContext", "ballPosition", "yardLine"],
      },
      {
        name: "an unknown possession",
        input: withSetup({
          startingContext: { possession: "visitor", ballPosition: { side: "midfield" } },
        }),
        path: ["setup", "startingContext", "possession"],
      },
    ])("rejects $name at its path", ({ input, path }) => {
      expect(parse(input)).toStrictEqual({ ok: false, issues: [issueAt(...path)] });
    });
  });

  describe("versions", () => {
    it.each<{ name: string; input: unknown; path: Path }>([
      {
        name: "a ruleset without a version",
        input: withVersions({ ruleset: "prototype-tackle" }),
        path: ["setup", "versions", "ruleset"],
      },
      {
        name: "a ruleset with an incomplete version",
        input: withVersions({ ruleset: "prototype-tackle/0.1" }),
        path: ["setup", "versions", "ruleset"],
      },
      {
        name: "a statistical policy without a name",
        input: withVersions({ statisticalPolicy: "/0.1.0" }),
        path: ["setup", "versions", "statisticalPolicy"],
      },
      {
        name: "a missing statistical policy",
        input: withSetup({ versions: { ruleset: PROTOTYPE_VERSIONS.ruleset } }),
        path: ["setup", "versions", "statisticalPolicy"],
      },
    ])("rejects $name at its path", ({ input, path }) => {
      expect(parse(input)).toStrictEqual({ ok: false, issues: [issueAt(...path)] });
    });

    it("rejects a well-formed ruleset whose field length is unknown", () => {
      const result = parse(withVersions({ ruleset: "youth-tackle/0.1.0" }));

      expect(result.ok).toBe(false);
      expect(result.ok ? [] : result.issues).toContainEqual({
        path: ["setup", "versions", "ruleset"],
        code: "unsupported_ruleset",
        message: expect.stringMatching(/.+/),
      });
    });
  });

  describe("game revision and envelope", () => {
    it.each<{ name: string; input: unknown; path: Path }>([
      { name: "a missing game revision", input: withoutGameRevision, path: ["gameRevision"] },
      {
        name: "game revision 0",
        input: { ...gamePackage, gameRevision: 0 },
        path: ["gameRevision"],
      },
      {
        name: "game revision 1.5",
        input: { ...gamePackage, gameRevision: 1.5 },
        path: ["gameRevision"],
      },
      {
        name: "an unknown package key",
        input: { ...gamePackage, syncedAt: 0 },
        path: ["syncedAt"],
      },
      {
        name: "an unknown setup key",
        input: withSetup({ venue: "Field 3" }),
        path: ["setup", "venue"],
      },
      {
        name: "a missing setup",
        input: { gameRevision: 1 },
        path: ["setup"],
      },
    ])("rejects $name at its path", ({ input, path }) => {
      expect(parse(input)).toStrictEqual({ ok: false, issues: [issueAt(...path)] });
    });

    it.each([null, undefined, "ref-game", 1, [], [gamePackage]])(
      "rejects the non-object input %j at the root",
      (input) => {
        expect(parse(input)).toStrictEqual({ ok: false, issues: [issueAt()] });
      },
    );

    it("reports several shape problems together", () => {
      const result = parse({
        gameRevision: 0,
        setup: {
          ...setup,
          startingContext: { possession: "home", ballPosition: { side: "own", yardLine: 0 } },
          versions: { ...PROTOTYPE_VERSIONS, statisticalPolicy: "rush-pass" },
        },
      });

      expect([...pathsOf(result)].sort()).toStrictEqual(
        [
          ["gameRevision"],
          ["setup", "startingContext", "ballPosition", "yardLine"],
          ["setup", "versions", "statisticalPolicy"],
        ]
          .map((path) => JSON.stringify(path))
          .sort(),
      );
    });

    it("returns the same issues for the same input", () => {
      const input = withVersions({ ruleset: "youth-tackle/0.1.0" });
      expect(parse({ ...input })).toStrictEqual(parse({ ...input }));
    });
  });

  describe("robustness", () => {
    const cyclic: Record<string, unknown> = { ...gamePackage };
    cyclic["self"] = cyclic;

    it.each<{ name: string; input: unknown }>([
      { name: "a symbol", input: Symbol("game") },
      { name: "a bigint", input: 1n },
      { name: "a function", input: () => gamePackage },
      { name: "an object without a prototype", input: Object.create(null) },
      { name: "a cyclic object", input: cyclic },
      { name: "rosters that are not lists", input: withHomeEntries([null, 7, "home-22"]) },
    ])("never throws on $name", ({ input }) => {
      expect(() => parse(input)).not.toThrow();
      expect(parse(input).ok).toBe(false);
    });
  });
});
