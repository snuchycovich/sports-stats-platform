import { PROTOTYPE_RULESET, progressSituations } from "@stats/domain";
import { describe, expect, it } from "vitest";
import {
  expectedAfterCorrection,
  expectedBeforeCorrection,
  referenceGameAfterCorrection,
  referenceGameBeforeCorrection,
  referenceGameSetup,
} from "./reference-game";

const progress = (plays: typeof referenceGameBeforeCorrection) =>
  progressSituations({ setup: referenceGameSetup, plays }, PROTOTYPE_RULESET);

describe("reference game situations", () => {
  it.each([
    {
      name: "before correction",
      log: referenceGameBeforeCorrection,
      expected: expectedBeforeCorrection,
    },
    {
      name: "after correction",
      log: referenceGameAfterCorrection,
      expected: expectedAfterCorrection,
    },
  ])("match the expected snapshot $name with no progression issue", ({ log, expected }) => {
    expect(progress(log)).toStrictEqual({
      plays: expected.plays,
      situation: expected.situation,
      issues: [],
    });
  });

  it("flags only play 4 when play 3 is missed", () => {
    const missedPlay3 = referenceGameBeforeCorrection.filter(
      ({ playId }) => playId !== "ref-play-3",
    );

    expect(progress(missedPlay3).issues).toStrictEqual([
      { code: "inconsistent_consequence", playId: "ref-play-4" },
    ]);
  });
});
