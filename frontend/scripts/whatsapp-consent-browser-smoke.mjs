// Local browser contract test: synthetic API, no provider traffic or real contacts.
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const origin = "http://127.0.0.1:3140";
const out = "../.tmp/whatsapp-consent-qa";
await mkdir(out, { recursive: true });
const professional = {
  id: "qa-professional",
  name: "Teste Local",
  whatsapp_name: "Teste",
  avatar: null,
  headline: "Perfil ficticio",
  bio: "Validacao local",
  video_url: null,
  video_cover_url: null,
  crp: "00/00000",
  gender: null,
  modality: "online",
  languages: [],
  rating_avg: 0,
  rating_count: 0,
  reviews_publicly_visible: false,
  verified: false,
  available_today: false,
  formation_years: null,
  discount_first_session: false,
  social_value: false,
  accepts_insurance: false,
  show_experience_tag: false,
  whatsapp_url: "https://wa.me/5511999999999",
  favorited: false,
  followed: false,
  specialties: [],
  services: [],
  approaches: [],
  cover_image_url: null,
  address_city: null,
  address_state: null,
  academic_formations: [],
  target_audience: [],
  whatsapp_available: true,
};
const browser = await chromium.launch({ channel: "msedge", headless: true });
try {
  for (const width of [390, 1440]) {
    for (const scenario of ["refuse", "accept", "revoke", "unavailable"]) {
      const context = await browser.newContext({
        viewport: { width, height: 900 },
        serviceWorkers: "block",
      });
      const clicks = [],
        actions = [],
        external = [],
        errors = [],
        redirects = [];
      await context.addInitScript(() => {
        window.qaOpened = [];
        window.open = (url) => {
          window.qaOpened.push(String(url));
          return null;
        };
      });
      await context.route("**/*", async (route) => {
        const req = route.request(),
          url = new URL(req.url());
        if (["wa.me", "api.whatsapp.com"].includes(url.hostname)) {
          redirects.push(url.hostname);
          return route.fulfill({ status: 204 });
        }
        if (!["127.0.0.1", "localhost"].includes(url.hostname)) {
          external.push(url.hostname);
          return route.abort();
        }
        if (url.port === "3140") return route.continue();
        const headers = {
          "access-control-allow-origin": origin,
          "access-control-allow-credentials": "true",
          "access-control-allow-headers": "*",
          "access-control-allow-methods": "GET, POST, OPTIONS",
        };
        if (req.method() === "OPTIONS") return route.fulfill({ status: 204, headers });
        let data = {
          data: [],
          categories: [],
          page: 1,
          pages: 1,
          count: 0,
          following_count: 0,
          scope: "all",
          community_slug: null,
        };
        if (url.pathname.endsWith("/contact-click")) {
          const body = req.postDataJSON();
          clicks.push(body);
          if (scenario === "unavailable")
            return route.fulfill({
              status: 404,
              headers,
              json: { success: false, message: "Contato indisponivel" },
            });
          data = {
            psychologist_id: professional.id,
            contact_request_id: body.measurement_allowed ? "qa-click" : null,
            tracked: body.measurement_allowed,
            whatsapp_url: professional.whatsapp_url,
          };
        } else if (url.pathname.endsWith("/analytics/action")) {
          actions.push(req.postDataJSON());
          data = { tracked: true };
        } else if (url.pathname.endsWith("/psychologists/qa-professional")) data = professional;
        else if (url.pathname.endsWith("/posts"))
          data = {
            ...data,
            summary: {
              posts_count: 0,
              replies_count: 0,
              participation_communities: [],
              top_mentor_communities: [],
            },
            highlighted_publication: null,
          };
        else if (url.pathname.endsWith("/reviews"))
          data = {
            ...data,
            summary: { rating_avg: 0, rating_count: 0, distribution: {} },
            highlighted_review: null,
          };
        return route.fulfill({ headers, json: { success: true, data } });
      });
      const page = await context.newPage();
      page.on("pageerror", (e) => errors.push(e.message));
      page.setDefaultTimeout(30000);
      await page.goto(origin, { waitUntil: "domcontentloaded", timeout: 120000 });
      const notice = page.locator("[data-privacy-notice]");
      await notice.waitFor({ timeout: 120000 });
      if (scenario === "refuse") {
        await notice.getByRole("button", { name: "Preferências", exact: true }).click();
        await page
          .locator("[data-privacy-panel]")
          .getByRole("button", { name: "Recusar opcionais", exact: true })
          .click();
      } else {
        await notice.getByRole("button", { name: "ACEITAR COOKIES", exact: true }).click();
      }
      await notice.waitFor({ state: "detached" });
      if (scenario === "revoke") {
        await page.goto(`${origin}/politica-de-privacidade`, { waitUntil: "domcontentloaded" });
        await page.getByRole("button", { name: "Preferências de cookies" }).click();
        await page
          .locator("[data-privacy-panel]")
          .getByRole("button", { name: "Recusar opcionais", exact: true })
          .click();
      }
      await page.goto(`${origin}/psicologos/qa-professional`, {
        waitUntil: "domcontentloaded",
        timeout: 120000,
      });
      await page.locator('[data-profile-whatsapp-cta="hero"]').click();
      await page.waitForTimeout(1800);
      const whatsappActions = actions.filter((a) =>
        ["whatsapp_click", "psychologist_video_whatsapp_click"].includes(a.action_type),
      );
      assert.equal(clicks.length, 1);
      assert.equal(clicks[0].measurement_allowed, ["accept", "unavailable"].includes(scenario));
      if (["refuse", "revoke"].includes(scenario)) assert.equal(clicks[0].visitor_id, undefined);
      assert.equal(whatsappActions.length, scenario === "accept" ? 1 : 0);
      const opened = [...redirects, ...(await page.evaluate(() => window.qaOpened))];
      assert.equal(opened.length, scenario === "unavailable" ? 0 : 1);
      assert.deepEqual(errors, []);
      assert.equal(
        external.filter((host) => /facebook|fbcdn|meta\.com|wa\.me|whatsapp/.test(host)).length,
        0,
      );
      await page.screenshot({ path: `${out}/${width}-${scenario}.png` });
      console.log(
        JSON.stringify({
          width,
          scenario,
          contacts: clicks.length,
          measured: whatsappActions.length,
          opened: opened.length,
          errors,
        }),
      );
      await context.close();
    }
  }
} finally {
  await browser.close();
}
