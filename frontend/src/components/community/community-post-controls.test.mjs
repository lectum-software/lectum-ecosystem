import "../../../scripts/register-source-modules.mjs";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { registerHooks } from "node:module";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Controller, useForm } from "react-hook-form";

const { AnonymousPostSwitch } = await import(
  "../../app/app/community/[slug]/post/new/views/anonymous-post-switch.tsx"
);
const { createCommunityPostSchema, toCreateCommunityPostPayload } = await import(
  "../../app/app/community/[slug]/post/new/use-form.tsx"
);
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
        : specifier === "next/link"
          ? "next/link.js"
          : specifier;
    return nextResolve(target, context);
  },
});
const { MoreProfessionalReplies } = await import("./more-professional-replies.tsx");
const { CommunityActionBar } = await import("./community-action-bar.tsx");

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

test("feed keeps one post action bar after description and before media/reply, without a divider", () => {
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
  assert.ok(description >= 0 && description < actions && actions < media && media < reply);
  assert.ok(moreReplies > reply);
  assert.match(card.slice(moreReplies), /href=\{postDetailHref\} post=\{post\}/);
  assert.equal(card.match(/<CommunityActionBar\b/g)?.length, 1);
  const bar = card.slice(actions, media);
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
  assert.match(preview, /text-primary[\s\S]*RESPOSTA PROFISSIONAL/);
  assert.ok(preview.indexOf("RESPOSTA PROFISSIONAL") < preview.indexOf("<AuthorAvatar"));
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
