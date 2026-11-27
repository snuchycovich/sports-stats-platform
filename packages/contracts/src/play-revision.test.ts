import type { PlayObservation, PlayRevision } from "@stats/domain";
import { describe, expect, expectTypeOf, it } from "vitest";
import type { ContractResult } from "./contract-result";
import { parsePlayRevision } from "./play-revision";

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

const parse = (input: unknown) => parsePlayRevision(deepFreeze(input));

const issueAt = (...path: Path) => ({
  path,
  code: expect.stringMatching(/.+/),
  message: expect.stringMatching(/.+/),
});

const pathsOf = (result: ContractResult<PlayRevision>): readonly string[] =>
  result.ok ? [] : result.issues.map((issue) => JSON.stringify(issue.path));

const quarterback = { kind: "identified", playerId: "home-7" } as const;
const runningBack = { kind: "identified", playerId: "home-22" } as const;
const receiver = { kind: "identified", playerId: "home-81" } as const;

const rush: PlayObservation = {
  family: "rush",
  outcome: "rush",
  period: 1,
  segments: [{ kind: "rush", ballCarrier: runningBack, yards: 4 }],
};

const envelope = {
  playId: "ref-play-1",
  gameId: "ref-game",
  orderKey: "0100",
  revision: 1,
  payloadVersion: 1,
  captureCompleteness: "complete",
  reviewStatus: "confirmed",
  observation: rush,
} as const satisfies PlayRevision;

const withoutKey = (key: keyof PlayRevision): Record<string, unknown> =>
  Object.fromEntries(Object.entries(envelope).filter(([entryKey]) => entryKey !== key));

