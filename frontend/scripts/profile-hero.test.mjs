import "./register-source-modules.mjs";
import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

const bridges = new Map(
  ["image", "link"].map((name) => {
    const moduleUrl = import.meta.resolve(`next/${name}.js`);
    return [
      `next/${name}`,
      `data:text/javascript,${encodeURIComponent(`import actual from ${JSON.stringify(moduleUrl)}; export default actual.default ?? actual;`)}`,
    ];
  }),
);
registerHooks({
  resolve(specifier, context, nextResolve) {
    return nextResolve(bridges.get(specifier) ?? specifier, context);
  },
});
const { ProfileHero } = await import("../src/app/app/psychologist/[id]/components/hero.tsx");

export function renderHero(name, verified = true) {
  return renderToStaticMarkup(
    createElement(ProfileHero, {
      canFavorite: false,
      canEditProfile: false,
      favoritePending: false,
      profile: { name, verified, rating_avg: 0 },
    }),
  );
}

for (const [name, ending] of [
  ["Amanda Miranda Gomes de Azevedo", "Azevedo"],
  ["Ana", "Ana"],
  ["Ana Maria Silva-Santos", "Silva-Santos"],
]) {
  test(`verified badge shares an inline group with ${ending}`, () => {
    const html = renderHero(name);
    const heading = html.match(/<h1[^>]*>(.*?)<\/h1>/s)?.[1];
    assert.ok(heading);
    assert.ok(heading.includes(`class="inline-flex max-w-full items-center gap-1.5 align-bottom"`));
    assert.ok(heading.includes(`>${ending}</span><svg`));
    assert.ok(heading.includes('aria-label="Perfil verificado"'));
    assert.ok(!heading.includes("truncate"));
  });
}

test("unverified profiles retain their full name without a badge", () => {
  const html = renderHero("Amanda Miranda Gomes de Azevedo", false);
  assert.match(html, /<h1[^>]*>Amanda Miranda Gomes de Azevedo<\/h1>/);
  assert.ok(!html.includes('aria-label="Perfil verificado"'));
});
