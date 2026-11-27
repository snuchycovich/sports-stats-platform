import { parseGamePackage, parsePlayRevision } from "@stats/contracts";
import { describe, expect, it } from "vitest";
import { referenceGameRevisions, referenceGameSetup } from "./reference-game";

const jsonRoundTrip = (value: unknown): unknown => JSON.parse(JSON.stringify(value));

const referenceGamePackage = { setup: referenceGameSetup, gameRevision: 1 };

const revisionCases = referenceGameRevisions.map((revision) => ({
  name: `${revision.playId} revision ${revision.revision}`,
  revision,
}));

describe("reference game against the contracts", () => {
  describe("game package", () => {
    it("parses the reference setup with an equal value", () => {
      expect(parseGamePackage(referenceGamePackage)).toStrictEqual({
        ok: true,
        value: referenceGamePackage,
      });
    });

    it("parses the reference setup after a JSON round trip", () => {
      expect(parseGamePackage(jsonRoundTrip(referenceGamePackage))).toStrictEqual({
        ok: true,
        value: referenceGamePackage,
      });
    });
  });

  describe.each(revisionCases)("$name", ({ revision }) => {
    it("parses with an equal value", () => {
      expect(parsePlayRevision(revision)).toStrictEqual({ ok: true, value: revision });
    });

    it("parses after a JSON round trip", () => {
      expect(parsePlayRevision(jsonRoundTrip(revision))).toStrictEqual({
        ok: true,
        value: revision,
      });
    });
  });

  it("covers every recorded revision", () => {
    expect(revisionCases).toHaveLength(7);
  });
});
