import { expect, test } from "@playwright/test";

test("runs a real browser page", async ({ page }) => {
  await page.setContent("<main><h1>Browser environment</h1></main>");

  await expect(page.getByRole("heading", { name: "Browser environment" })).toBeVisible();
});
