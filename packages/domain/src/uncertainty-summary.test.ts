import { describe, expect, expectTypeOf, it } from "vitest";
import type { EngineIssue } from "./engine";
import type { CaptureCompleteness, PlayRevision } from "./play-revision";
import { summarizeUncertainty } from "./uncertainty-summary";
import type { DeliveryStatus, UncertaintyReason, UncertaintySummary } from "./uncertainty-summary";

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

const play = (
  playId: string,
  orderKey: string,
  captureCompleteness: CaptureCompleteness = "complete",
): PlayRevision => ({
  playId,
  gameId: "game",
  orderKey,
  revision: 1,
  payloadVersion: 1,
  captureCompleteness,
  reviewStatus: "confirmed",
  observation: {
    family: "rush",
    outcome: "rush",
    period: 1,
    segments: [{ kind: "rush", ballCarrier: { kind: "unknown" }, yards: 3 }],
  },
});

const issue = (code: EngineIssue["code"], playId: string): EngineIssue => ({ code, playId });

const delivery = (playId: string, status: DeliveryStatus) => ({ playId, status });

type Input = Parameters<typeof summarizeUncertainty>[0];

const summarize = ({ plays = [], issues = [], deliveryStates = [] }: Partial<Input>) =>
  summarizeUncertainty(deepFreeze({ plays, issues, deliveryStates }));

const noReasons: UncertaintySummary["reasons"] = {
  missing_details: 0,
  unresolved_identity: 0,
  inconsistent_consequence: 0,
  unsupported_consequence: 0,
  sync_conflict: 0,
  pending_delivery: 0,
};

const emptySummary: UncertaintySummary = { playCount: 0, playIds: [], reasons: noReasons };

describe("UncertaintyReason", () => {
  it("lists the engine issue codes and the two delivery reasons", () => {
    expectTypeOf<UncertaintyReason>().toEqualTypeOf<
      | "missing_details"
      | "unresolved_identity"
      | "inconsistent_consequence"
      | "unsupported_consequence"
      | "sync_conflict"
      | "pending_delivery"
    >();
  });

  it("includes every engine issue code", () => {
    expectTypeOf<EngineIssue["code"]>().toExtend<UncertaintyReason>();
  });
});

describe("DeliveryStatus", () => {
  it("is local, pending, synced, or conflict", () => {
    expectTypeOf<DeliveryStatus>().toEqualTypeOf<"local" | "pending" | "synced" | "conflict">();
  });
});

describe("UncertaintySummary", () => {
  it("has a unique play count, play IDs, and a count for every reason", () => {
    expectTypeOf<UncertaintySummary>().toEqualTypeOf<{
      readonly playCount: number;
      readonly playIds: readonly string[];
      readonly reasons: { readonly [reason in UncertaintyReason]: number };
    }>();
  });

  it("requires every reason", () => {
    // @ts-expect-error pending_delivery is missing
    const missingReason: UncertaintySummary["reasons"] = {
      missing_details: 0,
      unresolved_identity: 0,
      inconsistent_consequence: 0,
      unsupported_consequence: 0,
      sync_conflict: 0,
    };
    expectTypeOf(missingReason).not.toBeNever();
  });
});

