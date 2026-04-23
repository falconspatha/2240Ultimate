import { test, expect } from "@playwright/test";

const routes = [
  "/login",
  "/",
  "/dashboard",
  "/donations",
  "/inventory",
  "/orders",
  "/picking",
  "/beneficiaries",
  "/zones",
  "/admin/reset",
];

routes.forEach((path) => {
  test(`route ${path} redirects to login when unauthenticated`, async ({ page }) => {
    await page.goto(path);
    await expect(page.getByText("Sign in")).toBeVisible();
  });
});
