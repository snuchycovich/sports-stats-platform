import { PROTOTYPE_RULESET, firstDowns, progressSituations } from "@stats/domain";
import type { PlayRevision } from "@stats/domain";
import { describe, expect, it } from "vitest";
import {
  referenceGameAfterCorrection,
  referenceGameBeforeCorrection,
  referenceGameSetup,
} from "./reference-game";

const creditFirstDowns = (plays: readonly PlayRevision[]) =>
  firstDowns(
    plays,
    progressSituations({ setup: referenceGameSetup, plays }, PROTOTYPE_RULESET),
    PROTOTYPE_RULESET,
  );

describe("reference game first downs", () => {
  it("credits one passing first down to play 2 before the correction", () => {
    expect(creditFirstDowns(referenceGameBeforeCorrection)).toStrictEqual([
      { playId: "ref-play-2", team: "home", category: "passing" },
    ]);
  });

  it("adds a rushing first down to play 6 after the correction", () => {
    expect(creditFirstDowns(referenceGameAfterCorrection)).toStrictEqual([
      { playId: "ref-play-2", team: "home", category: "passing" },
      { playId: "ref-play-6", team: "home", category: "rushing" },
    ]);
  });
});
