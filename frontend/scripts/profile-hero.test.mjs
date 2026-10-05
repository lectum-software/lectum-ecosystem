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
const { CommunityFollowButton } = await import(
  "../src/components/community/community-follow-button.tsx"
);

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

test("profile favorite and community follow share stable hero dimensions and typography", () => {
  for (const active of [false, true]) {
    const favorite = renderToStaticMarkup(
      createElement(ProfileHero, {
        canFavorite: true,
        canEditProfile: false,
        favoritePending: false,
        profile: { name: "Ana Lima", verified: true, rating_avg: 0, favorited: active },
      }),
    ).match(
      /<button[^>]*aria-label="(?:Favoritar Ana Lima|Remover Ana Lima dos favoritos)".*?<\/button>/s,
    )?.[0];
    assert.ok(favorite);
    const follow = renderToStaticMarkup(
      createElement(CommunityFollowButton, { following: active, size: "hero" }),
    );
    for (const html of [favorite, follow]) {
      assert.match(html, /h-10 w-\[108px\]/);
      assert.match(html, /rounded-\[6px\]/);
      assert.match(html, /bg-transparent/);
      assert.match(html, /style="font-size:13px;font-weight:600"/);
      assert.match(html, new RegExp(`aria-pressed="${active}"`));
    }
    if (active) {
      assert.match(favorite, /lucide-heart/);
      assert.match(favorite, /fill-current/);
      assert.match(favorite, /text-danger/);
      assert.match(follow, />Seguindo<\/button>/);
    } else {
      assert.match(favorite, />Favoritar<\/button>/);
      assert.doesNotMatch(favorite, /lucide-heart/);
      assert.match(follow, />Seguir<\/button>/);
    }
  }
});

test("pending and own-profile favorite states remain disabled", () => {
  for (const props of [
    { canFavorite: true, favoritePending: true },
    { canFavorite: false, favoritePending: false },
  ]) {
    const html = renderToStaticMarkup(
      createElement(ProfileHero, {
        ...props,
        canEditProfile: false,
        profile: { name: "Ana Lima", rating_avg: 0 },
      }),
    );
    const button = html.match(/<button[^>]*aria-label="Favoritar Ana Lima"[^>]*>/)?.[0];
    assert.ok(button);
    assert.match(button, /disabled=""/);
  }
  const following = renderToStaticMarkup(
    createElement(CommunityFollowButton, { following: true, size: "hero", pending: true }),
  );
  assert.match(following, /disabled=""/);
  assert.match(following, /aria-busy="true"/);
  assert.match(following, /Seguindo/);
});
