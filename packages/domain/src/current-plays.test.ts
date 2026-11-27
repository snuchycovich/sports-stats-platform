import { describe, expect, expectTypeOf, it } from "vitest";
import { selectCurrentPlays } from "./current-plays";
import type { PlayRevision } from "./play-revision";

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

const revision = (
  playId: string,
  revisionNumber: number,
  orderKey: string,
  yards = 4,
): PlayRevision => ({
  playId,
  gameId: "game",
  orderKey,
  revision: revisionNumber,
  payloadVersion: 1,
  captureCompleteness: "complete",
  reviewStatus: "confirmed",
  observation: {
    family: "rush",
    outcome: "rush",
    period: 1,
    segments: [{ kind: "rush", ballCarrier: { kind: "unknown" }, yards }],
  },
});

const select = (history: readonly PlayRevision[]) => selectCurrentPlays(deepFreeze(history));

const idsAndRevisions = (plays: readonly PlayRevision[]) =>
  plays.map(({ playId, revision: number }) => `${playId}@${number}`);

describe("selectCurrentPlays", () => {
  it("takes the revision history and returns the current plays", () => {
    expectTypeOf(selectCurrentPlays).parameters.toEqualTypeOf<[history: readonly PlayRevision[]]>();
    expectTypeOf(selectCurrentPlays).returns.toEqualTypeOf<readonly PlayRevision[]>();
  });

  it("returns no play for an empty history", () => {
    expect(select([])).toStrictEqual([]);
  });

  describe("one revision per play", () => {
    const first = revision("p1", 1, "0100");
    const second = revision("p2", 1, "0200");
    const third = revision("p3", 1, "0300");

    it("returns the plays in orderKey order", () => {
      expect(select([first, second, third])).toStrictEqual([first, second, third]);
    });

    it("returns the same order whatever the input order", () => {
      expect(select([third, first, second])).toStrictEqual([first, second, third]);
    });

    it("compares order keys as strings", () => {
      const ten = revision("ten", 1, "10");
      const nine = revision("nine", 1, "9");

      expect(select([nine, ten])).toStrictEqual([ten, nine]);
    });
  });

  describe("several revisions of a play", () => {
    const original = revision("p1", 1, "0100", 2);
    const correction = revision("p1", 2, "0100", 4);
    const other = revision("p2", 1, "0200");

    it("returns only the highest revision", () => {
      expect(select([original, correction, other])).toStrictEqual([correction, other]);
    });

    it("returns the highest revision when it comes first in the history", () => {
      expect(select([correction, original, other])).toStrictEqual([correction, other]);
    });

    it("picks the highest revision, not the latest in the history", () => {
      const third = revision("p1", 3, "0100", 6);

      expect(idsAndRevisions(select([original, third, correction, other]))).toStrictEqual([
        "p1@3",
        "p2@1",
      ]);
    });

    it("does not return superseded revisions", () => {
      const current = select([original, correction, other]);

      expect(current).not.toContainEqual(original);
      expect(current).toHaveLength(2);
    });
  });

  describe("order key of the current revision", () => {
    it("moves a play when a revision changes its order key", () => {
      const first = revision("p1", 1, "0100");
      const second = revision("p2", 1, "0200");
      const movedBeforeFirst = revision("p2", 2, "0050");

      expect(idsAndRevisions(select([first, second, movedBeforeFirst]))).toStrictEqual([
        "p2@2",
        "p1@1",
      ]);
    });

    it("ignores the order key of a superseded revision", () => {
      const first = revision("p1", 1, "0100");
      const insertedLater = revision("p2", 1, "0050");
      const movedAfterFirst = revision("p2", 2, "0150");

      expect(idsAndRevisions(select([movedAfterFirst, insertedLater, first]))).toStrictEqual([
        "p1@1",
        "p2@2",
      ]);
    });
  });

  describe("purity", () => {
    const history = [
      revision("p2", 1, "0200"),
      revision("p1", 2, "0100", 4),
      revision("p1", 1, "0100", 2),
      revision("p3", 1, "0300"),
    ];

    it("leaves its deep-frozen history unchanged", () => {
      const historyCopy = copyOf(history);

      selectCurrentPlays(deepFreeze(history));

      expect(history).toStrictEqual(historyCopy);
    });

    it("returns identical results for identical inputs", () => {
      expect(select(history)).toStrictEqual(select(copyOf(history)));
    });

    it("returns plays that survive a JSON round trip unchanged", () => {
      const current = select(history);

      expect(JSON.parse(JSON.stringify(current))).toStrictEqual(current);
    });
  });
});
