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

const nextImageUrl = import.meta.resolve("next/image.js");
const nextImageBridge = `data:text/javascript,${encodeURIComponent(
  `import Image from ${JSON.stringify(nextImageUrl)}; export default Image.default ?? Image;`,
)}`;
registerHooks({
  resolve(specifier, context, nextResolve) {
    const target =
      specifier === "next/image"
        ? nextImageBridge
        : ["next/link", "next/navigation"].includes(specifier)
          ? `${specifier}.js`
          : specifier;
    return nextResolve(target, context);
  },
});
const { CommunityPostCard } = await import("./community-post-card.tsx");
const { AppRouterContext } = await import(
  "next/dist/shared/lib/app-router-context.shared-runtime.js"
);
const { OriginalPostCommunityLink } = await import("./original-post-community-link.tsx");
const { AuthorIdentityLine } = await import(
  "../../app/app/community/[slug]/components/feed-controls.tsx"
);
const { getOriginalPostAuthorDisplayName, getCommunityAuthorDisplayName, getCommunityTopicName } =
  await import("../../utils/community-display.ts");
const { FeedFavoriteButton } = await import("./feed-favorite-button.tsx");
const { CommunityFollowToggle } = await import("./community-follow-toggle.tsx");
const { CommunityHeader } = await import(
  "../../app/app/community/[slug]/components/community-header.tsx"
);
const { default: rootReducer } = await import("../../store/modules/rootReducers.ts");
const { default: keys } = await import("../../api/cache/keys.ts");
const { loadFavoriteIds, updateFavoriteIds } = await import(
  "../../api/callers/patient/favorite-ids.ts"
);
const { ProgressiveConversionContext, noopContext } = await import(
  "../conversion/progressive-conversion-state.ts"
);

const renderRelations = ({ userId, authenticated = Boolean(userId), ids, children }) => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  if (ids) client.setQueryData(keys.patient.favoriteIds(userId), ids);
  const store = configureStore({
    reducer: rootReducer,
    preloadedState: { user: userId ? { id: userId } : null },
  });
  const html = renderToStaticMarkup(
    createElement(
      Provider,
      { store },
      createElement(
        QueryClientProvider,
        { client },
        createElement(
          ProgressiveConversionContext.Provider,
          { value: { ...noopContext, isAuthenticated: authenticated } },
          children,
        ),
      ),
    ),
  );
  client.clear();
  return html;
};

