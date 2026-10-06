import "../../../scripts/register-source-modules.mjs";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { registerHooks } from "node:module";
import test from "node:test";
import { configureStore } from "@reduxjs/toolkit";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Provider } from "react-redux";
import {
  communityCarouselOffset,
  isCommunityFeedExhausted,
  refreshCommunityRecommendations,
  selectCommunityRecommendations,
} from "./community-recommendations.ts";

const imageUrl = import.meta.resolve("next/image.js");
const imageBridge = `data:text/javascript,${encodeURIComponent(`import Image from ${JSON.stringify(imageUrl)}; export default Image.default ?? Image;`)}`;
registerHooks({
  resolve(specifier, context, nextResolve) {
    return nextResolve(
      specifier === "next/image"
        ? imageBridge
        : ["next/link", "next/navigation"].includes(specifier)
          ? `${specifier}.js`
          : specifier,
      context,
    );
  },
});
const { CommunityRecommendationsCarousel } = await import(
  "./community-recommendations-carousel.tsx"
);
const { CommunityFollowButton } = await import("./community-follow-button.tsx");
const { default: rootReducer } = await import("../../store/modules/rootReducers.ts");
const { ProgressiveConversionContext, noopContext } = await import(
  "../conversion/progressive-conversion-state.ts"
);

const community = (slug, overrides = {}) => ({
  id: slug,
  slug,
  name: `Comunidade ${slug}`,
  category: null,
  following: false,
  posts_count: 2,
  members_count: 3,
  ...overrides,
});

test("recommendations exclude current, followed and duplicate communities", () => {
  const items = [
    community("current"),
    community("followed", { following: true }),
    community("other"),
    community("other"),
  ];
  assert.deepEqual(
    selectCommunityRecommendations(items, { slug: "current" }).map((item) => item.slug),
    ["other"],
  );
  assert.deepEqual(
    selectCommunityRecommendations([community("followed", { following: true })]),
    [],
  );
});

test("related category precedes popularity; ties have deterministic order", () => {
  const items = [
    community("popular", { posts_count: 100 }),
    community("related", { category: "Autocuidado" }),
    community("b"),
    community("a"),
  ];
  assert.deepEqual(
    selectCommunityRecommendations(items, { slug: "current", category: "Autocuidado" }).map(
      (item) => item.slug,
    ),
    ["related", "popular", "a", "b"],
  );
});

test("successful follow refreshes the card in place without removing or reordering it", () => {
  const slugs = ["a", "b"];
  const updated = refreshCommunityRecommendations(slugs, [
    community("b", { posts_count: 200 }),
    community("a", { following: true }),
  ]);
  assert.deepEqual(
    updated.map((item) => item.slug),
    slugs,
  );
  assert.equal(updated[0].following, true);
  assert.equal(updated[1].posts_count, 200);
  assert.deepEqual(refreshCommunityRecommendations(slugs, []), []);
});

test("community end requires success and a known exhausted page, never loading/error/search", () => {
  const state = {
    success: true,
    loading: false,
    error: false,
    hasNextPage: false,
    searching: false,
  };
  assert.equal(isCommunityFeedExhausted(state), true);
  for (const change of [
    { success: false },
    { loading: true },
    { error: true },
    { hasNextPage: true },
    { hasNextPage: undefined },
    { searching: true },
  ]) {
    assert.equal(isCommunityFeedExhausted({ ...state, ...change }), false);
  }
});

test("home shelves start after four posts then twelve apart, without repeating batches", () => {
  const slots = Array.from({ length: 30 }, (_, index) => [
    index,
    communityCarouselOffset(index, 30, false),
  ]).filter(([, offset]) => offset !== null);
  assert.deepEqual(slots, [
    [3, 0],
    [15, 6],
    [27, 12],
  ]);
  assert.equal(communityCarouselOffset(1, 2, false), null);
  assert.equal(communityCarouselOffset(1, 2, true), 0);
  assert.equal(communityCarouselOffset(0, 0, true), null);
});

test("recommendation follow button has stable dimensions and accessible pending/active states", () => {
  const render = (props) =>
    renderToStaticMarkup(
      createElement(CommunityFollowButton, { size: "recommendation", following: false, ...props }),
    );
  assert.match(render({}), /lucide-plus/);
  assert.match(render({ following: true }), /lucide-check/);
  assert.match(render({ following: true }), /Seguindo/);
  assert.match(render({ following: true }), /aria-pressed="true"/);
  assert.match(render({ pending: true }), /aria-busy="true"/);
  assert.match(render({ pending: true }), /disabled=""/);
  for (const following of [false, true]) assert.match(render({ following }), /h-8 w-full/);
  assert.match(render({}), /rounded-full/);
  assert.match(render({}), /font-size:13px;font-weight:600/);
  assert.match(render({}), /border-primary bg-primary text-primary-foreground/);
});

