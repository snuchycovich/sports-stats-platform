import type { PlayObservation } from "@stats/domain";
import { describe, expect, expectTypeOf, it } from "vitest";
import type { ContractResult } from "./contract-result";
import { parsePlayObservation } from "./play-observation";

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

const parse = (input: unknown) => parsePlayObservation(deepFreeze(input));

const issueAt = (...path: Path) => ({
  path,
  code: expect.stringMatching(/.+/),
  message: expect.stringMatching(/.+/),
});

const pathsOf = (result: ContractResult<PlayObservation>): readonly string[] =>
  result.ok ? [] : result.issues.map((issue) => JSON.stringify(issue.path));

const quarterback = { kind: "identified", playerId: "home-7" } as const;
const runningBack = { kind: "identified", playerId: "home-22" } as const;
const receiver = { kind: "identified", playerId: "home-81" } as const;

const rushSegment = { kind: "rush", ballCarrier: runningBack, yards: 4 } as const;
const receptionSegment = { kind: "reception", passer: quarterback, receiver, yards: 27 } as const;
const incompletionSegment = { kind: "incompletion", passer: quarterback } as const;

const rush = { family: "rush", outcome: "rush", period: 1, segments: [rushSegment] } as const;
const completePass = {
  family: "pass",
  outcome: "complete",
  period: 1,
  segments: [receptionSegment],
} as const;
const incompletePass = {
  family: "pass",
  outcome: "incomplete",
  period: 1,
  segments: [incompletionSegment],
} as const;

