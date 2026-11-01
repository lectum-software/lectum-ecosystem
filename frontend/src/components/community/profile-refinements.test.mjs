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

const imageUrl = import.meta.resolve("next/image.js");
const imageBridge = `data:text/javascript,${encodeURIComponent(`import Image from ${JSON.stringify(imageUrl)}; export default Image.default ?? Image;`)}`;
registerHooks({
  resolve(specifier, context, next) {
    return next(
      specifier === "next/image"
        ? imageBridge
        : ["next/link", "next/navigation"].includes(specifier)
          ? `${specifier}.js`
          : specifier,
      context,
    );
  },
  load(url, context, next) {
    if (url.endsWith("publications-activity-summary.module.css"))
      return {
        format: "module",
        shortCircuit: true,
        source: "export default new Proxy({}, { get: (_, key) => key });",
      };
    return next(url, context);
  },
});
const { PublicationsActivitySummary } = await import(
  "../../app/app/psychologist/[id]/components/publications-activity-summary.tsx"
);
const { ProfileReplyVisibilityButton } = await import(
  "../../app/app/psychologist/[id]/components/profile-reply-visibility-button.tsx"
);
const { default: rootReducer } = await import("../../store/modules/rootReducers.ts");
const source = (file) => readFileSync(new URL(file, import.meta.url), "utf8");

test("summary renders all communities, public counts, mentor ranks and a collapsed accessible list", () => {
  const communities = Array.from({ length: 5 }, (_, index) => ({
    id: `${index}`,
    slug: `c-${index}`,
    name: `Comunidade ${index}`,
    avatar_url: null,
    position: index < 3 ? index + 1 : null,
    badge: index < 3 ? `TOP #${index + 1} MENTOR` : null,
    posts_count: index,
    replies_count: 2,
  }));
  const html = renderToStaticMarkup(
    createElement(PublicationsActivitySummary, {
      summary: { posts_count: 10, replies_count: 10, participation_communities: communities },
    }),
  );
  assert.match(html, /Participa em 5 comunidades/);
  assert.match(html, /10 posts e 10 respostas no total/);
  assert.equal((html.match(/<li>/g) || []).length, 5);
  assert.equal((html.match(/Top .*? Mentor nesta comunidade/g) || []).length, 3);
  assert.match(html, /aria-expanded="false"/);
  assert.match(html, /hidden=""/);
  assert.match(html, /tabindex="0"/);
  assert.match(html, /href="\/comunidades\/c-4"/);
});

test("summary supports zero communities and older APIs without inventing per-community counts", () => {
  for (const communities of [
    [],
    [{ id: "a", slug: "a", name: "Sem selo", badge: null, position: null }],
  ]) {
    const html = renderToStaticMarkup(
      createElement(PublicationsActivitySummary, {
        summary: { posts_count: 1, replies_count: 0, participation_communities: communities },
      }),
    );
    assert.match(html, /lucide-file-text/);
    assert.doesNotMatch(html, /class="counts"|Top .*? Mentor/);
    if (!communities.length) assert.match(html, /disabled=""/);
  }
});

