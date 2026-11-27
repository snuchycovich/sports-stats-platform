import {
  PROTOTYPE_RULESET,
  calculateGame,
  selectCurrentPlays,
  summarizeUncertainty,
} from "@stats/domain";
import type { DeliveryStatus, UncertaintySummary } from "@stats/domain";
import { describe, expect, it } from "vitest";
import { referenceGameRevisions, referenceGameSetup } from "./reference-game";

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

const plays = selectCurrentPlays(deepFreeze(referenceGameRevisions));
const { issues } = calculateGame(
  deepFreeze({ setup: referenceGameSetup, plays }),
  PROTOTYPE_RULESET,
);

const deliveries = (statuses: { readonly [playId: string]: DeliveryStatus }) =>
  plays.map(({ playId }) => ({ playId, status: statuses[playId] ?? "synced" }));

const summarize = (statuses: { readonly [playId: string]: DeliveryStatus } = {}) =>
  summarizeUncertainty(deepFreeze({ plays, issues, deliveryStates: deliveries(statuses) }));

const noReasons: UncertaintySummary["reasons"] = {
  missing_details: 0,
  unresolved_identity: 0,
  inconsistent_consequence: 0,
  unsupported_consequence: 0,
  sync_conflict: 0,
  pending_delivery: 0,
};

describe("reference game uncertainty", () => {
  it("counts only play 4 when every play is synced", () => {
    expect(summarize()).toStrictEqual({
      playCount: 1,
      playIds: ["ref-play-4"],
      reasons: { ...noReasons, unresolved_identity: 1, missing_details: 1 },
    });
  });

  it("adds a pending play 6 correction and a conflicting play 2", () => {
    expect(summarize({ "ref-play-6": "pending", "ref-play-2": "conflict" })).toStrictEqual({
      playCount: 3,
      playIds: ["ref-play-2", "ref-play-4", "ref-play-6"],
      reasons: {
        ...noReasons,
        unresolved_identity: 1,
        missing_details: 1,
        pending_delivery: 1,
        sync_conflict: 1,
      },
    });
  });

  it("summarizes the current revision of play 6", () => {
    expect(plays.find(({ playId }) => playId === "ref-play-6")?.revision).toBe(2);
  });

  it("leaves the fixture unchanged", () => {
    const historyCopy = copyOf(referenceGameRevisions);

    summarize({ "ref-play-6": "pending" });

    expect(referenceGameRevisions).toStrictEqual(historyCopy);
  });

  it("returns identical results for identical inputs", () => {
    const statuses = { "ref-play-6": "pending", "ref-play-2": "conflict" } as const;

    expect(summarize(statuses)).toStrictEqual(
      summarizeUncertainty({
        plays: copyOf(plays),
        issues: copyOf(issues),
        deliveryStates: copyOf(deliveries(statuses)),
      }),
    );
  });

  it("returns a summary that survives a JSON round trip unchanged", () => {
    const summary = summarize({ "ref-play-6": "pending", "ref-play-2": "conflict" });

    expect(JSON.parse(JSON.stringify(summary))).toStrictEqual(summary);
  });
});