test("compact carousel uses community avatars, no cover or arrow controls, and independent follow", () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  const store = configureStore({ reducer: rootReducer });
  const html = renderToStaticMarkup(
    createElement(
      Provider,
      { store },
      createElement(
        QueryClientProvider,
        { client },
        createElement(
          ProgressiveConversionContext.Provider,
          { value: noopContext },
          createElement(CommunityRecommendationsCarousel, {
            communities: [
              community("ansiedade-em-equilibrio", {
                posts_count: 1,
                avatar_url: "/community/icons/tdah.png",
              }),
              community("sem-avatar"),
            ],
          }),
        ),
      ),
    ),
  );
  client.clear();
  assert.match(html, /Comunidades sugeridas/);
  assert.match(html, /aria-label="Comunidades sugeridas: carrossel"/);
  assert.match(html, /href="\/comunidades"/);
  assert.match(html, /href="\/comunidades\/ansiedade-em-equilibrio"/);
  assert.match(html, /tdah.png/);
  assert.doesNotMatch(html, /ansiedade.png|community-card-overlay|lucide-chevron/);
  assert.match(html, /Avatar da comunidade Comunidade ansiedade-em-equilibrio/);
  assert.match(html, /h-\[76px\] w-\[76px\]/);
  assert.match(html, /rounded-\[18px\] border-\[4px\] border-media-foreground/);
  assert.match(html, /h-\[208px\]/);
  assert.ok(html.includes("w-[calc((100%_-_28px)/var(--visible-cards)_-_12px)]"));
  assert.match(html, /@container\/recommendations/);
  assert.match(html, /gap-\[12px\]/);
  assert.match(html, /scroll-px-\[4px\]/);
  assert.match(html, /rounded-\[22px\]/);
  assert.match(html, /shadow-lectum-soft/);
  assert.match(html, /\[scrollbar-width:none\]/);
  assert.match(html, /\[&amp;::-webkit-scrollbar\]:hidden/);
  assert.match(html, /tabindex="0"/);
  assert.match(html, />CS<\/span>/);
  assert.doesNotMatch(html, /\b\d+ posts?\b|Comunidades para você/);
  assert.match(html, /Seguir Comunidade ansiedade-em-equilibrio/);
  assert.doesNotMatch(html, /<a\b[^>]*>(?:(?!<\/a>)[\s\S])*<button\b/);
  assert.match(html, /snap-x snap-mandatory/);
});

test("responsive card widths reserve the next card across container sizes", () => {
  const source = readFileSync(
    new URL("./community-recommendations-carousel.tsx", import.meta.url),
    "utf8",
  );
  const breakpoints = [
    ...source.matchAll(/@min-\[(\d+)px\]\/recommendations:\[--visible-cards:(\d+)\]/g),
  ].map(([, width, count]) => [Number(width), Number(count)]);
  assert.deepEqual(breakpoints, [
    [320, 2],
    [480, 3],
    [640, 4],
    [800, 5],
    [960, 6],
  ]);
  for (let width = 240; width <= 1200; width++) {
    const count = breakpoints.filter(([min]) => width >= min).at(-1)?.[1] ?? 1;
    const cardWidth = (width - 28) / count - 12;
    const peek = width + 4 - count * (cardWidth + 12);
    assert.ok(cardWidth >= 134, `readable card at ${width}px`);
    assert.ok(Math.abs(peek - 32) < 0.01, `next-card hint at ${width}px`);
  }
});

test("integration keeps home shelves outside posts and community shelf after the loader", () => {
  const home = readFileSync(
    new URL("../../app/app/community/[slug]/views/community-feed.tsx", import.meta.url),
    "utf8",
  );
  const detail = readFileSync(
    new URL("../../app/app/community/[slug]/views/community-detail.tsx", import.meta.url),
    "utf8",
  );
  assert.match(home, /<Fragment key=\{post.id\}>/);
  assert.match(home, /!search.trim\(\)/);
  assert.match(home, /!selectedCommunitySlug/);
  assert.ok(
    detail.indexOf("<CommunityRecommendationsCarousel") > detail.indexOf("<InfinitePostLoader"),
  );
  assert.match(detail, /searching: communitySearchOpen,/);
  assert.doesNotMatch(detail, /searching:.*opportunities/);
  assert.doesNotMatch(detail, /title="Explore outras comunidades"/);
  assert.match(detail, /\{showRecommendations \? \(\s*<CommunityRecommendationsCarousel/);
  assert.match(detail, /hasNextPage: postsQuery.hasNextPage/);
  assert.match(detail, /useCommunityRecommendations\(showRecommendations, community\)/);
});
