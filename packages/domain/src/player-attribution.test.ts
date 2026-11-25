import { describe, expect, expectTypeOf, it } from "vitest";
import type { PlayerAttribution } from "./player-attribution";

const accept = <T>(value: T): T => value;

const identified = {
  kind: "identified",
  playerId: "player-22",
} as const satisfies PlayerAttribution;
const unknownWithJersey = {
  kind: "unknown",
  observedJersey: 33,
} as const satisfies PlayerAttribution;
const unknownWithoutJersey = { kind: "unknown" } as const satisfies PlayerAttribution;

describe("PlayerAttribution", () => {
  it("accepts an identified roster player", () => {
    expectTypeOf(identified).toExtend<PlayerAttribution>();
  });

  it("accepts an unknown player with or without an observed jersey", () => {
    expectTypeOf(unknownWithJersey).toExtend<PlayerAttribution>();
    expectTypeOf(unknownWithoutJersey).toExtend<PlayerAttribution>();
  });

  it("requires a playerId for an identified player", () => {
    // @ts-expect-error identified requires playerId
    accept<PlayerAttribution>({ kind: "identified" });
  });

  it("never gives an unknown player a playerId", () => {
    // @ts-expect-error unknown players have no identity
    accept<PlayerAttribution>({ kind: "unknown", playerId: "player-33" });
  });

  it("does not record an observed jersey on an identified player", () => {
    // @ts-expect-error identified players have no observedJersey
    accept<PlayerAttribution>({ kind: "identified", playerId: "player-22", observedJersey: 22 });
  });

  it("rejects an explicit undefined observed jersey", () => {
    // @ts-expect-error exactOptionalPropertyTypes forbids an explicit undefined
    accept<PlayerAttribution>({ kind: "unknown", observedJersey: undefined });
  });

  it("rejects an unknown kind", () => {
    // @ts-expect-error guessed is not an attribution kind
    accept<PlayerAttribution>({ kind: "guessed", playerId: "player-22" });
  });

  it("exposes playerId only on the identified branch", () => {
    const inspect = (attribution: PlayerAttribution): void => {
      if (attribution.kind === "identified") {
        expectTypeOf(attribution.playerId).toEqualTypeOf<string>();
      } else {
        expectTypeOf(attribution).not.toHaveProperty("playerId");
        expectTypeOf(attribution.observedJersey).toEqualTypeOf<number | undefined>();
      }
    };

    expectTypeOf(inspect).toBeFunction();
  });

  it("has readonly properties", () => {
    const mutate = (attribution: PlayerAttribution): void => {
      if (attribution.kind === "identified") {
        // @ts-expect-error playerId is readonly
        attribution.playerId = "player-7";
      } else {
        // @ts-expect-error observedJersey is readonly
        attribution.observedJersey = 7;
      }
      // @ts-expect-error kind is readonly
      attribution.kind = "unknown";
    };

    expectTypeOf(mutate).toBeFunction();
  });

  it("survives a JSON round trip unchanged", () => {
    for (const attribution of [identified, unknownWithJersey, unknownWithoutJersey]) {
      expect(JSON.parse(JSON.stringify(attribution))).toStrictEqual(attribution);
    }
  });
});
