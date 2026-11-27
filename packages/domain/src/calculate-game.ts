import type { CalculateGame, EngineIssue, EngineVersion, PlayerStatLine } from "./engine";
import { firstDowns } from "./first-downs";
import type { TeamSide } from "./game-setup";
import { creditPlay, identityIssueNeeded } from "./play-credits";
import type { PlayObservation } from "./play-observation";
import { progressSituations } from "./situation-progression";
import type { Situation } from "./situation";
import { aggregateStatistics } from "./statistics";

/** See docs/technical/domain-model.md, "Three independent versions". */
export const ENGINE_VERSION: EngineVersion = "0.1.0";

type PlayCredits = {
  readonly lines: readonly PlayerStatLine[];
  readonly issues: readonly EngineIssue[];
};

const issue = (code: EngineIssue["code"], playId: string): EngineIssue => ({ code, playId });

const creditsOf = (
  playId: string,
  before: Situation | null,
  observation: PlayObservation,
): PlayCredits => {
  const team: TeamSide | undefined = observation.observedContext?.possession ?? before?.possession;
  if (team === undefined) {
    return { lines: [], issues: [issue("missing_details", playId)] };
  }
  return {
    lines: creditPlay(observation, team),
    issues: identityIssueNeeded(observation) ? [issue("unresolved_identity", playId)] : [],
  };
};

const compareStrings = (a: string, b: string): number => (a < b ? -1 : Number(a > b));

/**
 * Calculates the situations, statistics, and issues of a game from its setup and current plays.
 * A play is credited to its observed possession when present, otherwise to the calculated
 * possession before it; with neither, it is not credited and reports `missing_details`. A
 * contradicted possession is still reported as `inconsistent_consequence`.
 * See docs/technical/domain-model.md, "Initial engine contract".
 */
export const calculateGame: CalculateGame = (input, ruleset) => {
  const progression = progressSituations(input, ruleset);
  const credited = progression.plays.map(({ playId, before }) => {
    const observation = input.plays.find((play) => play.playId === playId)?.observation;
    return observation === undefined
      ? { lines: [], issues: [] }
      : creditsOf(playId, before, observation);
  });
  const statistics = aggregateStatistics(
    credited.flatMap(({ lines }) => lines),
    firstDowns(input.plays, progression, ruleset),
  );
  const playIndex = (playId: string): number =>
    progression.plays.findIndex((play) => play.playId === playId);
  const issues = [...progression.issues, ...credited.flatMap((play) => play.issues)].sort(
    (a, b) => playIndex(a.playId) - playIndex(b.playId) || compareStrings(a.code, b.code),
  );
  return {
    versions: { ...input.setup.versions, engine: ENGINE_VERSION },
    situation: progression.situation,
    plays: progression.plays,
    teamStats: statistics.teamStats,
    playerStats: statistics.playerStats,
    issues,
  };
};
