import "../../../scripts/register-source-modules.mjs";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { registerHooks } from "node:module";
import test from "node:test";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AppRouterContext } from "next/dist/shared/lib/app-router-context.shared-runtime.js";
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
const { PostCard } = await import("../../app/app/community/[slug]/components/post-card.tsx");
const { ProgressiveConversionProvider } = await import(
  "../conversion/progressive-conversion-provider.tsx"
);
const { store } = await import("../../store/index.ts");

test("feed coloca controles apos a midia somente em posts de psicologos com anexos", () => {
  const client = new QueryClient();
  const router = { push() {}, replace() {}, prefetch() {} };
  const renderPost = (role, media, options = {}) =>
    renderToStaticMarkup(
      createElement(
        AppRouterContext.Provider,
        { value: router },
        createElement(
          Provider,
          { store },
          createElement(
            QueryClientProvider,
            { client },
            createElement(
              ProgressiveConversionProvider,
              { isAuthenticated: false, pathname: "/" },
              createElement(PostCard, {
                onShare() {},
                ...options,
                post: {
                  id: "post-order-test",
                  title: "Post com midia",
                  content: "Texto da publicacao",
                  created_at: "2026-10-07T12:00:00Z",
                  author: {
                    id: "author-test",
                    role,
                    name: "Autor",
                    type_label: role === "psicologo" ? "Psicologo" : "Usuario",
                  },
                  community: { id: "community-test", slug: "ansiedade", name: "Ansiedade" },
                  upvotes_count: 1,
                  downvotes_count: 0,
                  replies_count: 0,
                  saves_count: 0,
                  saved: false,
                  current_user_vote: null,
                  ...media,
                },
              }),
            ),
          ),
        ),
      ),
    );
  try {
    for (const role of ["psicologo", "paciente"]) {
      for (const media of [
        { media_type: "video", media_url: "/public/files/order.mp4" },
        { media_type: "image", media_url: "/public/files/order.jpg" },
        { media_items: [{ id: "one", media_type: "image", media_url: "/public/files/one.jpg" }] },
        {
          media_items: [
            { id: "one", media_type: "image", media_url: "/public/files/one.jpg" },
            { id: "two", media_type: "image", media_url: "/public/files/two.jpg" },
          ],
        },
      ]) {
        const html = renderPost(role, media);
        const mediaIndex = html.indexOf('<div class="mt-4 grid gap-3">');
        const actionsIndex = html.indexOf('aria-label="Salvar post"');
        assert.ok(mediaIndex >= 0 && actionsIndex >= 0);
        assert.equal(mediaIndex < actionsIndex, role === "psicologo");
        assert.equal((html.match(/aria-label="Salvar post"/g) ?? []).length, 1);
        assert.match(html, /Comentar no post/);
        assert.match(html, /Compartilhar post: Post com midia/);
      }
      const noMedia = renderPost(role, {});
      assert.ok(
        noMedia.indexOf('aria-label="Salvar post"') <
          noMedia.indexOf('<div class="mt-4 grid gap-3">'),
      );
    }
    const saved = renderPost(
      "paciente",
      {
        highlighted_professional_reply: {
          id: "reply-order-test",
          content: "Resposta em video",
          created_at: "2026-10-07T13:00:00Z",
          media_type: "video",
          media_url: "/public/files/reply.mp4",
          author: { id: "professional-test", name: "Profissional", role: "psicologo" },
        },
      },
      { saveActionOverride: { active: true, disabled: true, label: "Remover dos salvos" } },
    );
    assert.ok(
      saved.indexOf('aria-label="Remover dos salvos"') < saved.indexOf("Resposta profissional"),
    );
    assert.ok(saved.indexOf("Resposta profissional") < saved.indexOf("data-feed-reply-author"));
    assert.doesNotMatch(saved, /border-t(?:\s|")/);
    assert.match(
      saved,
      /disabled=""[^>]*aria-label="Remover dos salvos"|aria-label="Remover dos salvos"[^>]*disabled=""/,
    );
  } finally {
    client.clear();
  }
});

test("Salvos usa o card real do feed e preserva a remocao pela lista", () => {
  const source = readFileSync(
    new URL("../../app/app/posts/saved/logic.tsx", import.meta.url),
    "utf8",
  );
  assert.match(
    source,
    /import \{ PostCard \} from "@\/app\/app\/community\/\[slug\]\/components\/post-card"/,
  );
  assert.match(source, /<PostCard/);
  assert.doesNotMatch(source, /CommunityPostCard|presentation="feed"/);
  assert.match(source, /saveActionOverride=\{/);
  assert.match(source, /disabled: unsavePostMutation.isPending/);
  assert.match(source, /onClick: \(\) => unsavePostMutation.mutate\(item.post.id\)/);
});

test("respostas salvas usam identidade do feed sem faixa Respondido em ou divisorias", () => {
  const source = readFileSync(
    new URL("../../app/app/posts/saved/components/saved-reply-card.tsx", import.meta.url),
    "utf8",
  );
  assert.match(source, /<SavedReplyAuthorAvatar/);
  assert.match(source, /<OriginalPostCommunityLink/);
  assert.match(source, /community=\{community\}/);
  assert.match(source, /<FeedFavoriteButton author=\{author\}/);
  assert.doesNotMatch(source, /Resposta profissional/);
  assert.doesNotMatch(source, /Respondido em|border-t|h-px w-full/);
  assert.match(source, /enableFeedAutoplay/);
  assert.match(source, /onRemove\(item.post.id, reply.id\)/);
  assert.match(source, /onShare\(item.post, reply.id\)/);
  assert.match(source, /href: replyLink/);
  assert.doesNotMatch(source, /count: reply.saves_count/);
});
