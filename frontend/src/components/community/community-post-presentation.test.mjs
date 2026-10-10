import "../../../scripts/register-source-modules.mjs";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { registerHooks } from "node:module";
import test from "node:test";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AppRouterContext } from "next/dist/shared/lib/app-router-context.shared-runtime.js";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Controller, useForm } from "react-hook-form";
import { Provider } from "react-redux";

const readSource = (path) => readFileSync(new URL(path, import.meta.url), "utf8");

const { AnonymousPostSwitch } = await import(
  "../../app/app/community/[slug]/post/new/views/anonymous-post-switch.tsx"
);
const { createCommunityPostSchema, toCreateCommunityPostPayload } = await import(
  "../../app/app/community/[slug]/post/new/use-form.tsx"
);
const {
  CREATE_POST_PROFILE_DRAFT_KEY,
  CREATE_POST_PROFILE_DRAFT_MAX_AGE_MS,
  CREATE_POST_PROFILE_UPDATED_KEY,
  clearCreatePostProfileDraft,
  consumeCreatePostProfileUpdated,
  readCreatePostProfileDraft,
  resolveCreatePostProfileReturnHref,
  saveCreatePostProfileDraft,
  saveCreatePostProfileUpdated,
} = await import("../../app/app/community/[slug]/post/new/modules/create-post-support.ts");
const { getReplyOwnerActionCopy } = await import("./reply-owner-action-copy.ts");
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
const { MoreProfessionalReplies } = await import("./more-professional-replies.tsx");
const { CommunityActionBar } = await import("./community-action-bar.tsx");
const { PostCard } = await import("../../app/app/community/[slug]/components/post-card.tsx");
const { ProgressiveConversionProvider } = await import(
  "../conversion/progressive-conversion-provider.tsx"
);
const { store } = await import("../../store/index.ts");

test("feed coloca controles apos a midia somente em posts de psicologos com anexos", () => {
  const client = new QueryClient();
  const router = { push() {}, replace() {}, prefetch() {} };
  const renderPost = (role, media) =>
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
  } finally {
    client.clear();
  }
});

test("feed hides saved count and decorative post icon, keeping favorite but no follow control", () => {
  const source = readFileSync(
    new URL("../../app/app/community/[slug]/components/post-card.tsx", import.meta.url),
    "utf8",
  );
  assert.doesNotMatch(source, /FileText|count: saveSnapshot.saves/);
  assert.doesNotMatch(source, /CommunityFollowToggle|CommunityFollowButton/);
  assert.match(source, /FeedFavoriteButton author=\{reply.author\}/);
  assert.match(source, /isPsychologistPost \? <FeedFavoriteButton author=\{post.author\}/);
  const html = renderToStaticMarkup(
    createElement(CommunityActionBar, {
      upvotesCount: 1,
      save: { label: "Salvar post", active: false, onClick: () => {} },
    }),
  );
  assert.match(html, /aria-label="Salvar post"/);
  assert.doesNotMatch(html, />0</);
});

test("post detail matches feed vertical spacing and keeps saving without a counter", () => {
  const source = readFileSync(
    new URL(
      "../../app/app/community/[slug]/post/[id]/components/post-content.tsx",
      import.meta.url,
    ),
    "utf8",
  );
  const header = source.split("export const PostHeader")[1].split("export const PostBody")[0];
  const body = source
    .split("export const PostBody")[1]
    .split("export const ThreadOriginalPostCard")[0];
  const actions = source.split("export const PostVoteBar")[1];
  assert.match(header, /<header className="grid gap-3 px-5 pt-4 pb-0">/);
  assert.doesNotMatch(header, /Postado em|h-px w-full bg-surface-muted/);
  assert.match(header, /OriginalPostCommunityLink\s+community=\{post.community\}/);
  assert.match(body, /grid gap-2 px-5 pt-3 pb-4/);
  assert.doesNotMatch(actions, /count: post.saves_count/);
  assert.match(actions, /active: post.saved/);
  assert.match(actions, /onClick: onToggleSave/);
});

