import { describe, expect, it } from "vitest";
import * as contracts from "@stats/contracts";
import * as domain from "@stats/domain";

describe("workspace package resolution", () => {
  it("resolves the shared packages through their exports", () => {
    expect(domain).toBeDefined();
    expect(contracts).toBeDefined();
  });
});
