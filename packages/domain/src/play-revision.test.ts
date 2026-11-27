import { describe, expectTypeOf, it } from "vitest";
import type { PlayObservation } from "./play-observation";
import type { CaptureCompleteness, PlayRevision, ReviewStatus } from "./play-revision";

const accept = <T>(value: T): T => value;

const rush = {
  family: "rush",
  outcome: "rush",
  period: 1,
  segments: [{ kind: "rush", ballCarrier: { kind: "unknown", observedJersey: 33 }, yards: -3 }],
} as const satisfies PlayObservation;

const completePass = {
  family: "pass",
  outcome: "complete",
  period: 1,
  segments: [
    {
      kind: "reception",
      passer: { kind: "identified", playerId: "player-7" },
      receiver: { kind: "identified", playerId: "player-81" },
      yards: 27,
    },
  ],
} as const satisfies PlayObservation;

const minimalDraft = {
  playId: "play-1",
  gameId: "game-1",
  orderKey: "a0",
  revision: 1,
  payloadVersion: 1,
  captureCompleteness: "minimal",
  reviewStatus: "draft",
  observation: rush,
} as const satisfies PlayRevision;

const completeConfirmed = {
  playId: "play-2",
  gameId: "game-1",
  orderKey: "a1",
  revision: 1,
  payloadVersion: 1,
  captureCompleteness: "complete",
  reviewStatus: "confirmed",
  observation: completePass,
} as const satisfies PlayRevision;

const correctedDraft = {
  ...minimalDraft,
  revision: 2,
  captureCompleteness: "needs_details",
  reviewStatus: "needs_review",
  observation: {
    ...rush,
    segments: [
      { kind: "rush", ballCarrier: { kind: "identified", playerId: "player-22" }, yards: -3 },
    ],
  },
} as const satisfies PlayRevision;

describe("PlayRevision", () => {
  it("accepts a minimal draft at revision 1", () => {
    expectTypeOf(minimalDraft).toExtend<PlayRevision>();
  });

  it("accepts a complete confirmed revision", () => {
    expectTypeOf(completeConfirmed).toExtend<PlayRevision>();
  });

  it("accepts two revisions of the same play", () => {
    expectTypeOf(correctedDraft).toExtend<PlayRevision>();
    expectTypeOf(correctedDraft.playId).toEqualTypeOf(minimalDraft.playId);
  });

  it("has exactly the revision envelope fields", () => {
    expectTypeOf<keyof PlayRevision>().toEqualTypeOf<
      | "playId"
      | "gameId"
      | "orderKey"
      | "revision"
      | "payloadVersion"
      | "captureCompleteness"
      | "reviewStatus"
      | "observation"
    >();
    expectTypeOf<PlayRevision["observation"]>().toEqualTypeOf<PlayObservation>();
  });

  it("only accepts payload version 1", () => {
    accept<PlayRevision>({
      ...minimalDraft,
      // @ts-expect-error payload version 2 does not exist yet
      payloadVersion: 2,
    });
  });

  it("only accepts known completeness and review values", () => {
    expectTypeOf<CaptureCompleteness>().toEqualTypeOf<"minimal" | "needs_details" | "complete">();
    expectTypeOf<ReviewStatus>().toEqualTypeOf<"draft" | "needs_review" | "confirmed">();
    accept<PlayRevision>({
      ...minimalDraft,
      // @ts-expect-error partial is not a capture completeness
      captureCompleteness: "partial",
    });
    accept<PlayRevision>({
      ...minimalDraft,
      // @ts-expect-error approved is not a review status
      reviewStatus: "approved",
    });
  });

  it("keeps sync status out of the domain payload", () => {
    accept<PlayRevision>({
      ...minimalDraft,
      // @ts-expect-error syncStatus is local delivery state
      syncStatus: "pending",
    });
  });

  it("requires playId and orderKey", () => {
    const { playId, ...withoutPlayId } = minimalDraft;
    const { orderKey, ...withoutOrderKey } = minimalDraft;
    expectTypeOf(playId).toBeString();
    expectTypeOf(orderKey).toBeString();
    // @ts-expect-error playId is required
    accept<PlayRevision>(withoutPlayId);
    // @ts-expect-error orderKey is required
    accept<PlayRevision>(withoutOrderKey);
  });

  it("has readonly properties", () => {
    const mutate = (revision: PlayRevision): void => {
      // @ts-expect-error revision is readonly
      revision.revision = 2;
      // @ts-expect-error reviewStatus is readonly
      revision.reviewStatus = "confirmed";
    };

    expectTypeOf(mutate).toBeFunction();
  });
});
