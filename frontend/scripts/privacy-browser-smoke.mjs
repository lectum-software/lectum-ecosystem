// Isolated local QA. Empty feed fixtures are test-only; all external requests are blocked.
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const origin = process.env.PRIVACY_TEST_ORIGIN || "http://127.0.0.1:3140";
assert(["localhost", "127.0.0.1"].includes(new URL(origin).hostname));
const output = path.resolve("../.tmp/privacy-qa");
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: "msedge", headless: true });
const failures = [];
try {
  for (const [name, width, height] of [
    ["mobile", 390, 844],
    ["desktop", 1440, 1000],
  ]) {
    const context = await browser.newContext({
      viewport: { width, height },
      reducedMotion: "reduce",
    });
    const optional = [];
    const meta = [];
    await context.route("**/*", async (route) => {
      const url = new URL(route.request().url());
      if (/facebook|fbcdn|meta\.com/.test(url.hostname)) meta.push(url.hostname);
      if (!["127.0.0.1", "localhost"].includes(url.hostname)) return route.abort();
      if (url.port !== (process.env.PRIVACY_TEST_API_PORT || "4140")) return route.continue();
      if (/analytics/.test(url.pathname)) optional.push(url.pathname);
      const data = {
        data: [],
        categories: [],
        page: 1,
        pages: 1,
        count: 0,
        scope: "all",
        community_slug: null,
        following_count: 0,
      };
      return route.fulfill({
        json: { success: true, data },
        headers: {
          "access-control-allow-origin": origin,
          "access-control-allow-credentials": "true",
          "access-control-allow-headers": "*",
        },
      });
    });
    const page = await context.newPage();
    page.setDefaultTimeout(20_000);
    page.on("pageerror", (error) => failures.push(error.message));
    await page.goto(origin, { waitUntil: "domcontentloaded", timeout: 120000 });
    const banner = page.locator("[data-privacy-notice]");
    await banner.waitFor({ timeout: 120000 });
    assert.equal(
      await banner.evaluate((element) => getComputedStyle(element).backgroundColor),
      "rgb(32, 32, 32)",
      "Cookie notice retains its approved opaque background",
    );
    assert.equal(
      await banner
        .getByRole("button", { name: "ACEITAR COOKIES" })
        .evaluate((element) => getComputedStyle(element).color),
      "rgb(255, 255, 255)",
      "Accept button retains white text",
    );
    assert.equal(optional.length, 0, "No optional measurement before choice");
    assert.equal(
      await page.evaluate(() => document.documentElement.scrollWidth > innerWidth),
      false,
    );
    const bounds = await banner.boundingBox();
    const textLines = await banner
      .locator("p")
      .first()
      .evaluate(
        (element) =>
          element.getBoundingClientRect().height / parseFloat(getComputedStyle(element).lineHeight),
      );
    assert(textLines <= 3.1, "Compact cookie notice has at most three lines");
    assert(
      bounds.x >= 0 &&
        bounds.x + bounds.width <= width &&
        bounds.y >= 0 &&
        bounds.y + bounds.height <= height,
    );
    const nav = page.locator("nav[data-fixed-bottom-recovery]");
    if (await nav.isVisible())
      assert(bounds.y + bounds.height <= (await nav.boundingBox()).y, "Navigation unobstructed");
    await page.screenshot({ path: path.join(output, `${name}-notice.png`) });
    await page.evaluate(() => {
      const dialog = document.createElement("dialog");
      dialog.id = "privacy-test-priority";
      dialog.textContent = "Local test of modal priority";
      document.body.append(dialog);
      dialog.showModal();
    });
    await banner.waitFor({ state: "detached" });
    await page.evaluate(() => document.getElementById("privacy-test-priority").remove());
    await banner.waitFor();
    await banner.getByRole("button", { name: "Preferências", exact: true }).click();
    const panel = page.locator("[data-privacy-panel]");
    await panel.waitFor();
    await page.getByRole("switch", { name: "Medição de campanhas com a Meta" }).waitFor();
    assert.equal(
      await page
        .getByRole("switch", { name: "Medição de campanhas com a Meta" })
        .getAttribute("aria-checked"),
      "false",
    );
    assert.equal(
      await page.getByRole("switch", { name: "Cookies necessários" }).isDisabled(),
      true,
    );
    await page.screenshot({ path: path.join(output, `${name}-preferences.png`) });
    await panel.getByRole("button", { name: "Recusar opcionais", exact: true }).click();
    await panel.waitFor({ state: "detached" });
    await page.reload();
    await page.waitForTimeout(2500);
    assert.equal(await banner.count(), 0);
    assert.equal(optional.length, 0);
    await page.goto(`${origin}/politica-de-privacidade`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1000);
    await page.getByRole("button", { name: "Preferências de cookies" }).click();
    await page.waitForTimeout(250);
    await panel.waitFor();
    await page.getByRole("switch", { name: "Medição de campanhas com a Meta" }).click();
    await panel.getByRole("button", { name: "Salvar preferências" }).click();
    await panel.waitFor({ state: "detached" });
    assert.equal(
      await page.evaluate(
        () => JSON.parse(localStorage.getItem("lectum.privacy.guest")).authorizeTransfer,
      ),
      false,
    );
    assert.equal(
      await page.evaluate(() => JSON.parse(localStorage.getItem("lectum.privacy.guest")).campaigns),
      true,
    );
    await page.reload();
    await page.waitForTimeout(1000);
    await page.getByRole("button", { name: "Preferências de cookies" }).click();
    assert.equal(
      await page
        .getByRole("switch", { name: "Medição de campanhas com a Meta" })
        .getAttribute("aria-checked"),
      "true",
    );
    await panel.getByRole("button", { name: "Recusar opcionais", exact: true }).click();
    assert.equal(
      await page.evaluate(() => JSON.parse(localStorage.getItem("lectum.privacy.guest")).campaigns),
      false,
    );
    assert.deepEqual(meta, []);
    await page.getByRole("button", { name: "Preferências de cookies" }).click();
    await panel.waitFor();
    await panel.getByRole("button", { name: "Aceitar cookies", exact: true }).click();
    await panel.waitFor({ state: "detached" });
    assert.equal(
      await page.evaluate(
        () => JSON.parse(localStorage.getItem("lectum.privacy.guest")).authorizeTransfer,
      ),
      true,
    );
    await page.getByRole("button", { name: "Preferências de cookies" }).click();
    await panel.waitFor();
    await page.evaluate(() => {
      const original = Storage.prototype.setItem;
      Storage.prototype.setItem = function (key, value) {
        if (key.startsWith("lectum.privacy."))
          throw new DOMException("Test quota", "QuotaExceededError");
        return original.call(this, key, value);
      };
    });
    await panel.getByRole("button", { name: "Aceitar cookies", exact: true }).click();
    await panel
      .getByRole("alert")
      .filter({ hasText: "Não foi possível salvar sua preferência" })
      .waitFor();
    assert.equal(await page.evaluate(() => localStorage.getItem("lectum.privacy.guest")), null);
    await page.goto(`${origin}/auth/login`, { waitUntil: "domcontentloaded" });
    await page.evaluate(() => localStorage.removeItem("lectum.privacy.guest"));
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2500);
    assert.equal(await banner.count(), 0, "No banner during login");
    await page.goto(origin, { waitUntil: "domcontentloaded" });
    await banner.waitFor();
    await banner.getByRole("button", { name: "ACEITAR COOKIES", exact: true }).click();
    assert.equal(
      await page.evaluate(
        () => JSON.parse(localStorage.getItem("lectum.privacy.guest")).authorizeTransfer,
      ),
      true,
    );
    assert.equal(
      await page.evaluate(() => JSON.parse(localStorage.getItem("lectum.privacy.guest")).campaigns),
      true,
    );
    await page.evaluate(() => localStorage.removeItem("lectum.privacy.guest"));
    await page.reload({ waitUntil: "domcontentloaded" });
    await banner.waitFor();
    assert.equal(await banner.getByRole("button", { name: /recusar/i }).count(), 0);
    await banner.getByRole("button", { name: "Preferências", exact: true }).click();
    await panel.getByRole("button", { name: "Recusar opcionais", exact: true }).click();
    assert.equal(
      await page.evaluate(() => JSON.parse(localStorage.getItem("lectum.privacy.guest")).campaigns),
      false,
    );
    assert.deepEqual(meta, []);
    await context.close();
    console.log(
      `${name}: bounds, navigation, default-off, refusal, reload, reopen, save and revoke passed.`,
    );
  }
  assert.deepEqual(failures, []);
} finally {
  await browser.close();
}