test("post surfaces preserve community navigation without follow actions", () => {
  for (const file of [
    "../../app/app/community/[slug]/components/post-card.tsx",
    "../../app/app/community/[slug]/post/[id]/components/post-content.tsx",
    "./community-post-card.tsx",
  ]) {
    const source = readFileSync(new URL(file, import.meta.url), "utf8");
    assert.doesNotMatch(source, /CommunityFollowToggle|CommunityFollowButton/);
    assert.match(
      source,
      /community=\{(?:post.community|showCommunityHeader \? post.community : undefined)\}/,
    );
    assert.match(source, /FeedFavoriteButton/);
  }
});

test("vote cluster has no independent fill and keeps selection feedback", () => {
  for (const size of ["xs", "sm", "md"]) {
    for (const currentVote of [null, 1, -1]) {
      const html = renderToStaticMarkup(
        createElement(CommunityActionBar, { size, currentVote, upvotesCount: 0, onVote: () => {} }),
      );
      assert.match(html, /border-border bg-transparent p-px dark:border-border/);
      assert.doesNotMatch(html, /dark:bg-surface/);
      if (currentVote === 1) assert.match(html, /bg-success\/10/);
      if (currentVote === -1) assert.match(html, /bg-danger\/10/);
    }
  }
});

test("more replies stays hidden without another professional response, regardless of patient comment count", () => {
  const post = {
    author: { role: "paciente" },
    highlighted_professional_reply: { id: "highlight" },
    replies_count: 50,
  };
  for (const authors of [undefined, []]) {
    assert.equal(
      renderToStaticMarkup(
        createElement(MoreProfessionalReplies, {
          href: "/app/posts/post",
          post: { ...post, other_professional_reply_authors: authors },
        }),
      ),
      "",
    );
  }
});