test("summary deduplicates header medals but preserves each community rank", () => {
  for (const [ranks, expected] of [
    [
      [1, 1, 2],
      ["gold", "silver"],
    ],
    [
      [2, 2, 3],
      ["silver", "bronze"],
    ],
    [
      [3, 1, 1, 1, 2, 3],
      ["gold", "silver", "bronze"],
    ],
    [[2, 2], ["silver"]],
  ]) {
    const communities = ranks.map((position, index) => ({
      id: `${index}`,
      slug: `c-${index}`,
      name: `Comunidade ${index}`,
      position,
      badge: `TOP #${position} MENTOR`,
      posts_count: 1,
      replies_count: 0,
    }));
    const html = renderToStaticMarkup(
      createElement(PublicationsActivitySummary, {
        summary: {
          posts_count: ranks.length,
          replies_count: 0,
          participation_communities: communities,
        },
      }),
    );
    const header = html.split("</button>")[0];
    assert.deepEqual(
      [...header.matchAll(/src="\/images\/community\/top-mentor\/(gold|silver|bronze)\.svg/g)].map(
        (match) => match[1],
      ),
      expected,
    );
    assert.equal((html.match(/Top .*? Mentor nesta comunidade/g) || []).length, ranks.length);
    assert.match(html, new RegExp(`Participa em ${ranks.length} comunidades`));
  }
});

test("activity counts omit zeros with correct singular, plural and empty states", () => {
  for (const [posts, replies, expected] of [
    [0, 4, "4 respostas"],
    [0, 18, "18 respostas"],
    [0, 1, "1 resposta"],
    [3, 0, "3 posts"],
    [1, 0, "1 post"],
    [1, 1, "1 post e 1 resposta"],
    [4, 2, "4 posts e 2 respostas"],
    [0, 0, ""],
  ]) {
    const html = renderToStaticMarkup(
      createElement(PublicationsActivitySummary, {
        summary: {
          posts_count: posts,
          replies_count: replies,
          participation_communities: [
            {
              id: "a",
              slug: "a",
              name: "Comunidade",
              position: null,
              badge: null,
              posts_count: posts,
              replies_count: replies,
            },
          ],
        },
      }),
    );
    assert.doesNotMatch(html, /0 posts|0 respostas/);
    if (expected) {
      assert.ok(html.includes(`<span class="counts">${expected}</span>`));
      assert.ok(html.includes(`${expected} no total`));
    } else {
      assert.doesNotMatch(html, /class="counts"|class="description"|no total/);
    }
  }
});

test("community avatars have no decorative frame and keep their image size", () => {
  const css = source(
    "../../app/app/psychologist/[id]/components/publications-activity-summary.module.css",
  );
  const avatar = css.match(/\.avatar \{([^}]+)\}/)?.[1];
  assert.ok(avatar);
  assert.doesNotMatch(avatar, /outline|border|padding|background/);
  assert.match(avatar, /width: 48px/);
  assert.match(css, /\.community:focus-visible/);
});

test("direct profile hide action appears only for the professional owner and only on replies", () => {
  const post = {
    id: "p",
    contribution_type: "reply",
    highlighted_professional_reply: { id: "r", author: { id: "owner", role: "psicologo" } },
  };
  for (const [user, type, visible] of [
    [{ id: "owner", role: "psicologo" }, "reply", true],
    [{ id: "other", role: "psicologo" }, "reply", false],
    [{ id: "owner", role: "paciente" }, "reply", false],
    [null, "reply", false],
    [{ id: "owner", role: "psicologo" }, "post", false],
  ]) {
    const client = new QueryClient();
    const store = configureStore({ reducer: rootReducer, preloadedState: { user } });
    const html = renderToStaticMarkup(
      createElement(
        Provider,
        { store },
        createElement(
          QueryClientProvider,
          { client },
          createElement(ProfileReplyVisibilityButton, {
            post: { ...post, contribution_type: type },
          }),
        ),
      ),
    );
    assert.equal(html.includes('aria-label="Ocultar do perfil público"'), visible);
    client.clear();
  }
});

test("approved wiring preserves feed reuse, static initial focus and native top-layer upgrade modal", () => {
  const typography = source(
    "../../app/app/psychologist/[id]/components/publications-activity-summary.module.css",
  );
  assert.match(typography, /font-size: var\(--text-sm\)/);
  assert.match(typography, /font-size: var\(--text-xs\)/);
  assert.match(typography, /font-style: italic/);
  const mine = source("../../app/app/posts/mine/logic.tsx");
  assert.match(mine, /!isPsychologist \? \(\s*<PostCard/);
  assert.match(mine, /authorActions=[\s\S]*?<PostOwnerActionMenu/);
  const upgrade = source("./community-media-upgrade-modal.tsx");
  assert.match(upgrade, /<Modal/);
  assert.doesNotMatch(upgrade, /createPortal|z-\[10000\]/);
  const comments = source("./content-video-comments-sheet.tsx");
  assert.match(comments, /initialFocusRef=\{titleRef\}/);
  assert.match(comments, /focus-visible:ring-2/);
  for (const file of [
    "./community-post-card.tsx",
    "../../app/app/community/[slug]/components/post-card.tsx",
    "../../app/app/community/[slug]/post/[id]/components/post-content.tsx",
  ]) {
    assert.match(source(file), /attached=\{hasVideoContact\}/);
    assert.match(source(file), /footer=\{hasVideoContact \? authorWhatsappCta : undefined\}/);
  }
});
