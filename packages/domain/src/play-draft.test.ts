import { describe, expect, expectTypeOf, it } from "vitest";
import { createPlayObservation, validatePlayDraft } from "./play-draft";
import type { DraftIssue, PlayDraft } from "./play-draft";
import type { PlayObservation } from "./play-observation";
import type { PlayerAttribution } from "./player-attribution";

const accept = <T>(value: T): T => value;

const deepFreeze = <T>(value: T): T => {
  if (typeof value === "object" && value !== null) {
    for (const child of Object.values(value)) {
      deepFreeze(child);
    }
    Object.freeze(value);
  }
  return value;
};

const validate = (draft: PlayDraft, fieldLength = 100) =>
  validatePlayDraft(deepFreeze(draft), { fieldLength });

const create = (draft: PlayDraft, fieldLength = 100) =>
  createPlayObservation(deepFreeze(draft), { fieldLength });

const quarterback = {
  kind: "identified",
  playerId: "player-7",
} as const satisfies PlayerAttribution;
const runningBack = {
  kind: "identified",
  playerId: "player-22",
} as const satisfies PlayerAttribution;
const receiver = { kind: "identified", playerId: "player-81" } as const satisfies PlayerAttribution;
const unknown33 = { kind: "unknown", observedJersey: 33 } as const satisfies PlayerAttribution;

describe("PlayDraft", () => {
  it("keeps markers on their own family", () => {
    // @ts-expect-error kneelDown belongs to a rush draft
    accept<PlayDraft>({ family: "pass", period: 1, kneelDown: true });
    // @ts-expect-error spike belongs to a pass draft
    accept<PlayDraft>({ family: "rush", period: 1, spike: true });
  });

  it("only accepts complete or incomplete pass outcomes", () => {
    // @ts-expect-error intercepted is not a supported outcome
    accept<PlayDraft>({ family: "pass", period: 1, outcome: "intercepted" });
  });

  it("rejects explicit undefined optional values", () => {
    // @ts-expect-error exactOptionalPropertyTypes forbids an explicit undefined
    accept<PlayDraft>({ family: "rush", period: 1, ballCarrier: undefined });
  });
});

describe("DraftIssue", () => {
  it("has the supported issue codes", () => {
    expectTypeOf<DraftIssue["code"]>().toEqualTypeOf<
      "required" | "forbidden" | "not_integer" | "out_of_range"
    >();
  });

  it("is returned as a readonly list", () => {
    expectTypeOf(validatePlayDraft).returns.toEqualTypeOf<readonly DraftIssue[]>();
    const mutate = (issues: ReturnType<typeof validatePlayDraft>): void => {
      // @ts-expect-error the issue list is readonly
      issues.push({ code: "required", field: "yards" });
    };
    expectTypeOf(mutate).toBeFunction();
  });
});

