import { test, expect } from "@playwright/test";

test.describe("SkinSage auth flow", () => {
  test("redirects unauthenticated user to /auth", async ({ page }) => {
    await page.goto("/chat");
    await expect(page).toHaveURL(/\/auth/);
  });

  test("auth page shows email and phone tabs", async ({ page }) => {
    await page.goto("/auth");
    await expect(page.getByText("Email / Social")).toBeVisible();
    await expect(page.getByText("Phone OTP")).toBeVisible();
  });

  test("phone tab switches to phone form", async ({ page }) => {
    await page.goto("/auth");
    await page.getByText("Phone OTP").click();
    await expect(page.getByPlaceholder("+91 9876543210")).toBeVisible();
  });
});

test.describe("SkinSage chat UI (authenticated)", () => {
  test.beforeEach(async ({ page }) => {
    const res = await page.request.post("http://localhost:4000/auth/register", {
      data: { name: "Test User", email: `test-${Date.now()}@example.com`, password: "password123" },
    });
    const { token } = await res.json();
    await page.goto("/chat");
    await page.evaluate((t) => localStorage.setItem("token", t), token);
    await page.reload();
  });

  test("chat page loads with welcome message", async ({ page }) => {
    await expect(page.getByText("Welcome to SkinSage")).toBeVisible();
  });

  test("send button is present", async ({ page }) => {
    await expect(page.getByText("Send")).toBeVisible();
  });

  test("image upload button is present", async ({ page }) => {
    await expect(page.getByTitle("Upload skin photo")).toBeVisible();
  });
});