describe("parsePlayRevision", () => {
  it("returns the domain PlayRevision", () => {
    expectTypeOf(parsePlayRevision).parameters.toEqualTypeOf<[input: unknown]>();
    expectTypeOf(parsePlayRevision).returns.toEqualTypeOf<ContractResult<PlayRevision>>();
  });

  describe("valid input", () => {
    it.each<{ name: string; observation: PlayObservation }>([
      { name: "a rush", observation: rush },
      {
        name: "a complete pass",
        observation: {
          family: "pass",
          outcome: "complete",
          period: 1,
          segments: [{ kind: "reception", passer: quarterback, receiver, yards: 27 }],
        },
      },
      {
        name: "an incomplete pass with a target",
        observation: {
          family: "pass",
          outcome: "incomplete",
          period: 1,
          segments: [{ kind: "incompletion", passer: quarterback, target: receiver }],
        },
      },
      {
        name: "an incomplete pass without a target",
        observation: {
          family: "pass",
          outcome: "incomplete",
          period: 1,
          segments: [{ kind: "incompletion", passer: quarterback }],
        },
      },
      {
        name: "a kneel-down",
        observation: {
          family: "rush",
          outcome: "rush",
          marker: "kneelDown",
          period: 4,
          segments: [{ kind: "rush", ballCarrier: { kind: "unknown" }, yards: -2 }],
        },
      },
      {
        name: "a spike",
        observation: {
          family: "pass",
          outcome: "incomplete",
          marker: "spike",
          period: 2,
          segments: [{ kind: "incompletion", passer: { kind: "unknown" } }],
        },
      },
    ])("accepts an envelope around $name", ({ observation }) => {
      const input = { ...envelope, observation };
      expect(parse(input)).toStrictEqual({ ok: true, value: input });
    });

    it("accepts every completeness and review value", () => {
      for (const captureCompleteness of ["minimal", "needs_details", "complete"]) {
        for (const reviewStatus of ["draft", "needs_review", "confirmed"]) {
          expect(parse({ ...envelope, captureCompleteness, reviewStatus }).ok).toBe(true);
        }
      }
    });

    it("accepts a later revision", () => {
      expect(parse({ ...envelope, revision: 2 }).ok).toBe(true);
    });
  });

  describe("payload version", () => {
    it.each<{ name: string; input: unknown }>([
      { name: "payload version 2", input: { ...envelope, payloadVersion: 2 } },
      { name: 'payload version "1"', input: { ...envelope, payloadVersion: "1" } },
      { name: "a missing payload version", input: withoutKey("payloadVersion") },
    ])("rejects $name as unsupported", ({ input }) => {
      expect(parse(input)).toStrictEqual({
        ok: false,
        issues: [
          {
            path: ["payloadVersion"],
            code: "unsupported_payload_version",
            message: expect.stringMatching(/.+/),
          },
        ],
      });
    });

    it("does not parse the observation of an unsupported payload version", () => {
      const result = parse({
        ...envelope,
        payloadVersion: 2,
        observation: { family: "kick", downs: [] },
      });

      expect(result.ok).toBe(false);
      expect(pathsOf(result).filter((path) => path.startsWith('["observation"'))).toStrictEqual([]);
    });
  });

  describe("envelope problems", () => {
    it.each<{ name: string; input: unknown; path: Path }>([
      { name: "a missing playId", input: withoutKey("playId"), path: ["playId"] },
      { name: "a missing gameId", input: withoutKey("gameId"), path: ["gameId"] },
      { name: "a missing orderKey", input: withoutKey("orderKey"), path: ["orderKey"] },
      { name: "an empty orderKey", input: { ...envelope, orderKey: "" }, path: ["orderKey"] },
      { name: "a non-string orderKey", input: { ...envelope, orderKey: 100 }, path: ["orderKey"] },
      { name: "revision 0", input: { ...envelope, revision: 0 }, path: ["revision"] },
      { name: "revision 1.5", input: { ...envelope, revision: 1.5 }, path: ["revision"] },
      {
        name: "an unknown capture completeness",
        input: { ...envelope, captureCompleteness: "partial" },
        path: ["captureCompleteness"],
      },
      {
        name: "an unknown review status",
        input: { ...envelope, reviewStatus: "approved" },
        path: ["reviewStatus"],
      },
      {
        name: "a sync status",
        input: { ...envelope, syncStatus: "pending" },
        path: ["syncStatus"],
      },
      {
        name: "a missing observation",
        input: withoutKey("observation"),
        path: ["observation"],
      },
    ])("rejects $name at its path", ({ input, path }) => {
      expect(parse(input)).toStrictEqual({ ok: false, issues: [issueAt(...path)] });
    });

    it.each([null, undefined, "ref-play-1", 1, [], [envelope]])(
      "rejects the non-object input %j at the root",
      (input) => {
        expect(parse(input)).toStrictEqual({ ok: false, issues: [issueAt()] });
      },
    );
  });

  describe("observation problems", () => {
    it.each<{ name: string; observation: unknown; path: Path }>([
      {
        name: "non-integer yards",
        observation: {
          ...rush,
          segments: [{ kind: "rush", ballCarrier: runningBack, yards: 4.5 }],
        },
        path: ["observation", "segments", 0, "yards"],
      },
      {
        name: "an invalid jersey",
        observation: {
          ...rush,
          segments: [
            { kind: "rush", ballCarrier: { kind: "unknown", observedJersey: -1 }, yards: 4 },
          ],
        },
        path: ["observation", "segments", 0, "ballCarrier", "observedJersey"],
      },
      { name: "period 0", observation: { ...rush, period: 0 }, path: ["observation", "period"] },
      {
        name: "an unknown key",
        observation: { ...rush, gained: 4 },
        path: ["observation", "gained"],
      },
    ])("keeps the full path of $name", ({ observation, path }) => {
      expect(parse({ ...envelope, observation })).toStrictEqual({
        ok: false,
        issues: [issueAt(...path)],
      });
    });

    it("reports envelope and observation problems together", () => {
      const result = parse({
        ...envelope,
        revision: 0,
        syncStatus: "pending",
        observation: { ...rush, period: 0 },
      });

      expect([...pathsOf(result)].sort()).toStrictEqual(
        [["observation", "period"], ["revision"], ["syncStatus"]]
          .map((path) => JSON.stringify(path))
          .sort(),
      );
    });

    it("returns the same issues for the same input", () => {
      const input = { ...envelope, revision: 0, observation: { ...rush, period: 0 } };
      expect(parse({ ...input })).toStrictEqual(parse({ ...input }));
    });
  });

  describe("robustness", () => {
    const cyclic: Record<string, unknown> = { ...envelope };
    cyclic["self"] = cyclic;

    it.each<{ name: string; input: unknown }>([
      { name: "a symbol", input: Symbol("revision") },
      { name: "a bigint", input: 1n },
      { name: "a function", input: () => envelope },
      { name: "an object without a prototype", input: Object.create(null) },
      { name: "a cyclic object", input: cyclic },
      { name: "a non-object observation", input: { ...envelope, observation: "rush" } },
    ])("never throws on $name", ({ input }) => {
      expect(() => parse(input)).not.toThrow();
      expect(parse(input).ok).toBe(false);
    });
  });
});
