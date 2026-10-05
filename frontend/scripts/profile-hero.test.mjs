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

test("profile shows outline plus Favoritar until selected, then the production circle", () => {
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
    assert.match(favorite, /h-10/);
    assert.match(favorite, /rounded-full/);
    assert.match(favorite, /lucide-heart/);
    assert.match(favorite, /stroke-width="2"/);
    assert.match(favorite, /motion-reduce:transition-none/);
    assert.match(follow, /h-10/);
    assert.match(follow, /rounded-full/);
    assert.match(follow, /shadow-sm/);
    assert.match(follow, /motion-reduce:transition-none/);
    assert.match(follow, /style="font-size:13px;font-weight:600"/);
    for (const html of [favorite, follow])
      assert.match(html, new RegExp(`aria-pressed="${active}"`));
    if (active) {
      assert.match(favorite, /w-10 gap-0 border-favorite-border bg-favorite-soft/);
      assert.match(favorite, /w-0 opacity-0/);
      assert.match(favorite, /lucide-heart/);
      assert.match(favorite, /fill-current/);
      assert.match(favorite, /text-favorite/);
      assert.match(follow, /w-10 gap-0 border-primary\/25 bg-primary-soft text-primary/);
      assert.match(follow, /lucide-check[^>]*scale-100 opacity-100/);
      assert.match(follow, /w-0 opacity-0/);
    } else {
      assert.match(favorite, /w-\[112px\] gap-2/);
      assert.match(favorite, /w-\[56px\] opacity-100/);
      assert.match(favorite, /style="font-size:13px;font-weight:600">Favoritar<\/span>/);
      assert.match(favorite, /fill-none/);
      assert.match(favorite, /border-border bg-surface/);
      assert.match(follow, /w-\[112px\] gap-2 border-border bg-surface/);
      assert.match(follow, /lucide-plus[^>]*scale-100 opacity-100/);
      assert.match(follow, />Seguir<\/span>/);
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

test("community hero keeps both pending states stable and blocks repeated requests", () => {
  for (const following of [false, true]) {
    const html = renderToStaticMarkup(
      createElement(CommunityFollowButton, { following, size: "hero", pending: true }),
    );
    assert.match(html, /disabled=""/);
    assert.match(html, /aria-busy="true"/);
    assert.match(html, /type="button"/);
    assert.match(html, /lucide-loader/);
    assert.match(html, /motion-reduce:animate-none/);
    assert.match(html, /lucide-check[^>]*opacity-0/);
    assert.match(html, /lucide-plus[^>]*opacity-0/);
    assert.match(html, following ? /w-10 gap-0/ : /w-\[112px\] gap-2/);
  }
});