describe("parsePlayObservation", () => {
  it("returns the domain PlayObservation", () => {
    expectTypeOf(parsePlayObservation).parameters.toEqualTypeOf<[input: unknown]>();
    expectTypeOf(parsePlayObservation).returns.toEqualTypeOf<ContractResult<PlayObservation>>();
  });

  describe("valid input", () => {
    it.each<{ name: string; input: PlayObservation }>([
      { name: "a rush", input: { ...rush, clockSeconds: 540, note: "Off tackle" } },
      { name: "a play with no time left on the clock", input: { ...rush, clockSeconds: 0 } },
      { name: "a complete pass", input: completePass },
      {
        name: "an incomplete pass with a target",
        input: { ...incompletePass, segments: [{ ...incompletionSegment, target: receiver }] },
      },
      { name: "an incomplete pass without a target", input: incompletePass },
      {
        name: "a kneel-down",
        input: {
          family: "rush",
          outcome: "rush",
          marker: "kneelDown",
          period: 4,
          segments: [{ kind: "rush", ballCarrier: { kind: "unknown" }, yards: -2 }],
        },
      },
      {
        name: "a spike",
        input: {
          family: "pass",
          outcome: "incomplete",
          marker: "spike",
          period: 2,
          segments: [{ kind: "incompletion", passer: { kind: "unknown" } }],
        },
      },
      {
        name: "a rush by unknown #33",
        input: {
          ...rush,
          segments: [
            { kind: "rush", ballCarrier: { kind: "unknown", observedJersey: 33 }, yards: -3 },
          ],
        },
      },
      {
        name: "an observation with a full observed context",
        input: {
          ...rush,
          observedContext: {
            possession: "home",
            down: 2,
            distance: 6,
            ballPosition: { side: "own", yardLine: 29 },
          },
        },
      },
      {
        name: "an observation with a goal-to-go observed context at midfield",
        input: {
          ...rush,
          observedContext: { down: 1, distance: "goal", ballPosition: { side: "midfield" } },
        },
      },
      {
        name: "an observation with an empty observed context",
        input: { ...rush, observedContext: {} },
      },
      {
        name: "a rush followed by later segments",
        input: { ...rush, segments: [rushSegment, receptionSegment, incompletionSegment] },
      },
    ])("accepts $name with exactly its keys", ({ input }) => {
      expect(parse(input)).toStrictEqual({ ok: true, value: input });
    });
  });

  describe("single problems", () => {
    it.each<{ name: string; input: unknown; path: Path }>([
      {
        name: "a kneel-down on a complete pass",
        input: { ...completePass, marker: "kneelDown" },
        path: ["marker"],
      },
      {
        name: "a kneel-down on an incomplete pass",
        input: { ...incompletePass, marker: "kneelDown" },
        path: ["marker"],
      },
      { name: "a spike on a rush", input: { ...rush, marker: "spike" }, path: ["marker"] },
      {
        name: "a spike on a complete pass",
        input: { ...completePass, marker: "spike" },
        path: ["marker"],
      },
      {
        name: "yards on an incompletion",
        input: { ...incompletePass, segments: [{ ...incompletionSegment, yards: 5 }] },
        path: ["segments", 0, "yards"],
      },
      {
        name: "a rush without yards",
        input: { ...rush, segments: [{ kind: "rush", ballCarrier: runningBack }] },
        path: ["segments", 0, "yards"],
      },
      {
        name: "a reception without yards",
        input: {
          ...completePass,
          segments: [{ kind: "reception", passer: quarterback, receiver }],
        },
        path: ["segments", 0, "yards"],
      },
      {
        name: "non-integer yards",
        input: { ...rush, segments: [{ ...rushSegment, yards: 4.5 }] },
        path: ["segments", 0, "yards"],
      },
      {
        name: "non-integer yards in a later segment",
        input: { ...rush, segments: [rushSegment, { ...receptionSegment, yards: 2.5 }] },
        path: ["segments", 1, "yards"],
      },
      {
        name: "an invalid attribution inside a segment",
        input: {
          ...rush,
          segments: [{ ...rushSegment, ballCarrier: { kind: "unknown", observedJersey: 3.5 } }],
        },
        path: ["segments", 0, "ballCarrier", "observedJersey"],
      },
      {
        name: "a family that does not match the outcome",
        input: { ...completePass, family: "rush" },
        path: ["family"],
      },
      { name: "period 0", input: { ...rush, period: 0 }, path: ["period"] },
      { name: "period 1.5", input: { ...rush, period: 1.5 }, path: ["period"] },
      { name: "a negative clock", input: { ...rush, clockSeconds: -1 }, path: ["clockSeconds"] },
      {
        name: "a fractional clock",
        input: { ...rush, clockSeconds: 12.5 },
        path: ["clockSeconds"],
      },
      { name: "an unknown key", input: { ...rush, gained: 4 }, path: ["gained"] },
      { name: "an explicit undefined note", input: { ...rush, note: undefined }, path: ["note"] },
      {
        name: "an unknown key in a segment",
        input: { ...rush, segments: [{ ...rushSegment, tackler: receiver }] },
        path: ["segments", 0, "tackler"],
      },
      {
        name: "an unknown key in the observed context",
        input: { ...rush, observedContext: { down: 1, quarter: 1 } },
        path: ["observedContext", "quarter"],
      },
      {
        name: "an observed down 5",
        input: { ...rush, observedContext: { down: 5 } },
        path: ["observedContext", "down"],
      },
      {
        name: "an observed distance 0",
        input: { ...rush, observedContext: { distance: 0 } },
        path: ["observedContext", "distance"],
      },
      {
        name: "a midfield ball position with a yard line",
        input: { ...rush, observedContext: { ballPosition: { side: "midfield", yardLine: 50 } } },
        path: ["observedContext", "ballPosition", "yardLine"],
      },
      {
        name: "a fractional yard line",
        input: { ...rush, observedContext: { ballPosition: { side: "own", yardLine: 2.5 } } },
        path: ["observedContext", "ballPosition", "yardLine"],
      },
      {
        name: "an unsupported outcome",
        input: { ...rush, outcome: "intercepted" },
        path: ["outcome"],
      },
    ])("rejects $name at its path", ({ input, path }) => {
      expect(parse(input)).toStrictEqual({ ok: false, issues: [issueAt(...path)] });
    });

    it.each([null, undefined, "rush", 4, [], [rush]])(
      "rejects the non-object input %j at the root",
      (input) => {
        expect(parse(input)).toStrictEqual({ ok: false, issues: [issueAt()] });
      },
    );
  });

  describe("structural problems", () => {
    it.each<{ name: string; input: unknown; path: Path }>([
      { name: "empty segments", input: { ...rush, segments: [] }, path: ["segments", 0] },
      {
        name: "a rush starting with a reception",
        input: { ...rush, segments: [receptionSegment] },
        path: ["segments", 0, "kind"],
      },
      {
        name: "a complete pass starting with an incompletion",
        input: { ...completePass, segments: [incompletionSegment] },
        path: ["segments", 0, "kind"],
      },
      {
        name: "an incomplete pass starting with a reception",
        input: { ...incompletePass, segments: [receptionSegment] },
        path: ["segments", 0, "kind"],
      },
      {
        name: "an unsupported first segment kind",
        input: {
          ...rush,
          segments: [{ kind: "interception", ballCarrier: runningBack, yards: 0 }],
        },
        path: ["segments", 0, "kind"],
      },
      {
        name: "an unsupported later segment kind",
        input: {
          ...rush,
          segments: [rushSegment, { kind: "interception", returner: receiver, yards: 12 }],
        },
        path: ["segments", 1, "kind"],
      },
    ])("rejects $name with an issue at its path", ({ input, path }) => {
      const result = parse(input);

      expect(result.ok).toBe(false);
      expect(pathsOf(result)).toContain(JSON.stringify(path));
    });
  });

  describe("several problems", () => {
    it("reports every problem", () => {
      const result = parse({
        ...rush,
        period: 0,
        clockSeconds: -1,
        gained: 4,
        segments: [{ ...rushSegment, yards: 4.5 }],
      });

      expect([...pathsOf(result)].sort()).toStrictEqual(
        [["clockSeconds"], ["gained"], ["period"], ["segments", 0, "yards"]]
          .map((path) => JSON.stringify(path))
          .sort(),
      );
    });

    it("returns the same issues for the same input", () => {
      const input = { ...rush, period: 0, segments: [{ ...rushSegment, yards: 4.5 }] };
      expect(parse({ ...input })).toStrictEqual(parse({ ...input }));
    });
  });

  describe("robustness", () => {
    const cyclic: Record<string, unknown> = { ...rush };
    cyclic["self"] = cyclic;

    it.each<{ name: string; input: unknown }>([
      { name: "a symbol", input: Symbol("play") },
      { name: "a bigint", input: 4n },
      { name: "a function", input: () => rush },
      { name: "an object without a prototype", input: Object.create(null) },
      { name: "a cyclic object", input: cyclic },
      { name: "segments that are not a list", input: { ...rush, segments: { 0: rushSegment } } },
    ])("never throws on $name", ({ input }) => {
      expect(() => parse(input)).not.toThrow();
      expect(parse(input).ok).toBe(false);
    });
  });
});
