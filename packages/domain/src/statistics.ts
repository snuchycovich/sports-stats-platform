import type {
  PassingLine,
  PlayerStatLine,
  ReceivingLine,
  RushingLine,
  StatSubject,
  TeamStatLine,
} from "./engine";
import type { FirstDownCredit } from "./first-downs";
import type { TeamSide } from "./game-setup";

/**
 * Team totals and merged statistical lines of a game.
 * See docs/technical/prototype-football-profile.md, "Credits".
 */
export type GameStatistics = {
  readonly teamStats: { readonly home: TeamStatLine; readonly away: TeamStatLine };
  readonly playerStats: readonly PlayerStatLine[];
};

const noRushing: RushingLine = { attempts: 0, yards: 0 };
const noPassing: PassingLine = { attempts: 0, completions: 0, yards: 0 };

const addRushing = (a: RushingLine, b: RushingLine): RushingLine => ({
  attempts: a.attempts + b.attempts,
  yards: a.yards + b.yards,
});

const addPassing = (a: PassingLine, b: PassingLine): PassingLine => ({
  attempts: a.attempts + b.attempts,
  completions: a.completions + b.completions,
  yards: a.yards + b.yards,
});

const addReceiving = (a: ReceivingLine, b: ReceivingLine): ReceivingLine => ({
  receptions: a.receptions + b.receptions,
  yards: a.yards + b.yards,
});

const sameSubject = (a: StatSubject, b: StatSubject): boolean => {
  switch (a.kind) {
    case "player":
      return b.kind === "player" && a.playerId === b.playerId;
    case "team":
      return b.kind === "team";
    case "unresolved":
      return b.kind === "unresolved" && a.observedJersey === b.observedJersey;
  }
};

const sameLine = (a: PlayerStatLine, b: PlayerStatLine): boolean =>
  a.team === b.team && sameSubject(a.subject, b.subject);

const addLine = (
  lines: readonly PlayerStatLine[],
  line: PlayerStatLine,
): readonly PlayerStatLine[] =>
  lines.some((existing) => sameLine(existing, line))
    ? lines.map((existing) =>
        sameLine(existing, line)
          ? {
              ...existing,
              rushing: addRushing(existing.rushing, line.rushing),
              passing: addPassing(existing.passing, line.passing),
              receiving: addReceiving(existing.receiving, line.receiving),
            }
          : existing,
      )
    : [...lines, line];

const teamRank: Readonly<Record<TeamSide, number>> = { home: 0, away: 1 };
const subjectRank: Readonly<Record<StatSubject["kind"], number>> = {
  player: 0,
  team: 1,
  unresolved: 2,
};

const compareStrings = (a: string, b: string): number => (a < b ? -1 : Number(a > b));

const jerseyRank = (subject: StatSubject): number =>
  subject.kind === "unresolved" && subject.observedJersey !== undefined
    ? subject.observedJersey
    : Number.POSITIVE_INFINITY;

const compareSubjects = (a: StatSubject, b: StatSubject): number => {
  if (a.kind === "player" && b.kind === "player") {
    return compareStrings(a.playerId, b.playerId);
  }
  const jerseyA = jerseyRank(a);
  const jerseyB = jerseyRank(b);
  return jerseyA === jerseyB ? 0 : Math.sign(jerseyA - jerseyB);
};

const compareLines = (a: PlayerStatLine, b: PlayerStatLine): number =>
  teamRank[a.team] - teamRank[b.team] ||
  subjectRank[a.subject.kind] - subjectRank[b.subject.kind] ||
  compareSubjects(a.subject, b.subject);

const teamTotals = (
  team: TeamSide,
  lines: readonly PlayerStatLine[],
  firstDowns: readonly FirstDownCredit[],
): TeamStatLine => {
  const teamLines = lines.filter((line) => line.team === team);
  const rushing = teamLines.reduce((total, line) => addRushing(total, line.rushing), noRushing);
  const passing = teamLines.reduce((total, line) => addPassing(total, line.passing), noPassing);
  const countFirstDowns = (category: FirstDownCredit["category"]): number =>
    firstDowns.filter((credit) => credit.team === team && credit.category === category).length;
  return {
    team,
    rushing,
    passing,
    firstDowns: { rushing: countFirstDowns("rushing"), passing: countFirstDowns("passing") },
    totalOffenseYards: rushing.yards + passing.yards,
  };
};

/**
 * Merges the lines of the same team and subject, ordered home before away; then player, Team,
 * and unresolved subjects; then by `playerId` or observed jersey, with no jersey last. Team totals
 * sum every line, including Team and unresolved ones; receiving yards are never part of offense.
 * See docs/technical/prototype-football-profile.md, "Credits".
 */
export const aggregateStatistics = (
  credits: readonly PlayerStatLine[],
  firstDowns: readonly FirstDownCredit[],
): GameStatistics => {
  const merged = credits.reduce(addLine, []);
  const playerStats = [...merged].sort(compareLines);
  return {
    teamStats: {
      home: teamTotals("home", playerStats, firstDowns),
      away: teamTotals("away", playerStats, firstDowns),
    },
    playerStats,
  };
};
