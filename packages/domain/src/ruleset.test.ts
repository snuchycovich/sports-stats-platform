import { describe, expect, expectTypeOf, it } from "vitest";
import { PROTOTYPE_VERSIONS } from "./game-setup";
import type { RulesetVersion } from "./game-setup";
import { PROTOTYPE_RULESET, findRuleset, maxYardLine } from "./ruleset";
import type { Ruleset } from "./ruleset";

const youthRuleset: Ruleset = { version: "youth-tackle/0.1.0", fieldLength: 80 };

describe("Ruleset", () => {
  it("names its version and field length", () => {
    expectTypeOf<Ruleset>().toEqualTypeOf<{
      readonly version: RulesetVersion;
      readonly fieldLength: number;
    }>();
  });

  it("has readonly properties", () => {
    const mutate = (ruleset: Ruleset): void => {
      // @ts-expect-error fieldLength is readonly
      ruleset.fieldLength = 80;
    };
    expectTypeOf(mutate).toBeFunction();
  });
});

describe("PROTOTYPE_RULESET", () => {
  it("is the 100-yard prototype ruleset referenced by PROTOTYPE_VERSIONS", () => {
    expect(PROTOTYPE_RULESET).toStrictEqual({
      version: PROTOTYPE_VERSIONS.ruleset,
      fieldLength: 100,
    });
  });

  it("survives a JSON round trip unchanged", () => {
    expect(JSON.parse(JSON.stringify(PROTOTYPE_RULESET))).toStrictEqual(PROTOTYPE_RULESET);
  });
});

describe("findRuleset", () => {
  it("takes a ruleset version and may find nothing", () => {
    expectTypeOf(findRuleset).parameters.toEqualTypeOf<[version: RulesetVersion]>();
    expectTypeOf(findRuleset).returns.toEqualTypeOf<Ruleset | undefined>();
  });

  it("finds the prototype ruleset", () => {
    expect(findRuleset("prototype-tackle/0.1.0")).toStrictEqual(PROTOTYPE_RULESET);
  });

  it.each<RulesetVersion>([
    "youth-tackle/0.1.0",
    "prototype-tackle/0.2.0",
    "prototype-tackle/1.0.0",
  ])("finds nothing for the unknown ruleset %s", (version) => {
    expect(findRuleset(version)).toBeUndefined();
  });
});

describe("maxYardLine", () => {
  it("is half the field length minus 1", () => {
    expect(maxYardLine(PROTOTYPE_RULESET)).toBe(49);
    expect(maxYardLine(youthRuleset)).toBe(39);
  });
});
