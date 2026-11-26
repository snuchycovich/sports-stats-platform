import { describe, expect, expectTypeOf, it } from "vitest";
import type {
  CalculateGame,
  EngineInput,
  EngineIssue,
  EngineOutput,
  EngineVersion,
  EngineVersionReferences,
  PassingLine,
  PlayerStatLine,
  PlaySituationResult,
  ReceivingLine,
  RushingLine,
  StatSubject,
  TeamStatLine,
} from "./engine";
import { PROTOTYPE_VERSIONS } from "./game-setup";
import type { FieldPosition, GameSetup, VersionReferences } from "./game-setup";
import type { PlayRevision } from "./play-revision";
import type { Situation } from "./situation";

const accept = <T>(value: T): T => value;

const noRushing = { attempts: 0, yards: 0 } as const satisfies RushingLine;
const noPassing = { attempts: 0, completions: 0, yards: 0 } as const satisfies PassingLine;
const noReceiving = { receptions: 0, yards: 0 } as const satisfies ReceivingLine;

const own = (yardLine: number) => ({ side: "own", yardLine }) as const;
const opponent = (yardLine: number) => ({ side: "opponent", yardLine }) as const;

const situation = (
  possession: Situation["possession"],
  down: Situation["down"],
  ballPosition: FieldPosition,
  lineToGainAt: FieldPosition,
): Situation => ({
  possession,
  down,
  ballPosition,
  lineToGain: { kind: "position", position: lineToGainAt },
});

const setup = {
  gameId: "game-1",
  home: { id: "team-home", name: "Home" },
  away: { id: "team-away", name: "Away" },
  rosters: {
    home: {
      teamId: "team-home",
      entries: [
        { playerId: "player-7", jerseyNumber: 7 },
        { playerId: "player-22", jerseyNumber: 22 },
        { playerId: "player-81", jerseyNumber: 81 },
        { playerId: "player-85", jerseyNumber: 85 },
      ],
    },
    away: { teamId: "team-away", entries: [] },
  },
  startingContext: { possession: "home", ballPosition: own(25) },
  versions: PROTOTYPE_VERSIONS,
} as const satisfies GameSetup;

const firstPlay = {
  playId: "play-1",
  gameId: "game-1",
  orderKey: "a0",
  revision: 1,
  payloadVersion: 1,
  captureCompleteness: "complete",
  reviewStatus: "confirmed",
  observation: {
    family: "rush",
    outcome: "rush",
    period: 1,
    segments: [
      { kind: "rush", ballCarrier: { kind: "identified", playerId: "player-22" }, yards: 4 },
    ],
  },
} as const satisfies PlayRevision;

const input = { setup, plays: [firstPlay] } as const satisfies EngineInput;

const playerLine = (
  subject: StatSubject,
  lines: Partial<Pick<PlayerStatLine, "rushing" | "passing" | "receiving">>,
): PlayerStatLine => ({
  team: "home",
  subject,
  rushing: noRushing,
  passing: noPassing,
  receiving: noReceiving,
  ...lines,
});

const referenceSeries = {
  versions: { ...PROTOTYPE_VERSIONS, engine: "0.1.0" },
  situation: situation("away", 1, own(36), own(46)),
  plays: [
    {
      playId: "play-1",
      before: situation("home", 1, own(25), own(35)),
      after: situation("home", 2, own(29), own(35)),
    },
    {
      playId: "play-2",
      before: situation("home", 2, own(29), own(35)),
      after: situation("home", 1, opponent(44), opponent(34)),
    },
    {
      playId: "play-3",
      before: situation("home", 1, opponent(44), opponent(34)),
      after: situation("home", 2, opponent(44), opponent(34)),
    },
    {
      playId: "play-4",
      before: situation("home", 2, opponent(44), opponent(34)),
      after: situation("home", 3, opponent(47), opponent(34)),
    },
    {
      playId: "play-5",
      before: situation("home", 3, opponent(47), opponent(34)),
      after: situation("home", 4, opponent(38), opponent(34)),
    },
    {
      playId: "play-6",
      before: situation("home", 4, opponent(38), opponent(34)),
      after: situation("away", 1, own(36), own(46)),
    },
  ],
  teamStats: {
    home: {
      team: "home",
      rushing: { attempts: 3, yards: 3 },
      passing: { attempts: 3, completions: 2, yards: 36 },
      firstDowns: { rushing: 0, passing: 1 },
      totalOffenseYards: 39,
    },
    away: {
      team: "away",
      rushing: noRushing,
      passing: noPassing,
      firstDowns: { rushing: 0, passing: 0 },
      totalOffenseYards: 0,
    },
  },
  playerStats: [
    playerLine({ kind: "player", playerId: "player-22" }, { rushing: { attempts: 2, yards: 6 } }),
    playerLine({ kind: "unresolved", observedJersey: 33 }, { rushing: { attempts: 1, yards: -3 } }),
    playerLine(
      { kind: "player", playerId: "player-7" },
      { passing: { attempts: 3, completions: 2, yards: 36 } },
    ),
    playerLine(
      { kind: "player", playerId: "player-81" },
      { receiving: { receptions: 1, yards: 27 } },
    ),
    playerLine(
      { kind: "player", playerId: "player-85" },
      { receiving: { receptions: 1, yards: 9 } },
    ),
  ],
  issues: [{ code: "unresolved_identity", playId: "play-4" }],
} as const satisfies EngineOutput;

