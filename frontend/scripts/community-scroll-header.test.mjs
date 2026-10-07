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
  assert.match(html, /sticky top-0[^"]*col-start-1 row-start-1[^"]*h-0/);
  assert.match(html, /<header class="col-start-1 row-start-1 /);
  assert.doesNotMatch(html, /-mb-4/);
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

test("direction listeners and anchor observer are cleaned up on unmount", () => {
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
  assert.match(source, /removeEventListener\("scroll", onScroll\)/);
  assert.match(source, /removeEventListener\("resize", reset\)/);
  assert.match(source, /cancelAnimationFrame\(frame\)/);
  assert.match(source, /<CommunityHeader \{\.\.\.props\} followAnchorRef=\{anchorRef\}/);
  assert.match(source, /onClick=\{onToggleFollow\}/);
});

const { updateCommunityHeaderScroll: step } = await import(
  "../src/app/app/community/[slug]/modules/header-scroll.ts"
);

test("community bar appears only on upward scroll and hides on downward scroll", () => {
  let state = { position: 0, visible: false };
  state = step(state, 500, 2000, true);
  assert.equal(state.visible, false);
  state = step(state, 492, 2000, true);
  assert.equal(state.visible, true);
  state = step(state, 450, 2000, true);
  assert.equal(state.visible, true);
  state = step(state, 458, 2000, true);
  assert.equal(state.visible, false);
});

test("slow scrolling accumulates while tiny reversals do not flicker", () => {
  let state = { position: 500, visible: false };
  for (const y of [499, 498, 497, 498, 496, 495, 494, 493]) {
    state = step(state, y, 2000, true);
    assert.equal(state.visible, false);
  }
  state = step(state, 492, 2000, true);
  assert.equal(state.visible, true);
  assert.equal(step(state, 495, 2000, true).visible, true);
});

test("original header, restored position and overscroll never reveal a duplicate bar", () => {
  assert.equal(step({ position: 500, visible: false }, 500, 2000, true).visible, false);
  assert.equal(step({ position: 500, visible: true }, 400, 2000, false).visible, false);
  assert.equal(step({ position: 8, visible: true }, -30, 2000, true).visible, false);
  const bottom = step({ position: 2000, visible: false }, 2050, 2000, true);
  assert.equal(step(bottom, 2000, 2000, true).visible, false);
});
