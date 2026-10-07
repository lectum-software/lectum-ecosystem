import "./register-source-modules.mjs";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
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

const { CommunityScrollHeader, CommunityStickyBar } = await import(
  "../src/app/app/community/[slug]/components/community-scroll-header.tsx"
);
const props = {
  community: {
    name: "Relacionamentos e desenvolvimento pessoal",
    slug: "relacionamentos",
    rules: [],
    members_count: 12,
    posts_count: 3,
  },
  following: false,
  membershipPending: false,
  onToggleFollow() {},
  onBack() {},
  onSearch() {},
  onShare() {},
};

test("hidden community bar is inert and does not add height or a second grid gap", () => {
  const html = renderToStaticMarkup(createElement(CommunityScrollHeader, props));
  assert.match(html, /aria-hidden="true" inert="" data-community-sticky-bar/);
  assert.match(html, /sticky top-0[^"]*-mb-4 h-0/);
  assert.match(html, /<h1[^>]*>Relacionamentos e desenvolvimento pessoal<\/h1>/);
});

for (const following of [false, true]) {
  for (const membershipPending of [false, true]) {
    test(`community bar shares membership state: following=${following}, pending=${membershipPending}`, () => {
      const html = renderToStaticMarkup(
        createElement(CommunityStickyBar, {
          ...props,
          following,
          membershipPending,
          visible: true,
        }),
      );
      assert.match(html, /aria-hidden="false" data-community-sticky-bar/);
      assert.doesNotMatch(html, /inert=""/);
      assert.match(html, /pointer-events-auto visible/);
      assert.match(html, /h-9 w-9 rounded-lg/);
      assert.match(html, /truncate[^>]*title="Relacionamentos e desenvolvimento pessoal"/);
      assert.match(html, new RegExp(`aria-pressed="${following}"`));
      assert.match(html, new RegExp(`aria-busy="${membershipPending}"`));
      assert.equal(html.includes('disabled=""'), membershipPending);
      assert.match(html, following ? /Seguindo comunidade. Deixar de seguir/ : /Seguir comunidade/);
    });
  }
}

test("observer hands off after the original action exits and disconnects on unmount", () => {
  const source = readFileSync(
    new URL(
      "../src/app/app/community/[slug]/components/community-scroll-header.tsx",
      import.meta.url,
    ),
    "utf8",
  );
  assert.match(source, /anchor\.getBoundingClientRect\(\)\.bottom <= 0/);
  assert.match(source, /observer\.observe\(anchor\)/);
  assert.match(source, /observer\.disconnect\(\)/);
  assert.match(source, /<CommunityHeader \{\.\.\.props\} followAnchorRef=\{anchorRef\}/);
  assert.match(source, /onClick=\{onToggleFollow\}/);
});
