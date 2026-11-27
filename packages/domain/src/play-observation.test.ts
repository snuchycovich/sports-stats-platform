import { describe, expect, expectTypeOf, it } from "vitest";
import type {
  IncompletionSegment,
  PlayMarker,
  PlayObservation,
  PlayObservationV1,
  PlaySegment,
  ReceptionSegment,
  RushSegment,
} from "./play-observation";
import type { PlayerAttribution } from "./player-attribution";
import type { ObservedContext } from "./situation";

const accept = <T>(value: T): T => value;

const quarterback = {
  kind: "identified",
  playerId: "player-7",
} as const satisfies PlayerAttribution;
const runningBack = {
  kind: "identified",
  playerId: "player-22",
} as const satisfies PlayerAttribution;
const receiver = { kind: "identified", playerId: "player-81" } as const satisfies PlayerAttribution;
const unknown33 = { kind: "unknown", observedJersey: 33 } as const satisfies PlayerAttribution;
const unknownPlayer = { kind: "unknown" } as const satisfies PlayerAttribution;

const rushSegment = {
  kind: "rush",
  ballCarrier: runningBack,
  yards: 4,
} as const satisfies RushSegment;
const receptionSegment = {
  kind: "reception",
  passer: quarterback,
  receiver,
  yards: 27,
} as const satisfies ReceptionSegment;
const targetedIncompletion = {
  kind: "incompletion",
  passer: quarterback,
  target: receiver,
} as const satisfies IncompletionSegment;
const untargetedIncompletion = {
  kind: "incompletion",
  passer: quarterback,
} as const satisfies IncompletionSegment;

const rush = {
  family: "rush",
  outcome: "rush",
  period: 1,
  clockSeconds: 540,
  segments: [rushSegment],
} as const satisfies PlayObservation;

const completePass = {
  family: "pass",
  outcome: "complete",
  period: 1,
  note: "Over the middle",
  segments: [receptionSegment],
} as const satisfies PlayObservation;

const incompletePassWithTarget = {
  family: "pass",
  outcome: "incomplete",
  period: 1,
  segments: [targetedIncompletion],
} as const satisfies PlayObservation;

const incompletePassWithoutTarget = {
  family: "pass",
  outcome: "incomplete",
  period: 2,
  segments: [untargetedIncompletion],
} as const satisfies PlayObservation;

const kneelDown = {
  family: "rush",
  outcome: "rush",
  marker: "kneelDown",
  period: 4,
  segments: [{ kind: "rush", ballCarrier: unknownPlayer, yards: -2 }],
} as const satisfies PlayObservation;

const spike = {
  family: "pass",
  outcome: "incomplete",
  marker: "spike",
  period: 2,
  segments: [{ kind: "incompletion", passer: unknownPlayer }],
} as const satisfies PlayObservation;

const rushByUnknownCarrier = {
  family: "rush",
  outcome: "rush",
  period: 1,
  segments: [{ kind: "rush", ballCarrier: unknown33, yards: -3 }],
} as const satisfies PlayObservation;

const rushWithFollowUpSegments = {
  family: "rush",
  outcome: "rush",
  period: 3,
  segments: [rushSegment, receptionSegment, untargetedIncompletion],
} as const satisfies PlayObservation;

const validObservations = [
  rush,
  completePass,
  incompletePassWithTarget,
  incompletePassWithoutTarget,
  kneelDown,
  spike,
  rushByUnknownCarrier,
  rushWithFollowUpSegments,
];

