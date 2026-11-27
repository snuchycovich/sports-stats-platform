import {
  PROTOTYPE_RULESET,
  aggregateStatistics,
  creditPlay,
  firstDowns,
  progressSituations,
} from "@stats/domain";
import type { PlayRevision } from "@stats/domain";
import { describe, expect, it } from "vitest";
import {
  expectedAfterCorrection,
  expectedBeforeCorrection,
  referenceGameAfterCorrection,
  referenceGameBeforeCorrection,
  referenceGameSetup,
} from "./reference-game";

const statisticsOf = (plays: readonly PlayRevision[]) => {
  const progression = progressSituations({ setup: referenceGameSetup, plays }, PROTOTYPE_RULESET);
  const credits = progression.plays.flatMap(({ playId, before }) => {
    const observation = plays.find((play) => play.playId === playId)?.observation;
    return observation === undefined || before === null
      ? []
      : creditPlay(observation, before.possession);
  });
  return aggregateStatistics(credits, firstDowns(plays, progression, PROTOTYPE_RULESET));
};

describe("reference game statistics", () => {
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
  ])("match the expected team totals and player lines $name", ({ log, expected }) => {
    expect(statisticsOf(log)).toStrictEqual({
      teamStats: expected.teamStats,
      playerStats: expected.playerStats,
    });
  });
});