describe("summarizeUncertainty", () => {
  it("takes the current plays, the engine issues, and the delivery states", () => {
    expectTypeOf(summarizeUncertainty).parameters.toEqualTypeOf<
      [
        input: {
          readonly plays: readonly PlayRevision[];
          readonly issues: readonly EngineIssue[];
          readonly deliveryStates: readonly {
            readonly playId: string;
            readonly status: DeliveryStatus;
          }[];
        },
      ]
    >();
    expectTypeOf(summarizeUncertainty).returns.toEqualTypeOf<UncertaintySummary>();
  });

  it("returns an empty summary when nothing is uncertain", () => {
    expect(summarize({})).toStrictEqual(emptySummary);
    expect(
      summarize({
        plays: [play("p1", "0100"), play("p2", "0200")],
        deliveryStates: [delivery("p1", "synced"), delivery("p2", "synced")],
      }),
    ).toStrictEqual(emptySummary);
  });

  it("counts one play with an unresolved identity", () => {
    expect(
      summarize({
        plays: [play("p1", "0100"), play("p2", "0200")],
        issues: [issue("unresolved_identity", "p2")],
      }),
    ).toStrictEqual({
      playCount: 1,
      playIds: ["p2"],
      reasons: { ...noReasons, unresolved_identity: 1 },
    });
  });

  it("counts a play with several reasons once, with reason counts above the play count", () => {
    expect(
      summarize({
        plays: [play("p1", "0100", "needs_details")],
        issues: [issue("unresolved_identity", "p1")],
        deliveryStates: [delivery("p1", "pending")],
      }),
    ).toStrictEqual({
      playCount: 1,
      playIds: ["p1"],
      reasons: { ...noReasons, unresolved_identity: 1, missing_details: 1, pending_delivery: 1 },
    });
  });

  describe("each reason counts a play once", () => {
    it("for two missing-details issues on the same play", () => {
      expect(
        summarize({
          plays: [play("p1", "0100")],
          issues: [issue("missing_details", "p1"), issue("missing_details", "p1")],
        }).reasons,
      ).toStrictEqual({ ...noReasons, missing_details: 1 });
    });

    it("for needs_details and a missing-details issue on the same play", () => {
      expect(
        summarize({
          plays: [play("p1", "0100", "needs_details")],
          issues: [issue("missing_details", "p1")],
        }),
      ).toStrictEqual({
        playCount: 1,
        playIds: ["p1"],
        reasons: { ...noReasons, missing_details: 1 },
      });
    });
  });

  describe("reasons", () => {
    it.each<{ code: EngineIssue["code"] }>([
      { code: "missing_details" },
      { code: "unresolved_identity" },
      { code: "inconsistent_consequence" },
      { code: "unsupported_consequence" },
    ])("counts the engine issue $code", ({ code }) => {
      expect(
        summarize({ plays: [play("p1", "0100")], issues: [issue(code, "p1")] }).reasons,
      ).toStrictEqual({ ...noReasons, [code]: 1 });
    });

    it("counts needs_details as missing details but not minimal", () => {
      expect(
        summarize({ plays: [play("p1", "0100", "needs_details"), play("p2", "0200", "minimal")] }),
      ).toStrictEqual({
        playCount: 1,
        playIds: ["p1"],
        reasons: { ...noReasons, missing_details: 1 },
      });
    });

    it.each<{ status: DeliveryStatus; reason: UncertaintyReason }>([
      { status: "local", reason: "pending_delivery" },
      { status: "pending", reason: "pending_delivery" },
      { status: "conflict", reason: "sync_conflict" },
    ])("counts a $status delivery as $reason", ({ status, reason }) => {
      expect(
        summarize({ plays: [play("p1", "0100")], deliveryStates: [delivery("p1", status)] }),
      ).toStrictEqual({ playCount: 1, playIds: ["p1"], reasons: { ...noReasons, [reason]: 1 } });
    });

    it("does not count a synced delivery", () => {
      expect(
        summarize({ plays: [play("p1", "0100")], deliveryStates: [delivery("p1", "synced")] }),
      ).toStrictEqual(emptySummary);
    });
  });

  describe("several plays", () => {
    const plays = [
      play("p3", "0300", "needs_details"),
      play("p1", "0100"),
      play("p4", "0400"),
      play("p2", "0200"),
    ];

    it("counts unique plays and lists them in orderKey order", () => {
      expect(
        summarize({
          plays,
          issues: [
            issue("unresolved_identity", "p3"),
            issue("inconsistent_consequence", "p1"),
            issue("unresolved_identity", "p1"),
          ],
          deliveryStates: [delivery("p4", "pending"), delivery("p2", "synced")],
        }),
      ).toStrictEqual({
        playCount: 3,
        playIds: ["p1", "p3", "p4"],
        reasons: {
          ...noReasons,
          missing_details: 1,
          unresolved_identity: 2,
          inconsistent_consequence: 1,
          pending_delivery: 1,
        },
      });
    });

    it("compares order keys as strings", () => {
      expect(
        summarize({
          plays: [play("nine", "9"), play("ten", "10")],
          issues: [issue("unresolved_identity", "nine"), issue("unresolved_identity", "ten")],
        }).playIds,
      ).toStrictEqual(["ten", "nine"]);
    });

    it("lists delivery-only play IDs last, sorted", () => {
      expect(
        summarize({
          plays,
          issues: [issue("unresolved_identity", "p2")],
          deliveryStates: [
            delivery("removed-b", "pending"),
            delivery("p4", "conflict"),
            delivery("removed-a", "conflict"),
          ],
        }),
      ).toStrictEqual({
        playCount: 5,
        playIds: ["p2", "p3", "p4", "removed-a", "removed-b"],
        reasons: {
          ...noReasons,
          missing_details: 1,
          unresolved_identity: 1,
          sync_conflict: 2,
          pending_delivery: 1,
        },
      });
    });
  });

  describe("purity", () => {
    const input: Input = {
      plays: [play("p2", "0200", "needs_details"), play("p1", "0100")],
      issues: [issue("unresolved_identity", "p1"), issue("missing_details", "p2")],
      deliveryStates: [delivery("p1", "pending"), delivery("other", "conflict")],
    };

    it("leaves its deep-frozen input unchanged", () => {
      const inputCopy = copyOf(input);

      summarizeUncertainty(deepFreeze(input));

      expect(input).toStrictEqual(inputCopy);
    });

    it("returns identical results for identical inputs", () => {
      expect(summarizeUncertainty(input)).toStrictEqual(summarizeUncertainty(copyOf(input)));
    });

    it("gives the same result whatever the order of the inputs", () => {
      expect(
        summarizeUncertainty({
          plays: [...input.plays].reverse(),
          issues: [...input.issues].reverse(),
          deliveryStates: [...input.deliveryStates].reverse(),
        }),
      ).toStrictEqual(summarizeUncertainty(input));
    });

    it("returns a summary that survives a JSON round trip unchanged", () => {
      const summary = summarizeUncertainty(input);

      expect(JSON.parse(JSON.stringify(summary))).toStrictEqual(summary);
    });
  });
});