test("more replies renders up to two distinct authors followed by a black plus circle", () => {
  const author = (id) => ({ id, name: `Psi ${id}`, avatar: null });
  const post = {
    author: { role: "paciente" },
    highlighted_professional_reply: { id: "highlight" },
    other_professional_reply_authors: [
      author("1"),
      author("1"),
      author("2"),
      author("3"),
      author("4"),
    ],
  };
  const html = renderToStaticMarkup(
    createElement(MoreProfessionalReplies, { href: "/app/posts/post", post }),
  );
  assert.equal((html.match(/<a /g) ?? []).length, 1);
  assert.equal((html.match(/h-7 w-7/g) ?? []).length, 3);
  assert.match(html, /href="\/app\/posts\/post"/);
  assert.match(html, /Ver mais respostas/);
  assert.match(html, /text-muted/);
  assert.match(html, /font-\[family-name:system-ui,sans-serif\].*font-semibold/);
  assert.match(html, /bg-media-background text-media-foreground/);
  assert.match(html, /lucide-plus/);
  assert.equal((html.match(/text-\[10px\]/g) ?? []).length, 2);
  assert.ok(html.indexOf("lucide-plus") > html.lastIndexOf("text-[10px]"));
  assert.doesNotMatch(html, /text-primary(?:\s|")|border-t/);
  assert.equal(
    renderToStaticMarkup(
      createElement(MoreProfessionalReplies, {
        href: "/post",
        post: { ...post, highlighted_professional_reply: null },
      }),
    ),
    "",
  );
  assert.equal(
    renderToStaticMarkup(
      createElement(MoreProfessionalReplies, {
        href: "/post",
        post: { ...post, author: { role: "psicologo" } },
      }),
    ),
    "",
  );
});

test("a single other professional shows one real avatar and plus, without duplication", () => {
  const html = renderToStaticMarkup(
    createElement(MoreProfessionalReplies, {
      href: "/post",
      post: {
        author: { role: "paciente" },
        highlighted_professional_reply: { id: "highlight" },
        other_professional_reply_authors: [{ id: "one", name: "Ana Lima", avatar: null }],
      },
    }),
  );
  assert.equal((html.match(/h-7 w-7/g) ?? []).length, 2);
  assert.equal((html.match(/lucide-plus/g) ?? []).length, 1);
  assert.match(html, /AL/);
});

test("feed keeps one action bar and its handlers, changing media order only for psychologist posts", () => {
  const source = readFileSync(
    new URL("../../app/app/community/[slug]/components/post-card.tsx", import.meta.url),
    "utf8",
  );
  const card = source.slice(source.indexOf("export const PostCard ="));
  const description = card.indexOf("<InlineExpandableText");
  const actions = card.indexOf("<CommunityActionBar");
  const media = card.indexOf("<PostMedia");
  const reply = card.indexOf("<ProfessionalReplyPreview");
  const moreReplies = card.indexOf("<MoreProfessionalReplies");
  assert.ok(description >= 0 && description < actions && media < reply);
  assert.match(card, /mediaBeforeActions = isPsychologistPost && hasPostMedia/);
  assert.ok(card.indexOf("{mediaBeforeActions ? mediaContent : null}") < actions);
  assert.ok(card.indexOf("{mediaBeforeActions ? null : mediaContent}") > actions);
  assert.ok(moreReplies > reply);
  assert.match(card.slice(moreReplies), /href=\{postDetailHref\} post=\{post\}/);
  assert.equal(card.match(/<CommunityActionBar\b/g)?.length, 1);
  const bar = card.slice(actions, card.indexOf("{mediaBeforeActions ? null : mediaContent}"));
  assert.match(bar, /className="mt-4 /);
  assert.doesNotMatch(bar, /border-t|pt-3/);
  assert.match(bar, /max-\[380px\]:flex-wrap/);
  assert.match(bar, /count: post.replies_count/);
  assert.match(bar, /href: postDetailHref/);
  assert.match(bar, /onVote=\{handleVote\}/);
  assert.match(bar, /onClick: handleToggleSave/);
  assert.match(bar, /onClick: \(\) => onShare\(post\)/);
});

test("professional reply removes indentation, labels the author and preserves video behavior", () => {
  const source = readFileSync(
    new URL("../../app/app/community/[slug]/components/post-card.tsx", import.meta.url),
    "utf8",
  );
  const preview = source.slice(
    source.indexOf("export const ProfessionalReplyPreview"),
    source.indexOf("export const PostCard ="),
  );
  assert.match(
    preview,
    /-mx-2.*rounded-2xl bg-surface-muted px-2 py-3 ring-1 ring-border ring-inset/,
  );
  assert.doesNotMatch(preview, /-mx-4/);
  assert.match(preview, /absolute inset-0 z-0 cursor-pointer rounded-2xl/);
  assert.match(preview, /font-semibold tracking-normal text-muted">\s*Resposta profissional/);
  assert.ok(preview.indexOf("Resposta profissional") < preview.indexOf("<AuthorAvatar"));
  assert.match(preview, /gap-3" data-feed-reply-author/);
  assert.doesNotMatch(preview, /grid-cols-\[18px|size="lg"|data-feed-thread/);
  assert.match(preview, /enableFeedAutoplay=\{enableFeedAutoplay\}/);
  const media = source.slice(
    source.indexOf("export const ProfessionalReplyMedia"),
    source.indexOf("export const ProfessionalReplyPreview"),
  );
  assert.match(media, /md:max-w-\[300px\]/);
  assert.match(media, /variant="reply"/);
});

// Real component, RHF/schema and handlers. SSR does not execute browser Tab/Space/Enter
// or reproduce the mobile keyboard. Handler inputs below only classify click.detail.
const control = (props = {}) =>
  AnonymousPostSwitch({
    checked: false,
    onBlur: () => {},
    onChange: () => {},
    restoreEditorFocus: () => {},
    ...props,
  });

function AnonymousField({ value }) {
  const { control } = useForm({ defaultValues: { anonymous: value } });
  return createElement(Controller, {
    control,
    name: "anonymous",
    render: ({ field }) =>
      createElement(AnonymousPostSwitch, {
        checked: Boolean(field.value),
        onBlur: field.onBlur,
        onChange: field.onChange,
        restoreEditorFocus: () => {},
      }),
  });
}

test("anonimato usa button na sequência nativa, sem interceptar Space/Enter nem submeter", () => {
  const element = control();
  assert.equal(element.type, "button");
  assert.equal(element.props.type, "button");
  assert.ok(element.props.tabIndex === undefined || element.props.tabIndex === 0);
  assert.equal(element.props.disabled, undefined);
  assert.equal(element.props.onKeyDown, undefined);
  assert.equal(element.props.onKeyUp, undefined);
  const html = renderToStaticMarkup(element);
  assert.doesNotMatch(html, /tabindex="-1"|disabled=""/);
});

for (const value of [false, true]) {
  test(`RHF/SSR reais mantêm anonymous=${value}, nome e tokens do switch`, () => {
    const html = renderToStaticMarkup(createElement(AnonymousField, { value }));
    assert.match(html, new RegExp(`aria-checked="${value}"`));
    assert.match(html, /aria-label="Publicar anonimamente"/);
    assert.match(html, /role="switch"/);
    assert.match(html, /focus:ring-4 focus:ring-primary\/15/);
    assert.equal(html.includes("translate-x-5"), value);
  });

  test(`click sem ponteiro alterna ${value} sem solicitar foco no editor`, () => {
    const calls = [];
    const element = control({
      checked: value,
      onChange: (next) => calls.push(["change", next]),
      restoreEditorFocus: () => calls.push(["editor"]),
    });
    element.props.onClick({ detail: 0 });
    assert.deepEqual(calls, [["change", !value]]);
  });
}

test("click de ponteiro preserva alternância única seguida do retorno ao editor", () => {
  for (const detail of [1, 2]) {
    for (const checked of [false, true]) {
      const calls = [];
      control({
        checked,
        onChange: (next) => calls.push(["change", next]),
        restoreEditorFocus: () => calls.push(["editor"]),
      }).props.onClick({ detail });
      assert.deepEqual(calls, [["change", !checked], ["editor"]]);
    }
  }
});

test("mousedown preserva prevenção de blur do editor e não alterna duas vezes", () => {
  const calls = [];
  const element = control({
    onChange: () => calls.push("change"),
    restoreEditorFocus: () => calls.push("editor"),
  });
  const event = new Event("mousedown", { cancelable: true });
  element.props.onMouseDown(event);
  assert.equal(event.defaultPrevented, true);
  assert.deepEqual(calls, []);
});

test("onBlur é delegado intacto para o Controller, sem agendar foco", () => {
  let blurs = 0;
  const onBlur = () => blurs++;
  const element = control({ onBlur });
  assert.equal(element.props.onBlur, onBlur);
  element.props.onBlur();
  assert.equal(blurs, 1);
});

test("dica de anonimato usa texto compacto, fundo azul e edicao de perfil sem perder o rascunho", () => {
  const support = readFileSync(
    new URL(
      "../../app/app/community/[slug]/post/new/modules/create-post-support.ts",
      import.meta.url,
    ),
    "utf8",
  );
  const view = readFileSync(
    new URL(
      "../../app/app/community/[slug]/post/new/views/create-community-post.tsx",
      import.meta.url,
    ),
    "utf8",
  );
  const controller = readFileSync(
    new URL(
      "../../app/app/community/[slug]/post/new/hooks/use-create-community-post-controller.ts",
      import.meta.url,
    ),
    "utf8",
  );
  const profileReturnHook = readSource(
    "../../app/app/community/[slug]/post/new/hooks/use-create-post-profile-return.ts",
  );
  const profileUpdateConfirmation = readSource(
    "../../app/app/community/[slug]/post/new/views/profile-update-confirmation.tsx",
  );
  const profileEdit = readFileSync(
    new URL("../../app/app/profile/edit/logic.tsx", import.meta.url),
    "utf8",
  );

  assert.match(
    support,
    /Publicar com seu nome ajuda a tornar as conversas mais pessoais e acolhedoras\.\\nPara preservar sua privacidade, você pode utilizar apenas seu primeiro nome ou um apelido\./,
  );
  assert.doesNotMatch(support, /você também pode utilizar no perfil/);
  assert.match(view, /border-primary\/20 bg-primary-soft/);
  assert.match(view, /href=\{profileEditHref\}/);
  assert.match(view, /onClick=\{preserveDraftForProfileEdit\}/);
  assert.match(view, /className="whitespace-pre-line">\{anonymousTipText\}<\/p>/);
  assert.doesNotMatch(view, /target="_blank"|rel="noopener noreferrer"/);
  assert.match(view, />\s*Editar nome no perfil\s*<\/Link>/);
  assert.match(profileReturnHook, /saveCreatePostProfileDraft/);
  assert.match(profileReturnHook, /consumeCreatePostProfileUpdated/);
  assert.match(profileReturnHook, /resolveCreatePostProfileReturnHref/);
  assert.match(controller, /clearCreatePostProfileDraft\(window\.sessionStorage\)/);
  assert.match(profileEdit, /normalizeSafeInternalRedirect\(searchParams\.get\("returnTo"\)/);
  assert.match(profileEdit, /backHref=\{returnTo \|\| "\/app\/perfil"\}/);
  assert.match(profileEdit, /router\.replace\(returnTo \|\| "\/app\/perfil"\)/);
  assert.match(profileEdit, /saveCreatePostProfileUpdated/);
  assert.match(profileUpdateConfirmation, />\s*Nome atualizado\s*<\/h2>/);
  assert.match(profileUpdateConfirmation, /Sua publica.*identificada como/);
  assert.match(profileUpdateConfirmation, />\s*Continuar para o post\s*<\/Button>/);
  assert.doesNotMatch(profileUpdateConfirmation, /Editar novamente/);
  assert.match(profileEdit, /sticky bottom-4 z-10/);
  assert.match(profileEdit, /absolute top-\[calc\(100%\+0\.5rem\)\] right-0 z-30 w-44/);
  assert.doesNotMatch(profileEdit, /fixed inset-x-4 bottom-\[calc\(env\(safe-area-inset-bottom\)/);
});

test("confirmacao do nome atualizado aparece uma vez e apenas no retorno ao compositor", () => {
  const entries = new Map();
  const storage = {
    getItem: (key) => entries.get(key) ?? null,
    removeItem: (key) => entries.delete(key),
    setItem: (key, value) => entries.set(key, value),
  };

  assert.equal(
    saveCreatePostProfileUpdated({
      displayName: "Tulio",
      returnHref: "/app/perfil",
      storage,
      userId: "patient-1",
    }),
    false,
  );
  assert.equal(entries.has(CREATE_POST_PROFILE_UPDATED_KEY), false);

  assert.equal(
    saveCreatePostProfileUpdated({
      displayName: "  Tulio  ",
      returnHref: "/app/comunidades/feed/publicacao/nova",
      storage,
      userId: "patient-1",
    }),
    true,
  );
  assert.equal(
    consumeCreatePostProfileUpdated({
      returnHref: "/app/comunidades/feed/publicacao/nova",
      storage,
      userId: "patient-1",
    }),
    "Tulio",
  );
  assert.equal(entries.has(CREATE_POST_PROFILE_UPDATED_KEY), false);
  assert.equal(
    consumeCreatePostProfileUpdated({
      returnHref: "/app/comunidades/feed/publicacao/nova",
      storage,
      userId: "patient-1",
    }),
    null,
  );
});

test("retorno da edicao de nome sempre aponta para o compositor aberto", () => {
  assert.equal(
    resolveCreatePostProfileReturnHref({
      currentHref: "/",
      routeSlug: "feed",
    }),
    "/app/comunidades/feed/publicacao/nova",
  );
  assert.equal(
    resolveCreatePostProfileReturnHref({
      communitySlugFromQuery: "ansiedade-em-equilibrio",
      currentHref: "/?community=ansiedade-em-equilibrio",
      routeSlug: "feed",
    }),
    "/app/comunidades/feed/publicacao/nova?community=ansiedade-em-equilibrio",
  );
  assert.equal(
    resolveCreatePostProfileReturnHref({
      currentHref: "/comunidades/relacionamentos-com-proposito",
      routeSlug: "relacionamentos-com-proposito",
    }),
    "/app/comunidades/relacionamentos-com-proposito/publicacao/nova",
  );
  assert.equal(
    resolveCreatePostProfileReturnHref({
      currentHref: "/app/comunidades/feed/publicacao/nova?community=depressao",
      routeSlug: "feed",
    }),
    "/app/comunidades/feed/publicacao/nova?community=depressao",
  );
});

test("rascunho da ida ao perfil restaura texto identificado e respeita usuario, rota e validade", () => {
  const values = {
    anonymous: true,
    community_slug: "ansiedade",
    content: "Texto que deve continuar na modal.",
    title: "Uma pergunta importante",
  };
  const entries = new Map();
  const storage = {
    getItem: (key) => entries.get(key) ?? null,
    removeItem: (key) => entries.delete(key),
    setItem: (key, value) => entries.set(key, value),
  };

  saveCreatePostProfileDraft({
    returnHref: "/app/community/feed/post/new",
    storage,
    userId: "patient-1",
    values,
  });

  assert.deepEqual(
    readCreatePostProfileDraft({
      returnHref: "/app/community/feed/post/new",
      storage,
      userId: "patient-1",
    }),
    { ...values, anonymous: false },
  );

  const savedDraft = JSON.parse(entries.get(CREATE_POST_PROFILE_DRAFT_KEY));
  assert.equal("anonymous" in savedDraft.values, false);
  assert.equal(
    readCreatePostProfileDraft({
      returnHref: "/app/community/outra/post/new",
      storage,
      userId: "patient-1",
    }),
    null,
  );
  assert.equal(entries.has(CREATE_POST_PROFILE_DRAFT_KEY), false);

  entries.set(CREATE_POST_PROFILE_DRAFT_KEY, JSON.stringify({ ...savedDraft, savedAt: 0 }));
  assert.equal(
    readCreatePostProfileDraft({
      now: CREATE_POST_PROFILE_DRAFT_MAX_AGE_MS + 1,
      returnHref: savedDraft.returnHref,
      storage,
      userId: savedDraft.userId,
    }),
    null,
  );

  clearCreatePostProfileDraft(storage);
  assert.equal(entries.size, 0);
});

test("schema/payload reais preservam anonimato opcional do paciente e vedação ao psicólogo", () => {
  for (const anonymous of [undefined, false, true]) {
    const values = createCommunityPostSchema.parse({
      community_slug: "comunidade-local",
      title: "  Uma pergunta  ",
      content: "  Conteúdo textual para validação local.  ",
      anonymous,
    });
    assert.deepEqual(toCreateCommunityPostPayload(values, false), {
      title: "Uma pergunta",
      content: "Conteúdo textual para validação local.",
      anonymous: anonymous === true,
    });
    assert.equal(toCreateCommunityPostPayload(values, true).anonymous, false);
  }
});

const replyCopy = (props = {}) =>
  getReplyOwnerActionCopy({ kind: "resposta", isPsychologist: false, hasReplies: false, ...props });

test("copy de resposta profissional concorda artigo, pronome e remoção", () => {
  const copy = replyCopy({ isPsychologist: true });
  assert.equal(copy.deleteTitle, "Excluir resposta?");
  assert.equal(
    copy.deleteDescription,
    "Esta resposta e as respostas encadeadas abaixo dela serão removidas.\n\nEsta ação não poderá ser desfeita.",
  );
});

test("copy de resposta de paciente com descendentes mantém aviso e pronome feminino", () => {
  assert.equal(
    replyCopy({ hasReplies: true }).deleteDescription,
    "Esta resposta já possui respostas de outros membros.\n\nAo excluir, as respostas encadeadas abaixo dela também serão removidas.\n\nEsta ação não poderá ser desfeita.",
  );
});

test("bloqueio e preservação usam resposta no feminino, sem mudar a restrição", () => {
  const copy = replyCopy();
  assert.equal(copy.blockedTitle, "Não é possível excluir esta resposta");
  assert.equal(copy.preservedTitle, "Resposta preservada");
  assert.match(copy.blockedDescription, /^Esta resposta já recebeu contribuições/);
  assert.match(copy.blockedDescription, /não podem ser excluídos por pacientes/);
  assert.match(copy.blockedDescription, /Você pode silenciar a conversa/);
});

test("comentário preserva concordância masculina e avisos de descendentes", () => {
  const professional = replyCopy({ kind: "comentário", isPsychologist: true });
  assert.equal(professional.deleteTitle, "Excluir comentário?");
  assert.equal(professional.blockedTitle, "Não é possível excluir este comentário");
  assert.equal(professional.preservedTitle, "Comentário preservado");
  assert.match(professional.blockedDescription, /^Este comentário já recebeu/);
  assert.match(professional.deleteDescription, /^Este comentário e as respostas/);
  assert.match(professional.deleteDescription, /abaixo dele serão removidos/);
  const patient = replyCopy({ kind: "comentário", hasReplies: true });
  assert.match(patient.deleteDescription, /^Este comentário já possui respostas/);
  assert.match(patient.deleteDescription, /abaixo dele também serão removidas/);
});

test("folha de paciente sem descendentes conserva somente aviso irreversível", () => {
  for (const kind of ["resposta", "comentário"]) {
    assert.equal(replyCopy({ kind }).deleteDescription, "Esta ação não poderá ser desfeita.");
  }
});
