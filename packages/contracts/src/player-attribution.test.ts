import type { PlayerAttribution } from "@stats/domain";
import { describe, expect, expectTypeOf, it } from "vitest";
import type { ContractIssue, ContractResult } from "./contract-result";
import { parsePlayerAttribution } from "./player-attribution";

const deepFreeze = <T>(value: T): T => {
  if (typeof value === "object" && value !== null && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value)) {
      deepFreeze(child);
    }
  }
  return value;
};

const parse = (input: unknown) => parsePlayerAttribution(deepFreeze(input));

const issueAt = (...path: readonly (string | number)[]) => ({
  path,
  code: expect.stringMatching(/.+/),
  message: expect.stringMatching(/.+/),
});

const pathsOf = (result: ContractResult<PlayerAttribution>) =>
  result.ok ? [] : result.issues.map((issue) => JSON.stringify(issue.path)).sort();

describe("ContractResult", () => {
  it("holds a value or a list of issues", () => {
    expectTypeOf<ContractIssue>().toEqualTypeOf<{
      readonly path: readonly (string | number)[];
      readonly code: string;
      readonly message: string;
    }>();
    expectTypeOf<Extract<ContractResult<number>, { ok: true }>["value"]>().toEqualTypeOf<number>();
    expectTypeOf<Extract<ContractResult<number>, { ok: false }>["issues"]>().toEqualTypeOf<
      readonly ContractIssue[]
    >();
  });
});

describe("parsePlayerAttribution", () => {
  it("returns the domain PlayerAttribution", () => {
    expectTypeOf(parsePlayerAttribution).parameters.toEqualTypeOf<[input: unknown]>();
    expectTypeOf(parsePlayerAttribution).returns.toEqualTypeOf<ContractResult<PlayerAttribution>>();
  });

  describe("valid input", () => {
    it.each<{ name: string; input: PlayerAttribution }>([
      { name: "an identified player", input: { kind: "identified", playerId: "home-22" } },
      { name: "an unknown player with a jersey", input: { kind: "unknown", observedJersey: 33 } },
      { name: "an unknown player with jersey 0", input: { kind: "unknown", observedJersey: 0 } },
      { name: "an unknown player with jersey 99", input: { kind: "unknown", observedJersey: 99 } },
      { name: "an unknown player without a jersey", input: { kind: "unknown" } },
    ])("accepts $name with exactly its keys", ({ input }) => {
      expect(parse(input)).toStrictEqual({ ok: true, value: input });
    });
  });

  describe("invalid input", () => {
    it.each<{ name: string; input: unknown; path: readonly (string | number)[] }>([
      { name: "a missing kind", input: { playerId: "home-22" }, path: ["kind"] },
      { name: "an unknown kind", input: { kind: "guessed", playerId: "home-22" }, path: ["kind"] },
      {
        name: "an identified player without playerId",
        input: { kind: "identified" },
        path: ["playerId"],
      },
      {
        name: "an identified player with a non-string playerId",
        input: { kind: "identified", playerId: 22 },
        path: ["playerId"],
      },
      {
        name: "an unknown player with a playerId",
        input: { kind: "unknown", playerId: "home-33" },
        path: ["playerId"],
      },
      {
        name: "an identified player with an observedJersey",
        input: { kind: "identified", playerId: "home-22", observedJersey: 22 },
        path: ["observedJersey"],
      },
      {
        name: "an undefined observedJersey",
        input: { kind: "unknown", observedJersey: undefined },
        path: ["observedJersey"],
      },
      {
        name: "a fractional observedJersey",
        input: { kind: "unknown", observedJersey: 3.5 },
        path: ["observedJersey"],
      },
      {
        name: "a negative observedJersey",
        input: { kind: "unknown", observedJersey: -1 },
        path: ["observedJersey"],
      },
      {
        name: "an observedJersey above 99",
        input: { kind: "unknown", observedJersey: 100 },
        path: ["observedJersey"],
      },
    ])("rejects $name at its path", ({ input, path }) => {
      expect(parse(input)).toStrictEqual({ ok: false, issues: [issueAt(...path)] });
    });

    it.each([null, undefined, "home-22", 22, true, [], [{ kind: "unknown" }]])(
      "rejects the non-object input %j at the root",
      (input) => {
        expect(parse(input)).toStrictEqual({ ok: false, issues: [issueAt()] });
      },
    );
  });

  describe("several errors", () => {
    it("reports every problem of an unknown player", () => {
      expect(
        pathsOf(parse({ kind: "unknown", playerId: "home-33", observedJersey: 3.5 })),
      ).toStrictEqual([JSON.stringify(["observedJersey"]), JSON.stringify(["playerId"])]);
    });

    it("reports every problem of an identified player", () => {
      expect(pathsOf(parse({ kind: "identified", playerId: 22, extra: true }))).toStrictEqual([
        JSON.stringify(["extra"]),
        JSON.stringify(["playerId"]),
      ]);
    });

    it("returns the same issues for the same input", () => {
      const input = { kind: "unknown", playerId: "home-33", observedJersey: 3.5 };
      expect(parse({ ...input })).toStrictEqual(parse({ ...input }));
    });
  });

  describe("robustness", () => {
    const cyclic: Record<string, unknown> = { kind: "unknown" };
    cyclic["self"] = cyclic;

    it.each<{ name: string; input: unknown }>([
      { name: "a symbol", input: Symbol("player") },
      { name: "a bigint", input: 22n },
      { name: "a function", input: () => ({ kind: "unknown" }) },
      { name: "an object without a prototype", input: Object.create(null) },
      { name: "a cyclic object", input: cyclic },
      { name: "a deeply nested value", input: { kind: { kind: { kind: { kind: "unknown" } } } } },
    ])("never throws on $name", ({ input }) => {
      expect(() => parse(input)).not.toThrow();
      expect(parse(input).ok).toBe(false);
    });
  });
});