describe("PlayObservation", () => {
  it("is payload version 1", () => {
    expectTypeOf<PlayObservation>().toEqualTypeOf<PlayObservationV1>();
  });

  it("accepts the supported observations", () => {
    expectTypeOf(rush).toExtend<PlayObservation>();
    expectTypeOf(completePass).toExtend<PlayObservation>();
    expectTypeOf(incompletePassWithTarget).toExtend<PlayObservation>();
    expectTypeOf(incompletePassWithoutTarget).toExtend<PlayObservation>();
    expectTypeOf(kneelDown).toExtend<PlayObservation>();
    expectTypeOf(spike).toExtend<PlayObservation>();
    expectTypeOf(rushByUnknownCarrier).toExtend<PlayObservation>();
  });

  it("accepts later segments after the primary one", () => {
    expectTypeOf(rushWithFollowUpSegments).toExtend<PlayObservation>();
  });

  it("accepts an optional observed context on every outcome", () => {
    expectTypeOf<PlayObservation["observedContext"]>().toEqualTypeOf<ObservedContext | undefined>();
    accept<PlayObservation>({
      ...rush,
      observedContext: { possession: "home", down: 1, distance: "goal" },
    });
    accept<PlayObservation>({
      ...completePass,
      observedContext: { down: 2, distance: 6, ballPosition: { side: "own", yardLine: 29 } },
    });
    accept<PlayObservation>({ ...spike, observedContext: {} });
  });

  it("keeps yards, payload version, revision, and IDs off the observation", () => {
    expectTypeOf<PlayObservation>().not.toHaveProperty("yards");
    expectTypeOf<PlayObservation>().not.toHaveProperty("payloadVersion");
    expectTypeOf<PlayObservation>().not.toHaveProperty("revision");
    expectTypeOf<PlayObservation>().not.toHaveProperty("id");
    expectTypeOf<PlayObservation>().not.toHaveProperty("gameId");
  });

  it("requires at least one segment", () => {
    accept<PlayObservation>({
      family: "rush",
      outcome: "rush",
      period: 1,
      // @ts-expect-error segments cannot be empty
      segments: [],
    });
  });

  it("requires the first segment to match the outcome", () => {
    // @ts-expect-error a rush starts with a rush segment
    accept<PlayObservation>({
      family: "rush",
      outcome: "rush",
      period: 1,
      segments: [receptionSegment],
    });
    // @ts-expect-error a complete pass starts with a reception segment
    accept<PlayObservation>({
      family: "pass",
      outcome: "complete",
      period: 1,
      segments: [untargetedIncompletion],
    });
    // @ts-expect-error an incomplete pass starts with an incompletion segment
    accept<PlayObservation>({
      family: "pass",
      outcome: "incomplete",
      period: 1,
      segments: [receptionSegment],
    });
  });

  it("requires the family to match the outcome", () => {
    // @ts-expect-error a complete outcome belongs to the pass family
    accept<PlayObservation>({
      family: "rush",
      outcome: "complete",
      period: 1,
      segments: [receptionSegment],
    });
  });

  it("allows kneelDown only on a rush", () => {
    accept<PlayObservation>({
      family: "pass",
      outcome: "complete",
      period: 1,
      // @ts-expect-error a complete pass has no marker
      marker: "kneelDown",
      segments: [receptionSegment],
    });
    accept<PlayObservation>({
      family: "pass",
      outcome: "incomplete",
      period: 1,
      // @ts-expect-error an incomplete pass may only be a spike
      marker: "kneelDown",
      segments: [untargetedIncompletion],
    });
  });

  it("allows spike only on an incomplete pass", () => {
    accept<PlayObservation>({
      family: "rush",
      outcome: "rush",
      period: 1,
      // @ts-expect-error a rush may only be a kneel-down
      marker: "spike",
      segments: [rushSegment],
    });
    accept<PlayObservation>({
      family: "pass",
      outcome: "complete",
      period: 1,
      // @ts-expect-error a complete pass has no marker
      marker: "spike",
      segments: [receptionSegment],
    });
  });

  it("carries a single marker", () => {
    expectTypeOf<PlayMarker>().toEqualTypeOf<"kneelDown" | "spike">();
    accept<PlayObservation>({
      family: "rush",
      outcome: "rush",
      period: 1,
      // @ts-expect-error markers cannot be combined
      marker: ["kneelDown", "spike"],
      segments: [rushSegment],
    });
  });

  it("types the first segment from the outcome", () => {
    const inspect = (observation: PlayObservation): void => {
      expectTypeOf(observation.segments[1]).toEqualTypeOf<PlaySegment | undefined>();
      switch (observation.outcome) {
        case "rush":
          expectTypeOf(observation.segments[0]).toEqualTypeOf<RushSegment>();
          break;
        case "complete":
          expectTypeOf(observation.segments[0]).toEqualTypeOf<ReceptionSegment>();
          break;
        case "incomplete":
          expectTypeOf(observation.segments[0]).toEqualTypeOf<IncompletionSegment>();
          break;
      }
    };

    expectTypeOf(inspect).toBeFunction();
  });

  it("has readonly properties and a readonly segments tuple", () => {
    const mutate = (observation: PlayObservation): void => {
      // @ts-expect-error period is readonly
      observation.period = 2;
      // @ts-expect-error the segments tuple is readonly
      observation.segments[0] = rushSegment;
      // @ts-expect-error the segments tuple cannot grow
      observation.segments.push(rushSegment);
      // @ts-expect-error segment properties are readonly
      observation.segments[0].kind = "rush";
      // @ts-expect-error segments is readonly
      observation.segments = [rushSegment];
    };

    expectTypeOf(mutate).toBeFunction();
  });

  it("survives a JSON round trip unchanged", () => {
    for (const observation of validObservations) {
      expect(JSON.parse(JSON.stringify(observation))).toStrictEqual(observation);
    }
  });
});

describe("PlaySegment", () => {
  it("is the union of the supported segment kinds", () => {
    expectTypeOf<PlaySegment>().toEqualTypeOf<
      RushSegment | ReceptionSegment | IncompletionSegment
    >();
  });

  it("types primary actors as PlayerAttribution", () => {
    expectTypeOf<RushSegment["ballCarrier"]>().toEqualTypeOf<PlayerAttribution>();
    expectTypeOf<ReceptionSegment["passer"]>().toEqualTypeOf<PlayerAttribution>();
    expectTypeOf<ReceptionSegment["receiver"]>().toEqualTypeOf<PlayerAttribution>();
    expectTypeOf<IncompletionSegment["passer"]>().toEqualTypeOf<PlayerAttribution>();
    expectTypeOf<IncompletionSegment["target"]>().toEqualTypeOf<PlayerAttribution | undefined>();
  });

  it("requires yards on rush and reception segments", () => {
    // @ts-expect-error a rush segment requires yards
    accept<RushSegment>({ kind: "rush", ballCarrier: runningBack });
    // @ts-expect-error a reception segment requires yards
    accept<ReceptionSegment>({ kind: "reception", passer: quarterback, receiver });
  });

  it("has no yards on an incompletion segment", () => {
    // @ts-expect-error an incompletion has no yards
    accept<IncompletionSegment>({ kind: "incompletion", passer: quarterback, yards: 3 });
  });

  it("rejects an explicit undefined target", () => {
    // @ts-expect-error exactOptionalPropertyTypes forbids an explicit undefined
    accept<IncompletionSegment>({ kind: "incompletion", passer: quarterback, target: undefined });
  });
});