describe("EngineInput", () => {
  it("takes the game setup and the current play revisions", () => {
    expectTypeOf(input).toExtend<EngineInput>();
    expectTypeOf<EngineInput["setup"]>().toEqualTypeOf<GameSetup>();
    expectTypeOf<EngineInput["plays"]>().toEqualTypeOf<readonly PlayRevision[]>();
  });
});

describe("EngineVersionReferences", () => {
  it("adds the engine version to the ruleset and statistical policy", () => {
    expectTypeOf<EngineVersionReferences>().toExtend<VersionReferences>();
    expectTypeOf<EngineVersionReferences["engine"]>().toEqualTypeOf<EngineVersion>();
    accept<EngineVersion>("0.1.0");
  });

  it("rejects an engine version without the <major>.<minor>.<patch> shape", () => {
    // @ts-expect-error missing patch
    accept<EngineVersion>("0.1");
  });

  it("requires the engine version", () => {
    // @ts-expect-error engine is required
    accept<EngineVersionReferences>(PROTOTYPE_VERSIONS);
  });
});

describe("StatSubject", () => {
  it("is a player, the team, or an unresolved player", () => {
    accept<StatSubject>({ kind: "player", playerId: "player-22" });
    accept<StatSubject>({ kind: "team" });
    accept<StatSubject>({ kind: "unresolved", observedJersey: 33 });
    accept<StatSubject>({ kind: "unresolved" });
  });

  it("never gives an unresolved subject a playerId", () => {
    // @ts-expect-error unresolved subjects have no identity
    accept<StatSubject>({ kind: "unresolved", playerId: "player-33" });
  });
});

describe("TeamStatLine", () => {
  it("has no receiving totals", () => {
    expectTypeOf<TeamStatLine>().not.toHaveProperty("receiving");
    accept<TeamStatLine>({
      team: "home",
      rushing: noRushing,
      passing: noPassing,
      firstDowns: { rushing: 0, passing: 0 },
      totalOffenseYards: 0,
      // @ts-expect-error receiving yards never count toward team offense
      receiving: noReceiving,
    });
  });
});

describe("EngineIssue", () => {
  it("accepts the known issue codes", () => {
    expectTypeOf<EngineIssue["code"]>().toEqualTypeOf<
      | "unresolved_identity"
      | "missing_details"
      | "unsupported_consequence"
      | "inconsistent_consequence"
    >();
  });

  it("rejects an unknown issue code", () => {
    // @ts-expect-error fumble_lost is not an issue code
    accept<EngineIssue>({ code: "fumble_lost", playId: "play-1" });
  });
});

describe("PlaySituationResult", () => {
  it("allows a situation that was not calculated", () => {
    accept<PlaySituationResult>({
      playId: "play-9",
      before: situation("home", 1, opponent(20), opponent(10)),
      after: null,
    });
  });
});

describe("EngineOutput", () => {
  it("accepts the reference series totals from the profile", () => {
    expectTypeOf(referenceSeries).toExtend<EngineOutput>();
    expectTypeOf<EngineOutput["versions"]>().toEqualTypeOf<EngineVersionReferences>();
    expectTypeOf<EngineOutput["situation"]>().toEqualTypeOf<Situation | null>();
  });

  it("survives a JSON round trip unchanged", () => {
    expect(JSON.parse(JSON.stringify(referenceSeries))).toStrictEqual(referenceSeries);
  });
});

describe("CalculateGame", () => {
  it("maps an engine input to an engine output", () => {
    expectTypeOf<CalculateGame>().parameters.toEqualTypeOf<[input: EngineInput]>();
    expectTypeOf<CalculateGame>().returns.toEqualTypeOf<EngineOutput>();
  });
});
