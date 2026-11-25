import { describe, expect, expectTypeOf, it } from "vitest";
import { PROTOTYPE_VERSIONS } from "./game-setup";
import type {
  FieldPosition,
  GameSetup,
  RosterEntry,
  RulesetVersion,
  StartingContext,
  StatisticalPolicyVersion,
  TeamSide,
  VersionReferences,
} from "./game-setup";

const accept = <T>(value: T): T => value;

const profileGameSetup = {
  gameId: "game-1",
  home: { id: "team-home", name: "Home" },
  away: { id: "team-away", name: "Away" },
  rosters: {
    home: {
      teamId: "team-home",
      entries: [
        { playerId: "player-7", jerseyNumber: 7, displayName: "Quarterback" },
        { playerId: "player-22", jerseyNumber: 22, displayName: "Running back" },
        { playerId: "player-81", jerseyNumber: 81 },
        { playerId: "player-85", jerseyNumber: 85 },
      ],
    },
    away: { teamId: "team-away", entries: [] },
  },
  startingContext: {
    possession: "home",
    ballPosition: { side: "own", yardLine: 25 },
  },
  versions: {
    ruleset: "prototype-tackle/0.1.0",
    statisticalPolicy: "prototype-rush-pass/0.1.0",
  },
} as const satisfies GameSetup;

describe("GameSetup", () => {
  it("accepts the prototype profile example", () => {
    expectTypeOf(profileGameSetup).toExtend<GameSetup>();
  });

  it("survives a JSON round trip unchanged", () => {
    expect(JSON.parse(JSON.stringify(profileGameSetup))).toStrictEqual(profileGameSetup);
  });

  it("has readonly properties", () => {
    const mutate = (setup: GameSetup): void => {
      // @ts-expect-error gameId is readonly
      setup.gameId = "other";
      // @ts-expect-error team name is readonly
      setup.home.name = "Other";
      // @ts-expect-error roster entries are a readonly array
      setup.rosters.home.entries.push({ playerId: "player-1", jerseyNumber: 1 });
      // @ts-expect-error starting context is readonly
      setup.startingContext.possession = "away";
      // @ts-expect-error version references are readonly
      setup.versions.ruleset = "prototype-tackle/0.2.0";
    };

    expectTypeOf(mutate).toBeFunction();
  });
});

describe("RosterEntry", () => {
  it("allows omitting displayName but not setting it to undefined", () => {
    accept<RosterEntry>({ playerId: "player-81", jerseyNumber: 81 });
    // @ts-expect-error exactOptionalPropertyTypes forbids an explicit undefined
    accept<RosterEntry>({ playerId: "player-81", jerseyNumber: 81, displayName: undefined });
  });
});

describe("FieldPosition", () => {
  it("accepts opponent 7 and midfield", () => {
    expectTypeOf({ side: "opponent", yardLine: 7 } as const).toExtend<FieldPosition>();
    expectTypeOf({ side: "midfield" } as const).toExtend<FieldPosition>();
  });

  it("rejects a yard line at midfield", () => {
    // @ts-expect-error midfield has no yard line
    accept<FieldPosition>({ side: "midfield", yardLine: 50 });
  });

  it("requires a yard line on own and opponent sides", () => {
    // @ts-expect-error own requires a yard line
    accept<FieldPosition>({ side: "own" });
    // @ts-expect-error opponent requires a yard line
    accept<FieldPosition>({ side: "opponent" });
  });

  it("rejects an unknown side", () => {
    // @ts-expect-error center is not a side
    accept<FieldPosition>({ side: "center", yardLine: 10 });
  });
});

describe("StartingContext", () => {
  it("accepts only home or away possession", () => {
    expectTypeOf<TeamSide>().toEqualTypeOf<"home" | "away">();
    expectTypeOf<StartingContext["possession"]>().toEqualTypeOf<TeamSide>();
    accept<StartingContext>({
      // @ts-expect-error visitor is not a team side
      possession: "visitor",
      ballPosition: { side: "midfield" },
    });
  });
});

describe("version references", () => {
  it("accepts <name>/<major>.<minor>.<patch> identifiers", () => {
    accept<RulesetVersion>("prototype-tackle/0.1.0");
    accept<StatisticalPolicyVersion>("prototype-rush-pass/0.1.0");
  });

  it("rejects identifiers without the version shape", () => {
    // @ts-expect-error missing version
    accept<RulesetVersion>("prototype-tackle");
    // @ts-expect-error incomplete version
    accept<StatisticalPolicyVersion>("prototype-rush-pass/0.1");
  });

  it("requires both ruleset and statistical policy", () => {
    // @ts-expect-error statisticalPolicy is required
    accept<VersionReferences>({ ruleset: "prototype-tackle/0.1.0" });
    // @ts-expect-error ruleset is required
    accept<VersionReferences>({ statisticalPolicy: "prototype-rush-pass/0.1.0" });
  });

  it("exposes the prototype profile identifiers", () => {
    expectTypeOf(PROTOTYPE_VERSIONS).toExtend<VersionReferences>();
    expect(PROTOTYPE_VERSIONS).toStrictEqual({
      ruleset: "prototype-tackle/0.1.0",
      statisticalPolicy: "prototype-rush-pass/0.1.0",
    });
  });
});
