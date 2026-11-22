import { expect, it } from "vitest";

it("fails on purpose to verify that CI detects failures", () => {
  expect(1).toBe(2);
});
