import { expect, test } from "@playwright/test";

test.describe("judge journey", () => {
  test("profile → stage → approve → apply → undo → reset", async ({ page }) => {
    await page.goto("/");
    await expect(
      page.getByRole("heading", { name: /See who has your data/i }),
    ).toBeVisible();

    await page.getByRole("link", { name: /The Power User/i }).click();
    await expect(page).toHaveURL(/workspace/);
    await expect(page.getByText(/Simulated consent twin/i)).toBeVisible();

    const stageButton = page
      .getByRole("button", { name: /Stage revoke|Stage downgrade/i })
      .first();
    await expect(stageButton).toBeVisible();
    await stageButton.click();

    await expect(
      page.getByRole("button", { name: "Approve this plan" }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Approve this plan" }).click();
    await expect(
      page.getByRole("button", { name: "Apply approved plan" }),
    ).toBeVisible();

    await page.getByRole("button", { name: "Apply approved plan" }).click();
    await expect(
      page.getByRole("button", { name: "Undo last apply" }),
    ).toBeVisible();

    await page.getByRole("button", { name: "Undo last apply" }).click();
    await expect(
      page.getByRole("button", { name: "Undo last apply" }),
    ).toHaveCount(0);

    await page.getByRole("button", { name: "Reset profile" }).click();
    await expect(page.getByText(/Demo profile restored|reset ·/i).first()).toBeVisible();
  });

  test("workspace remains usable without WebMCP", async ({ page }) => {
    await page.goto("/workspace?profile=power-user");
    await expect(page.getByText(/Simulated consent twin/i)).toBeVisible();
    await expect(
      page.getByText(/WebMCP not detected|WebMCP detected/i),
    ).toBeVisible({ timeout: 10_000 });
    await expect(page.getByRole("heading", { name: "Findings" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Consent map" })).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Connected services" }),
    ).toBeVisible();
  });
});
