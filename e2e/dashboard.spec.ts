import { expect, test } from "@playwright/test";

test("overview exposes reliability state and SLO evidence", async ({ page }) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", { name: "Service reliability at a glance" })
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "payments / Health" })).toBeVisible();
  await expect(page.getByText("99.50% / 99.90%")).toBeVisible();
  await expect(page.getByText("500.0%")).toBeVisible();
  await expect(page.getByText("Health failed 2 consecutive runs")).toBeVisible();
});

test("check view can trigger a manual run through the same-origin proxy", async ({
  page
}) => {
  await page.goto("/checks/payments%3Ahealth");

  await expect(page.getByRole("heading", { name: "Health" })).toBeVisible();
  await expect(page.getByText("99.50%")).toBeVisible();

  await page.getByRole("button", { name: "Run check now" }).click();
  await expect(page.getByText(/Run manual-run completed as pass/)).toBeVisible();
});

test("run and incident detail views expose durable evidence", async ({ page }) => {
  await page.goto("/runs/run-1");
  await expect(page.getByRole("heading", { name: "run-1" })).toBeVisible();
  await expect(page.getByText("expected value > 0")).toBeVisible();
  await expect(page.getByText("rpc-e2e")).toBeVisible();

  await page.goto("/incidents/incident-1");
  await expect(
    page.getByRole("heading", { name: "Health failed 2 consecutive runs" })
  ).toBeVisible();
  await expect(page.getByText("ops")).toBeVisible();
  await expect(page.getByText("204")).toBeVisible();
});
