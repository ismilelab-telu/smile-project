import { expect, test } from "@playwright/test";

test("opens the playground directly", async ({ page }) => {
  await page.goto("/");

  await expect(page).toHaveTitle(/Smile Project/);
  await expect(page.getByRole("heading", { name: "Simple Linear Regression" })).toBeVisible();
  await expect(page.getByRole("button", { name: /Simple Linear Regression/ })).toBeVisible();
});
