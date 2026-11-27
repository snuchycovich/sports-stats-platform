import {
  ENGINE_VERSION,
  PROTOTYPE_RULESET,
  PROTOTYPE_VERSIONS,
  calculateGame,
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

const deepFreeze = <T>(value: T): T => {
  if (typeof value === "object" && value !== null) {
    for (const child of Object.values(value)) {
      deepFreeze(child);
    }
    Object.freeze(value);
  }
  return value;
};

const copyOf = <T>(value: T): T => JSON.parse(JSON.stringify(value));

const calculate = (plays: readonly PlayRevision[]) =>
  calculateGame(deepFreeze({ setup: referenceGameSetup, plays }), PROTOTYPE_RULESET);

const logs = [
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
];

describe("reference game engine output", () => {
  describe.each(logs)("$name", ({ log, expected }) => {
    it("equals the expected snapshot apart from the versions", () => {
      const { versions: _versions, ...output } = calculate(log);

      expect(output).toStrictEqual(expected);
    });

    it("references the prototype versions and the engine version", () => {
      expect(calculate(log).versions).toStrictEqual({
        ...PROTOTYPE_VERSIONS,
        engine: ENGINE_VERSION,
      });
    });

    it("leaves the fixture unchanged", () => {
      const logCopy = copyOf(log);
      const setupCopy = copyOf(referenceGameSetup);

      calculate(log);

      expect(log).toStrictEqual(logCopy);
      expect(referenceGameSetup).toStrictEqual(setupCopy);
    });

    it("returns identical results for identical inputs", () => {
      expect(calculate(log)).toStrictEqual(
        calculateGame({ setup: copyOf(referenceGameSetup), plays: copyOf(log) }, PROTOTYPE_RULESET),
      );
    });

    it("returns a result that survives a JSON round trip unchanged", () => {
      const output = calculate(log);

      expect(JSON.parse(JSON.stringify(output))).toStrictEqual(output);
    });
  });
});