describe("validatePlayDraft", () => {
  describe("valid drafts", () => {
    it.each<{ name: string; draft: PlayDraft }>([
      {
        name: "a rush for +4",
        draft: { family: "rush", period: 1, clockSeconds: 540, ballCarrier: runningBack, yards: 4 },
      },
      {
        name: "a rush by unknown #33 for -3",
        draft: { family: "rush", period: 1, ballCarrier: unknown33, yards: -3 },
      },
      {
        name: "a complete pass for +27",
        draft: {
          family: "pass",
          period: 1,
          outcome: "complete",
          passer: quarterback,
          receiver,
          yards: 27,
        },
      },
      {
        name: "an incomplete pass with a target",
        draft: {
          family: "pass",
          period: 1,
          outcome: "incomplete",
          passer: quarterback,
          target: receiver,
        },
      },
      {
        name: "an incomplete pass without a target",
        draft: { family: "pass", period: 1, outcome: "incomplete", passer: quarterback },
      },
      {
        name: "a kneel-down without a ball carrier",
        draft: { family: "rush", period: 4, kneelDown: true, yards: -2 },
      },
      {
        name: "a spike without a passer",
        draft: { family: "pass", period: 2, outcome: "incomplete", spike: true },
      },
    ])("accepts $name", ({ draft }) => {
      expect(validate(draft)).toStrictEqual([]);
    });
  });

  describe("rush", () => {
    it("requires a ball carrier unless it is a kneel-down", () => {
      expect(validate({ family: "rush", period: 1, yards: 4 })).toStrictEqual([
        { code: "required", field: "ballCarrier" },
      ]);
    });

    it("still requires valid yards on a kneel-down", () => {
      expect(validate({ family: "rush", period: 4, kneelDown: true })).toStrictEqual([
        { code: "required", field: "yards" },
      ]);
      expect(validate({ family: "rush", period: 4, kneelDown: true, yards: -1.5 })).toStrictEqual([
        { code: "not_integer", field: "yards" },
      ]);
      expect(validate({ family: "rush", period: 4, kneelDown: true, yards: -100 })).toStrictEqual([
        { code: "out_of_range", field: "yards" },
      ]);
    });

    it("requires yards", () => {
      expect(validate({ family: "rush", period: 1, ballCarrier: runningBack })).toStrictEqual([
        { code: "required", field: "yards" },
      ]);
    });

    it("requires whole yards", () => {
      expect(
        validate({ family: "rush", period: 1, ballCarrier: runningBack, yards: 4.5 }),
      ).toStrictEqual([{ code: "not_integer", field: "yards" }]);
    });

    it.each([99, -99])("accepts %i yards on a 100-yard field", (yards) => {
      expect(
        validate({ family: "rush", period: 1, ballCarrier: runningBack, yards }),
      ).toStrictEqual([]);
    });

    it.each([100, -100])("rejects %i yards on a 100-yard field", (yards) => {
      expect(
        validate({ family: "rush", period: 1, ballCarrier: runningBack, yards }),
      ).toStrictEqual([{ code: "out_of_range", field: "yards" }]);
    });

    it("bounds yards by the field length", () => {
      const draft = (yards: number): PlayDraft => ({
        family: "rush",
        period: 1,
        ballCarrier: runningBack,
        yards,
      });
      expect(validate(draft(79), 80)).toStrictEqual([]);
      expect(validate(draft(80), 80)).toStrictEqual([{ code: "out_of_range", field: "yards" }]);
    });
  });

  describe("pass", () => {
    it("requires an outcome", () => {
      expect(validate({ family: "pass", period: 1, passer: quarterback })).toStrictEqual([
        { code: "required", field: "outcome" },
      ]);
    });

    it("reports a complete pass missing passer, receiver, and yards together", () => {
      expect(validate({ family: "pass", period: 1, outcome: "complete" })).toStrictEqual([
        { code: "required", field: "passer" },
        { code: "required", field: "receiver" },
        { code: "required", field: "yards" },
      ]);
    });

    it("forbids a target or a spike on a complete pass", () => {
      expect(
        validate({
          family: "pass",
          period: 1,
          outcome: "complete",
          passer: quarterback,
          receiver,
          target: receiver,
          yards: 27,
          spike: true,
        }),
      ).toStrictEqual([
        { code: "forbidden", field: "target" },
        { code: "forbidden", field: "spike" },
      ]);
    });

    it("forbids yards and a receiver on an incomplete pass", () => {
      expect(
        validate({
          family: "pass",
          period: 1,
          outcome: "incomplete",
          passer: quarterback,
          receiver,
          yards: 5,
        }),
      ).toStrictEqual([
        { code: "forbidden", field: "receiver" },
        { code: "forbidden", field: "yards" },
      ]);
    });

    it("requires a passer on an incomplete pass unless it is a spike", () => {
      expect(validate({ family: "pass", period: 1, outcome: "incomplete" })).toStrictEqual([
        { code: "required", field: "passer" },
      ]);
    });

    it("forbids a target on a spike", () => {
      expect(
        validate({
          family: "pass",
          period: 1,
          outcome: "incomplete",
          spike: true,
          target: receiver,
        }),
      ).toStrictEqual([{ code: "forbidden", field: "target" }]);
    });
  });

  describe("context and attribution values", () => {
    const rush = { family: "rush", ballCarrier: runningBack, yards: 4 } as const;

    it("requires a whole period of at least 1", () => {
      expect(validate({ ...rush, period: 0 })).toStrictEqual([
        { code: "out_of_range", field: "period" },
      ]);
      expect(validate({ ...rush, period: 1.5 })).toStrictEqual([
        { code: "not_integer", field: "period" },
      ]);
    });

    it("rejects a negative clock", () => {
      expect(validate({ ...rush, period: 1, clockSeconds: -1 })).toStrictEqual([
        { code: "out_of_range", field: "clockSeconds" },
      ]);
    });

    it("rejects an invalid observed jersey on the attribution that carries it", () => {
      expect(
        validate({ ...rush, period: 1, ballCarrier: { kind: "unknown", observedJersey: 4.5 } }),
      ).toStrictEqual([{ code: "not_integer", field: "ballCarrier.observedJersey" }]);
      expect(
        validate({
          family: "pass",
          period: 1,
          outcome: "complete",
          passer: quarterback,
          receiver: { kind: "unknown", observedJersey: -1 },
          yards: 9,
        }),
      ).toStrictEqual([{ code: "out_of_range", field: "receiver.observedJersey" }]);
    });

    it("does not check players against a roster", () => {
      expect(
        validate({
          ...rush,
          period: 1,
          ballCarrier: { kind: "identified", playerId: "not-on-any-roster" },
        }),
      ).toStrictEqual([]);
    });
  });

  describe("several problems", () => {
    const broken = {
      family: "rush",
      period: 0,
      clockSeconds: -1,
      yards: 4.5,
    } as const satisfies PlayDraft;

    it("returns every issue in field order", () => {
      expect(validate(broken)).toStrictEqual([
        { code: "out_of_range", field: "period" },
        { code: "out_of_range", field: "clockSeconds" },
        { code: "required", field: "ballCarrier" },
        { code: "not_integer", field: "yards" },
      ]);
    });

    it("does not depend on the key order of the draft", () => {
      const reordered: PlayDraft = { yards: 4.5, clockSeconds: -1, period: 0, family: "rush" };
      expect(validate(reordered)).toStrictEqual(validate(broken));
    });

    it("returns the same result for the same draft", () => {
      expect(validate({ ...broken })).toStrictEqual(validate({ ...broken }));
    });
  });
});

