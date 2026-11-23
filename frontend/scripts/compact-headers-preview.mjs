import "./register-source-modules.mjs";
import assert from "node:assert/strict";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire, registerHooks } from "node:module";
import { resolve } from "node:path";
import { createElement } from "react";

const bridges = new Map(
  ["image", "link"].map((name) => [
    `next/${name}`,
    `data:text/javascript,${encodeURIComponent(`import actual from ${JSON.stringify(import.meta.resolve(`next/${name}.js`))}; export default actual.default ?? actual;`)}`,
  ]),
);
registerHooks({
  resolve(specifier, context, next) {
    return next(
      bridges.get(specifier) ??
        (specifier === "next/navigation" ? "next/navigation.js" : specifier),
      context,
    );
  },
});
const { renderRelations } = await import(
  "../src/components/community/community-relations-test-renderer.mjs"
);
const { ProfileHero } = await import("../src/app/app/psychologist/[id]/components/hero.tsx");
const { CommunityHeader } = await import(
  "../src/app/app/community/[slug]/components/community-header.tsx"
);
const postcss = createRequire(import.meta.resolve("@tailwindcss/postcss"))("postcss");
const { default: tailwind } = await import("@tailwindcss/postcss");
const css = (
  await postcss([tailwind({ base: process.cwd() })]).process(
    readFileSync("src/app/globals.css", "utf8"),
    { from: resolve("src/app/globals.css") },
  )
).css;
const noop = () => {};
const profile = {
  id: "preview",
  name: "Ana Lima",
  gender: "feminino",
  crp: "06/123456",
  formation_years: 15,
  verified: true,
  headline: "Te trago de volta para voce!",
  whatsapp_url: "https://wa.me/5511999999999",
};
const community = {
  id: "preview",
  slug: "ansiedade",
  name: "Ansiedade",
  members_count: 43,
  posts_count: 17,
  description:
    "Pensamentos acelerados, preocupações constantes ou medo do futuro? Compartilhe o que sente e encontre acolhimento de psicólogos.",
  rules: [],
  visual_primary_color: "#F58B32",
  avatar_url: "/community/icons/ansiedade.png",
};
const render = (child) => renderRelations({ children: child });
const sections = {
  perfil: render(
    createElement(ProfileHero, {
      profile,
      canFavorite: true,
      canEditProfile: false,
      favoritePending: false,
      onBack: noop,
      onEditProfile: noop,
      onShareProfile: noop,
      onToggleFavorite: noop,
    }),
  ),
  comunidade: render(
    createElement(CommunityHeader, {
      community,
      following: false,
      membershipPending: false,
      onBack: noop,
      onSearch: noop,
      onShare: noop,
      onToggleFollow: noop,
    }),
  ),
};
const out = resolve(process.argv[2] ?? "../.tmp/compact-headers");
mkdirSync(out, { recursive: true });
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE);
const browser = await chromium.launch({ channel: "chrome", headless: true });
try {
  for (const [name, html] of Object.entries(sections)) {
    const document = `<!doctype html><html lang="pt-BR"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>${css}</style><style>@font-face{font-family:Manrope;font-weight:200 800;src:url('/font.woff2')} :root{--font-manrope:Manrope} body{margin:0} main{max-width:720px;margin:auto} </style><main ${name === "comunidade" ? 'class="px-5"' : ""}>${html}</main></html>`;
    writeFileSync(resolve(out, name + ".html"), document);
    const page = await browser.newPage();
    await page.route("http://preview.local/**", async (route) => {
      const url = new URL(route.request().url());
      if (url.pathname === "/") return route.fulfill({ contentType: "text/html", body: document });
      const file =
        url.pathname === "/font.woff2"
          ? resolve(".next/static/media/8760c4774489e4ba-s.p.woff2")
          : resolve("public", "." + url.pathname);
      if (!file.startsWith(resolve("public")) && url.pathname !== "/font.woff2")
        return route.abort();
      try {
        return route.fulfill({
          body: readFileSync(file),
          contentType: file.endsWith(".woff2") ? "font/woff2" : "image/png",
        });
      } catch {
        return route.abort();
      }
    });
    // Next's optimized image request is resolved to the same local asset, without changing layout.
    await page.route("http://preview.local/_next/image**", (route) => {
      const asset = new URL(route.request().url()).searchParams.get("url");
      return route.fulfill({
        contentType: "image/png",
        body: readFileSync(resolve("public", "." + asset)),
      });
    });
    for (const width of [390, 1440]) {
      await page.setViewportSize({ width, height: 780 });
      await page.goto("http://preview.local/");
      await page.evaluate(() => document.fonts.ready);
      await page.waitForFunction(() =>
        Array.from(document.images).every((img) => img.complete && img.naturalWidth > 0),
      );
      const dimensions = await page.evaluate(() => ({
        height: document.querySelector("header > div").getBoundingClientRect().height,
        overflow: document.documentElement.scrollWidth > innerWidth,
        avatar: document.querySelector("[data-profile-avatar]")
          ? getComputedStyle(document.querySelector("[data-profile-avatar]")).borderRadius
          : null,
      }));
      assert.equal(dimensions.height, 100);
      assert.equal(dimensions.overflow, false);
      if (name === "perfil") {
        const cta = await page.locator('[data-profile-whatsapp-cta="hero"]').evaluate((el) => {
          const bg = getComputedStyle(el, "::before");
          return {
            touch: el.getBoundingClientRect().height,
            visual: parseFloat(bg.height),
            weight: getComputedStyle(el.querySelector("span")).fontWeight,
          };
        });
        assert.equal(cta.touch, 44);
        assert.equal(cta.visual, 40);
        assert.equal(cta.weight, "700");
        console.log("whatsapp", width, cta);
      }
      if (name === "perfil") assert.ok(parseFloat(dimensions.avatar) >= 38, dimensions.avatar);
      await page.locator("main").screenshot({ path: resolve(out, `${name}-${width}.png`) });
      console.log(name, width, JSON.stringify(dimensions));
    }
    await page.close();
  }
} finally {
  await browser.close();
}
console.log(out);
