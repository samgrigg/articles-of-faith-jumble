import { test, expect } from "@playwright/test";
test.use({
  viewport: { width: 390, height: 844 },
  hasTouch: true,
  isMobile: true,
});
test("article navigation and unfinished discard", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("button", { name: /Article 1 / })).toBeVisible();
  await page.getByRole("button", { name: /Article 1 / }).click();
  const initial = await page.locator(".tile").count();
  expect(initial).toBeGreaterThan(2);
  await page.getByRole("button", { name: "Return to articles" }).click();
  await page.getByRole("button", { name: /Article 1 / }).click();
  await expect(page.locator(".tile")).toHaveCount(initial);
});
test("drag joins, complete, persist, and replay", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /Article 1 / }).click();
  const total = await page.locator(".tile").count();
  // First connection uses pointer dragging.
  const left = page.locator('[data-start="0"]'),
    right = page.locator('[data-start="1"]');
  const a = await left.boundingBox(),
    b = await right.boundingBox();
  if (!a || !b) throw new Error("missing tile");
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
  await page.mouse.down();
  await page.mouse.move(a.x + a.width + b.width / 2 + 5, a.y + a.height / 2, {
    steps: 8,
  });
  await page.mouse.up();
  await expect(page.locator('[data-start="0"]')).toHaveAttribute(
    "data-end",
    "1",
  );
  // Exercise keyboard access through the remaining connections, including wrapped groups.
  for (let next = 2; next < total; next++) {
    const prefix = page.locator('[data-start="0"]');
    await prefix.focus();
    for (let i = 0; i < 32; i++) await prefix.press("ArrowLeft");
    const target = page.locator(`[data-start="${next}"]`);
    await target.focus();
    const p = await prefix.boundingBox(),
      t = await target.boundingBox();
    if (!p || !t) throw new Error("missing group");
    const dx = p.x + p.width + 5 - t.x,
      dy = p.y + p.height / 2 - t.y - t.height / 2;
    for (let i = 0; i < Math.round(Math.abs(dx) / 12); i++)
      await target.press(dx > 0 ? "ArrowRight" : "ArrowLeft");
    for (let i = 0; i < Math.round(Math.abs(dy) / 12); i++)
      await target.press(dy > 0 ? "ArrowDown" : "ArrowUp");
    await target.press("Enter");
    if (next < total - 1)
      await expect(prefix).toHaveAttribute("data-end", String(next));
  }
  await expect(page.getByText("Beautifully pieced together.")).toBeVisible();
  await page.getByRole("button", { name: "Replay article" }).click();
  await expect(page.locator(".tile")).toHaveCount(total);
  await page.getByRole("button", { name: "Return to articles" }).click();
  await page.reload();
  await expect(
    page.getByRole("button", { name: /Article 1 .*Completed/ }),
  ).toBeVisible();
});

test("cached game opens and plays offline", async ({ page, context }) => {
  await page.goto("/");
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.reload();
  await page.waitForFunction(() => !!navigator.serviceWorker.controller);
  await context.setOffline(true);
  await page.reload();
  await page.getByRole("button", { name: /Article 13 / }).click();
  await expect(page.locator(".tile").first()).toBeVisible();
  await expect(page.locator(".tile")).not.toHaveCount(0);
});

test("phone screens remain within the viewport", async ({ page }) => {
  await page.goto("/");
  await page.screenshot({
    path: "test-results/article-index.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: /Article 13 / }).click();
  await page.screenshot({ path: "test-results/article-mat.png" });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});

test("rotating to a narrower phone keeps tiles reachable", async ({ page }) => {
  await page.setViewportSize({ width: 844, height: 390 });
  await page.goto("/");
  await page.getByRole("button", { name: /Article 1 / }).click();
  await page.setViewportSize({ width: 320, height: 700 });
  await expect
    .poll(() =>
      page.locator(".tile").evaluateAll((tiles) =>
        tiles.every((tile) => {
          const r = tile.getBoundingClientRect();
          return r.left >= 0 && r.right <= window.innerWidth;
        }),
      ),
    )
    .toBe(true);
});