test("inactive feed favorite uses a plus inheriting the label color without a border", () => {
  const children = createElement(FeedFavoriteButton, {
    author: { id: "psi", name: "Ana Lima", role: "psicologo" },
  });
  for (const state of [{}, { userId: "viewer", ids: [] }]) {
    const html = renderRelations({ ...state, children });
    const label = html.match(/favorite-toggle-label gap-1">(.*?)<\/span>/)?.[1];
    assert.ok(label);
    assert.match(label, /lucide-plus/);
    assert.match(label, /fill="none"/);
    assert.match(label, /stroke="currentColor"/);
    assert.doesNotMatch(label, /text-favorite|fill-current|text-danger|lucide-heart/);
    assert.match(label, /<\/svg>Favoritar$/);
    assert.match(html, /text-primary/);
    assert.match(html, /h-3 w-3 shrink-0/);
    assert.match(html, /border-0/);
    assert.doesNotMatch(html, /(?:^|\s)border(?:\s|$)/);
    assert.match(html, /h-5/);
    assert.match(html, /w-\[66px\]/);
    assert.match(html, /style="font-size:11px;font-weight:600"/);
    assert.match(html, /bg-transparent/);
    assert.match(html, /rounded-\[6px\]/);
    assert.doesNotMatch(html, /rounded-full/);
    assert.doesNotMatch(html, /bg-surface|hover:bg-/);
    assert.match(html, /aria-pressed="false"/);
    assert.match(html, /aria-label="Favoritar Ana Lima"/);
    assert.match(html, /aria-hidden="true" class="favorite-toggle-heart"/);
    assert.doesNotMatch(html, /Seguindo/);
  }
  for (const state of [{ userId: "psi", ids: [] }, { userId: "viewer" }, { authenticated: true }])
    assert.equal(renderRelations({ ...state, children }), "");
});

test("known favorites retain the production heart and can be unfavorited", () => {
  const author = { id: "psi", name: "Ana Lima", role: "psicologo" };
  const children = createElement(FeedFavoriteButton, { author });
  const inactive = renderRelations({ userId: "viewer", ids: [], children });
  assert.match(inactive, /aria-pressed="false"/);
  assert.match(inactive, /favorite-toggle-label gap-1">.*lucide-plus.*<\/svg>Favoritar<\/span>/);
  const active = renderRelations({ userId: "viewer", ids: ["psi"], children });
  assert.match(active, /aria-pressed="true"/);
  assert.match(active, /aria-label="Remover Ana Lima dos favoritos"/);
  assert.match(active, /lucide-heart/);
  assert.match(active, /fill-current/);
  assert.match(active, /text-favorite/);
  assert.match(active, /stroke-width="2"/);
  assert.match(active, /favorite-toggle pointer-events-auto/);
  assert.match(active, /title="Remover Ana Lima dos favoritos"/);
  assert.doesNotMatch(active, />Favoritado|text-danger/);
  assert.equal(renderRelations({ userId: "psi", ids: [], children }), "");
  assert.equal(
    renderRelations({
      children: createElement(FeedFavoriteButton, {
        author: { ...author, role: "paciente" },
      }),
    }),
    "",
  );
});

test("favorite transitions compact the slot beside the badge and respect reduced motion", () => {
  const css = readFileSync(new URL("../../app/globals.css", import.meta.url), "utf8");
  assert.match(
    css,
    /\.favorite-toggle\[aria-pressed="true"\] \{\s*width: 24px;\s*border-color: transparent;/,
  );
  assert.match(css, /\.favorite-toggle-heart \{[^}]*left: 2px;[^}]*opacity: 0;/);
  assert.match(
    css,
    /\.favorite-toggle\[aria-pressed="true"\] \.favorite-toggle-label \{\s*opacity: 0;/,
  );
  assert.match(
    css,
    /\.favorite-toggle\[aria-pressed="true"\] \.favorite-toggle-heart \{\s*opacity: 1;/,
  );
  assert.match(
    css,
    /@media \(prefers-reduced-motion: reduce\) \{\s*\.favorite-toggle,[\s\S]*?transition: none;/,
  );
  for (const suffix of ["", "-soft", "-border"]) {
    assert.ok(css.includes(`--lectum-favorite${suffix}: var(--lectum-danger${suffix});`));
  }
});

test("original post community follows the compact favorite slot without changing replies", () => {
  const css = readFileSync(new URL("../../app/globals.css", import.meta.url), "utf8");
  const slot =
    'span:has(> .favorite-toggle[aria-pressed="true"]):has(+ [data-original-post-community])';
  assert.ok(css.includes(`${slot} {\n  width: 24px;`));
  assert.match(
    css,
    /span:has\(> \.favorite-toggle\) \+ \[data-original-post-community\] \{\s*transition: max-width 260ms ease;/,
  );
  assert.match(css, /max-width: min\(48%, calc\(100% - 82px\)\);/);
  const reduced = css.slice(css.indexOf("@media (prefers-reduced-motion: reduce)"));
  assert.match(
    reduced,
    /span:has\(> \.favorite-toggle\):has\(\+ \[data-original-post-community\]\)/,
  );
  assert.match(
    reduced,
    /span:has\(> \.favorite-toggle\) \+ \[data-original-post-community\] \{\s*transition: none;/,
  );
  const author = { id: "psi", name: "Camilla Sousa", role: "psicologo", verified: true };
  for (const active of [false, true]) {
    for (const original of [false, true]) {
      const html = renderRelations({
        userId: "viewer",
        ids: active ? [author.id] : [],
        children: createElement(AuthorIdentityLine, {
          name: author.name,
          verified: true,
          action: createElement(FeedFavoriteButton, { author }),
          community: original
            ? { name: "Ansiedade em equilibrio", category: "Ansiedade", slug: "ansiedade" }
            : undefined,
        }),
      });
      assert.ok(html.includes(`aria-pressed="${active}"`));
      assert.equal(html.includes("data-original-post-community"), original);
      assert.match(html, /w-\[66px\] shrink-0/);
    }
  }
});

test("all post headers and comments share the persistent favorite toggle", () => {
  const detail = readFileSync(
    new URL(
      "../../app/app/community/[slug]/post/[id]/components/post-content.tsx",
      import.meta.url,
    ),
    "utf8",
  );
  const header = detail.slice(
    detail.indexOf("export const PostHeader"),
    detail.indexOf("export const PostBody"),
  );
  assert.doesNotMatch(header, /<FileText/);
  assert.doesNotMatch(header, /CommunityFollowToggle|CommunityFollowButton/);
  assert.doesNotMatch(detail, /hideFavorited=\{false\}/);
  assert.equal((detail.match(/<FeedFavoriteButton author=\{post.author\} \/>/g) ?? []).length, 2);
  const replies = readFileSync(
    new URL("../../app/app/community/[slug]/post/[id]/components/reply-card.tsx", import.meta.url),
    "utf8",
  );
  assert.match(replies, /<FeedFavoriteButton author=\{reply.author\} \/>/);
  assert.doesNotMatch(replies, /hideFavorited=\{false\}/);
  for (const file of ["./community-post-card.tsx", "./community-post-card-reply-preview.tsx"]) {
    const source = readFileSync(new URL(file, import.meta.url), "utf8");
    assert.match(source, /FeedFavoriteButton author=\{(?:reply.author|displayAuthor)\}/);
    assert.match(source, /ml-1 flex h-0 w-\[66px\] shrink-0 items-center justify-start/);
  }
  const favorite = readFileSync(new URL("./feed-favorite-button.tsx", import.meta.url), "utf8");
  assert.match(favorite, /favorited \? unfavoritePsychologist : favoritePsychologist/);
  assert.match(favorite, /pending \|\| favorited\) return/);
  assert.doesNotMatch(favorite, /hideFavorited/);
});

test("author action stays beside the badge with a fixed slot and preserves name truncation", () => {
  const source = readFileSync(
    new URL("../../app/app/community/[slug]/components/feed-controls.tsx", import.meta.url),
    "utf8",
  );
  const identity = source.slice(
    source.indexOf("export const AuthorIdentityLine"),
    source.indexOf("export const FilterMenu"),
  );
  assert.match(identity, /ml-1 flex h-0 w-\[66px\] shrink-0 items-center justify-start/);
  assert.doesNotMatch(identity, /ml-auto|justify-end/);
  assert.match(identity, /truncate text-sm/);
  assert.match(identity, /community \? "min-w-\[4ch\]" : "min-w-0"/);
  assert.ok(identity.indexOf("VerifiedBadgeIcon") < identity.indexOf("{action}"));
  for (const path of [
    "./community-post-card.tsx",
    "./community-post-card-reply-preview.tsx",
    "../../app/app/community/[slug]/post/[id]/components/post-content.tsx",
    "../../app/app/community/[slug]/post/[id]/components/reply-card.tsx",
  ]) {
    const header = readFileSync(new URL(path, import.meta.url), "utf8");
    assert.match(header, /ml-1 flex h-0 w-\[66px\] shrink-0 items-center justify-start/);
    assert.doesNotMatch(header, /ml-auto flex h-0 w-\[66px\]/);
    assert.match(header, /min-w-0 flex-1 items-center gap-1/);
    assert.doesNotMatch(header, /flex h-0 shrink-0 items-center pl-1/);
  }
});

test("professional reply labels match local author metadata without uppercase or effects", () => {
  for (const [file, weight] of [
    ["../../app/app/community/[slug]/components/post-card.tsx", "font-semibold"],
    ["./community-post-card-reply-preview.tsx", "font-medium"],
  ]) {
    const source = readFileSync(new URL(file, import.meta.url), "utf8");
    const label = source.match(/<p className="([^"]+)">\s*Resposta profissional\s*<\/p>/)?.[1];
    assert.ok(label);
    assert.ok(label.includes(`text-[11px] ${weight}`));
    assert.match(label, /text-muted/);
    assert.match(label, /mb-3/);
    const metadata = source.match(/<Link\s+className="([^"]+)"[^>]*>\s*<MentorAuthorMeta/)[1];
    assert.ok(metadata.includes(`text-[11px] ${weight}`));
    assert.match(metadata, /text-muted/);
    assert.doesNotMatch(label, /uppercase|text-primary|animate-|gradient|tracking-\[/);
  }
});

test("original post identity shows a linked topic and preserves verification and favorite slot", () => {
  const community = {
    name: "Relacionamentos com propósito",
    slug: "relacionamentos",
    category: "Relacionamentos",
  };
  const html = renderToStaticMarkup(
    createElement(AuthorIdentityLine, {
      name: "Nome profissional muito longo para uma linha",
      verified: true,
      community,
      action: createElement("button", { type: "button" }, "Favoritar"),
    }),
  );
  assert.match(html, /min-w-\[4ch\]/);
  assert.match(html, /truncate text-sm/);
  assert.match(html, /aria-label="Perfil verificado"/);
  assert.match(html, /data-original-post-community/);
  assert.match(html, /href="\/comunidades\/relacionamentos"/);
  assert.match(html, /aria-label="Abrir comunidade Relacionamentos com propósito"/);
  assert.match(html, /lucide-chevron-right/);
  assert.match(html, />Relacionamentos<\/span>/);
  assert.ok(html.indexOf("Perfil verificado") < html.indexOf("Favoritar"));
  assert.ok(html.indexOf("Favoritar") < html.indexOf("data-original-post-community"));
  assert.doesNotMatch(html, /Postado em|flex-wrap/);
  const reply = renderToStaticMarkup(
    createElement(AuthorIdentityLine, { name: "Psicóloga", verified: true }),
  );
  assert.doesNotMatch(reply, /data-original-post-community|lucide-chevron-right/);
});

test("topic falls back to full community name without changing destination", () => {
  for (const category of [null, undefined, "", "  "]) {
    const community = { category, name: "Comunidade sem tema", slug: "sem-tema" };
    assert.equal(getCommunityTopicName(community), community.name);
    const html = renderToStaticMarkup(createElement(OriginalPostCommunityLink, { community }));
    assert.match(html, />Comunidade sem tema<\/span>/);
    assert.match(html, /href="\/comunidades\/sem-tema"/);
  }
  assert.equal(getCommunityTopicName({ category: "  TDAH  ", name: "Nome completo" }), "TDAH");
});

test("anonymous abbreviation is presentation-only and restricted to original anonymous posts", () => {
  const identifier = "0042";
  const shortName = `Anônimo #${identifier}`;
  const author = { name: `Membro ${shortName}`, role: "paciente" };
  assert.equal(getOriginalPostAuthorDisplayName(author, true), shortName);
  assert.equal(getOriginalPostAuthorDisplayName(author, false), author.name);
  assert.equal(getCommunityAuthorDisplayName(author), author.name);
  assert.equal(author.name, `Membro ${shortName}`);
  assert.equal(getOriginalPostAuthorDisplayName({ name: shortName }, true), shortName);
  assert.equal(
    getOriginalPostAuthorDisplayName({ name: "Maria", role: "paciente" }, true),
    "Maria",
  );
});

test("topic integration never adds a chevron to feed replies or post comments", () => {
  for (const file of [
    "./community-post-card-reply-preview.tsx",
    "../../app/app/community/[slug]/post/[id]/components/reply-card.tsx",
  ]) {
    const source = readFileSync(new URL(file, import.meta.url), "utf8");
    assert.doesNotMatch(source, /OriginalPostCommunityLink|getOriginalPostAuthorDisplayName/);
  }
  const feed = readFileSync(
    new URL("../../app/app/community/[slug]/components/post-card.tsx", import.meta.url),
    "utf8",
  );
  const reply = feed.slice(
    feed.indexOf("export const ProfessionalReplyPreview"),
    feed.indexOf("export const PostCard"),
  );
  assert.doesNotMatch(reply, /community=\{showCommunityHeader/);
  assert.match(feed, /community=\{showCommunityHeader \? post.community : undefined\}/);
  assert.doesNotMatch(feed, /Postado em/);
  const shared = readFileSync(new URL("./community-post-card.tsx", import.meta.url), "utf8");
  assert.match(
    shared,
    /showCommunityHeader &&\s*showAuthorHeader &&\s*\(\(!isReplyContribution && !primaryReply\) \|\|\s*\(profilePublicationMode && Boolean\(primaryReply\) && isPsychologistPost\)\)/,
  );
});

test("only profile publication replies replace their context line with the inline community topic", () => {
  const author = {
    id: "psi",
    name: "Professional with a long name",
    role: "psicologo",
    verified: true,
    type_label: "Psicologa",
  };
  const reply = {
    id: "reply",
    author,
    content: "Professional answer",
    created_at: "2026-10-01T12:00:00Z",
    upvotes_count: 0,
  };
  const post = {
    id: "post",
    author,
    title: "Question",
    content: "Original post",
    created_at: reply.created_at,
    contribution_type: "reply",
    highlighted_professional_reply: reply,
    upvotes_count: 0,
    community: {
      slug: "ansiedade-em-equilibrio",
      name: "Ansiedade em Equilibrio",
      category: "Ansiedade",
    },
  };
  const render = (props = {}, ids = []) =>
    renderRelations({
      userId: "viewer",
      ids,
      children: createElement(
        AppRouterContext.Provider,
        { value: {} },
        createElement(CommunityPostCard, { post, onShare() {}, showWhatsappCta: false, ...props }),
      ),
    });
  for (const ids of [[], [author.id]]) {
    const html = render({ profilePublicationMode: true }, ids);
    assert.match(html, /data-original-post-community/);
    assert.match(html, /lucide-chevron-right/);
    assert.match(html, /href="\/comunidades\/ansiedade-em-equilibrio"/);
    assert.match(html, />Ansiedade<\/span>/);
    assert.doesNotMatch(html, /Respondido em/);
    assert.match(html, /Perfil verificado/);
    assert.match(html, new RegExp(`aria-pressed="${Boolean(ids.length)}"`));
    assert.match(html, /Professional answer/);
    assert.match(
      html,
      /href="\/comunidades\/ansiedade-em-equilibrio\/publicacao\/post\/resposta\/reply"/,
    );
  }
  assert.doesNotMatch(render(), /data-original-post-community/);
  assert.match(render(), /Respondido em/);
  assert.doesNotMatch(
    render({ profilePublicationMode: true, showCommunityHeader: false }),
    /data-original-post-community|Respondido em/,
  );
  assert.doesNotMatch(
    render({
      profilePublicationMode: true,
      post: { ...post, highlighted_professional_reply: null },
    }),
    /data-original-post-community/,
  );
  assert.match(
    render({ profilePublicationMode: true, post: { ...post, contribution_type: "post" } }),
    /data-original-post-community/,
  );
});

test("follow-only feed hides followed communities without changing ordinary unfollow controls", () => {
  const render = (props) =>
    renderRelations({
      children: createElement(CommunityFollowToggle, { slug: "community", ...props }),
    });
  assert.equal(render({ initialFollowing: true, hideFollowing: true }), "");
  assert.match(render({ initialFollowing: false, hideFollowing: true }), />Seguir<\/button>/);
  assert.match(render({ initialFollowing: true }), />Seguindo<\/button>/);
});

test("community header changes Seguir into a persistent accessible circular check", () => {
  const render = (following) =>
    renderToStaticMarkup(
      createElement(CommunityHeader, {
        community: { name: "Comunidade", slug: "community", members_count: 1, posts_count: 1 },
        following,
        membershipPending: false,
        onBack() {},
        onSearch() {},
        onShare() {},
        onToggleFollow() {},
      }),
    );
  assert.match(render(false), />Seguir<\/span>/);
  assert.match(render(false), /aria-label="Seguir comunidade"/);
  assert.match(render(false), /lucide-plus[^>]*scale-100 opacity-100/);
  assert.match(render(true), /lucide-check[^>]*scale-100 opacity-100/);
  assert.match(render(true), /aria-pressed="true"/);
  assert.match(render(true), /aria-label="Seguindo comunidade. Deixar de seguir"/);
  assert.match(render(true), /w-10 gap-0 border-primary\/25 bg-primary-soft text-primary/);
  assert.match(render(true), /group-hover:opacity-100 group-focus-within:opacity-100/);
  assert.match(render(true), /w-0 opacity-0/);
  assert.match(render(true), /rounded-full/);
  assert.match(render(true), /style="font-size:13px;font-weight:600"/);
  assert.match(render(true), /Compartilhar comunidade/);
});

test("favorite IDs read every real pagination page, deduplicate and honor cancellation", async () => {
  const calls = [];
  const signal = new AbortController().signal;
  const ids = await loadFavoriteIds(async ({ page, limit }) => {
    calls.push({ page, limit });
    return {
      page,
      pages: 2,
      count: 3,
      data:
        page === 1
          ? [{ id: "a", favorited: true }]
          : [
              { id: "a", favorited: true },
              { id: "b", favorited: true },
            ],
    };
  }, signal);
  assert.deepEqual(ids, ["a", "b"]);
  assert.deepEqual(calls, [
    { page: 1, limit: 50 },
    { page: 2, limit: 50 },
  ]);
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(
    () =>
      loadFavoriteIds(() => {
        throw Error("must not request");
      }, controller.signal),
    { name: "AbortError" },
  );
  await assert.rejects(
    () =>
      loadFavoriteIds(async ({ page }) => {
        if (page === 2) throw Error("page unavailable");
        return { page, pages: 2, count: 2, data: [{ id: "a", favorited: true }] };
      }, signal),
    /page unavailable/,
  );
});

test("favorite changes use the originating account and do not manufacture a partial ID list", () => {
  const caller = readFileSync(
    new URL("../../api/callers/patient/index.tsx", import.meta.url),
    "utf8",
  );
  assert.equal(
    (caller.match(/mutationKey: keys.patient.favoriteMutation\(viewerId \?\? "guest"\)/g) ?? [])
      .length,
    2,
  );
  const client = new QueryClient();
  client.setQueryData(keys.patient.favoriteIds("a"), []);
  client.setQueryData(keys.patient.favoriteIds("b"), ["existing"]);
  updateFavoriteIds(client, "a", "psi", true);
  updateFavoriteIds(client, "a", "psi", true);
  assert.deepEqual(client.getQueryData(keys.patient.favoriteIds("a")), ["psi"]);
  assert.deepEqual(client.getQueryData(keys.patient.favoriteIds("b")), ["existing"]);
  updateFavoriteIds(client, "a", "psi", false);
  assert.deepEqual(client.getQueryData(keys.patient.favoriteIds("a")), []);
  updateFavoriteIds(client, "new", "psi", true);
  assert.equal(client.getQueryData(keys.patient.favoriteIds("new")), undefined);
  client.clear();
});