describe("createPlayObservation", () => {
  type Result = ReturnType<typeof createPlayObservation>;

  it("returns an observation or a non-empty issue list", () => {
    expectTypeOf<Extract<Result, { ok: true }>["observation"]>().toEqualTypeOf<PlayObservation>();
    expectTypeOf<Extract<Result, { ok: false }>["issues"]>().toEqualTypeOf<
      readonly [DraftIssue, ...DraftIssue[]]
    >();
    expectTypeOf<Result["ok"]>().toEqualTypeOf<boolean>();
  });

  describe("valid drafts", () => {
    it("builds a rush segment", () => {
      expect(
        create({ family: "rush", period: 1, ballCarrier: runningBack, yards: 4 }),
      ).toStrictEqual({
        ok: true,
        observation: {
          family: "rush",
          outcome: "rush",
          period: 1,
          segments: [{ kind: "rush", ballCarrier: runningBack, yards: 4 }],
        },
      });
    });

    it("builds a reception segment for a complete pass", () => {
      expect(
        create({
          family: "pass",
          period: 1,
          outcome: "complete",
          passer: quarterback,
          receiver,
          yards: 27,
        }),
      ).toStrictEqual({
        ok: true,
        observation: {
          family: "pass",
          outcome: "complete",
          period: 1,
          segments: [{ kind: "reception", passer: quarterback, receiver, yards: 27 }],
        },
      });
    });

    it("builds an incompletion segment with a target", () => {
      expect(
        create({
          family: "pass",
          period: 1,
          outcome: "incomplete",
          passer: quarterback,
          target: receiver,
        }),
      ).toStrictEqual({
        ok: true,
        observation: {
          family: "pass",
          outcome: "incomplete",
          period: 1,
          segments: [{ kind: "incompletion", passer: quarterback, target: receiver }],
        },
      });
    });

    it("builds an incompletion segment without a target", () => {
      expect(
        create({ family: "pass", period: 1, outcome: "incomplete", passer: quarterback }),
      ).toStrictEqual({
        ok: true,
        observation: {
          family: "pass",
          outcome: "incomplete",
          period: 1,
          segments: [{ kind: "incompletion", passer: quarterback }],
        },
      });
    });

    it("keeps an unknown ball carrier with an observed jersey", () => {
      expect(
        create({ family: "rush", period: 1, ballCarrier: unknown33, yards: -3 }),
      ).toStrictEqual({
        ok: true,
        observation: {
          family: "rush",
          outcome: "rush",
          period: 1,
          segments: [{ kind: "rush", ballCarrier: unknown33, yards: -3 }],
        },
      });
    });
  });

  describe("clock plays", () => {
    it("marks a kneel-down and records an unknown carrier when none is given", () => {
      expect(create({ family: "rush", period: 4, kneelDown: true, yards: -2 })).toStrictEqual({
        ok: true,
        observation: {
          family: "rush",
          outcome: "rush",
          marker: "kneelDown",
          period: 4,
          segments: [{ kind: "rush", ballCarrier: { kind: "unknown" }, yards: -2 }],
        },
      });
    });

    it("keeps a known carrier on a kneel-down", () => {
      expect(
        create({ family: "rush", period: 4, kneelDown: true, ballCarrier: quarterback, yards: -1 }),
      ).toStrictEqual({
        ok: true,
        observation: {
          family: "rush",
          outcome: "rush",
          marker: "kneelDown",
          period: 4,
          segments: [{ kind: "rush", ballCarrier: quarterback, yards: -1 }],
        },
      });
    });

    it("marks a spike and records an unknown passer without a target", () => {
      expect(
        create({ family: "pass", period: 2, outcome: "incomplete", spike: true }),
      ).toStrictEqual({
        ok: true,
        observation: {
          family: "pass",
          outcome: "incomplete",
          marker: "spike",
          period: 2,
          segments: [{ kind: "incompletion", passer: { kind: "unknown" } }],
        },
      });
    });
  });

  describe("context and markers", () => {
    it("copies period, clock, and note", () => {
      expect(
        create({
          family: "rush",
          period: 2,
          clockSeconds: 0,
          note: "Wildcat",
          ballCarrier: runningBack,
          yards: 1,
        }),
      ).toStrictEqual({
        ok: true,
        observation: {
          family: "rush",
          outcome: "rush",
          period: 2,
          clockSeconds: 0,
          note: "Wildcat",
          segments: [{ kind: "rush", ballCarrier: runningBack, yards: 1 }],
        },
      });
    });

    it("leaves absent context keys and false markers out", () => {
      const rush = create({
        family: "rush",
        period: 1,
        kneelDown: false,
        ballCarrier: runningBack,
        yards: 4,
      });
      const pass = create({
        family: "pass",
        period: 1,
        outcome: "incomplete",
        spike: false,
        passer: quarterback,
      });

      for (const result of [rush, pass]) {
        expect(result.ok).toBe(true);
        if (result.ok) {
          expect(Object.keys(result.observation).sort()).toStrictEqual([
            "family",
            "outcome",
            "period",
            "segments",
          ]);
        }
      }
    });
  });

  describe("invalid drafts", () => {
    it.each<{ name: string; draft: PlayDraft; fieldLength: number }>([
      {
        name: "a rush without carrier or yards",
        draft: { family: "rush", period: 1 },
        fieldLength: 100,
      },
      {
        name: "a kneel-down without yards",
        draft: { family: "rush", period: 4, kneelDown: true },
        fieldLength: 100,
      },
      {
        name: "a pass without an outcome",
        draft: { family: "pass", period: 1, passer: quarterback },
        fieldLength: 100,
      },
      {
        name: "a complete pass with several problems",
        draft: { family: "pass", period: 0, outcome: "complete", target: receiver, yards: 4.5 },
        fieldLength: 100,
      },
      {
        name: "yards beyond a short field",
        draft: { family: "rush", period: 1, ballCarrier: runningBack, yards: 80 },
        fieldLength: 80,
      },
    ])("returns exactly the validation issues for $name", ({ draft, fieldLength }) => {
      const issues = validate(draft, fieldLength);

      expect(issues.length).toBeGreaterThan(0);
      expect(create(draft, fieldLength)).toStrictEqual({ ok: false, issues });
    });
  });

  it("returns the same result for the same draft", () => {
    const draft = { family: "rush", period: 1, ballCarrier: runningBack, yards: 4 } as const;
    expect(create({ ...draft })).toStrictEqual(create({ ...draft }));
  });
});
