import "../../../scripts/register-source-modules.mjs";
import "./testimonial-sheet-close.test.mjs";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createServer } from "node:http";
import { registerHooks } from "node:module";
import test from "node:test";
import { runInNewContext } from "node:vm";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";

const imageUrl = import.meta.resolve("next/image.js");
const imageBridge = `data:text/javascript,${encodeURIComponent(`import Image from ${JSON.stringify(imageUrl)}; export default Image.default ?? Image;`)}`;
const linkUrl = import.meta.resolve("next/link.js");
const linkBridge = `data:text/javascript,${encodeURIComponent(`import Link from ${JSON.stringify(linkUrl)}; export default Link.default ?? Link;`)}`;
registerHooks({
  resolve(specifier, context, nextResolve) {
    return nextResolve(
      specifier === "next/image" ? imageBridge : specifier === "next/link" ? linkBridge : specifier,
      context,
    );
  },
});

const { TestimonialCard } = await import("./testimonial-card.tsx");
const { ReviewsIcon } = await import("../ui/reviews-icon.tsx");
const { TestimonialForm } = await import("./testimonial-form.tsx");
const { TestimonialProfessionalIdentity } = await import("./testimonial-professional.tsx");
const { reviewFormSchema } = await import("../../app/app/reviews/new/use-form.tsx");
const base = {
  id: "testimonial-local",
  rating: 4,
  comment: "Senti respeito e acolhimento.",
  response: null,
  created_at: "2026-10-29T12:00:00Z",
  author: { name: "Ana P.", initials: "AP" },
};

test("perfil vazio convida em um unico bloco e nao confunde loading ou erro com ausencia", async () => {
  const { PublicTestimonials } = await import("./public-testimonials.tsx");
  const { renderRelations } = await import("../community/community-relations-test-renderer.mjs");
  const render = (options = {}) =>
    renderRelations({
      children: createElement(PublicTestimonials, {
        profileId: "local-professional",
        reviews: [],
        summary: { rating_count: 0 },
        professional: { id: "local-professional", name: "Ana", verified: true },
        ...options,
      }),
    });
  const empty = render();
  assert.match(empty, /data-testimonial-empty/);
  assert.match(empty, /bg-surface/);
  assert.match(empty, /Seja a primeira pessoa/);
  assert.equal((empty.match(/aria-label="Deixar depoimento"/g) ?? []).length, 1);
  assert.doesNotMatch(render({ isLoading: true }), /data-testimonial-empty/);
  assert.doesNotMatch(render({ isError: true }), /data-testimonial-empty/);
  assert.doesNotMatch(render({ readOnly: true }), /aria-label="Deixar depoimento"|Seja a primeira/);
  const populated = render({ reviews: [base], summary: { rating_count: 1 } });
  assert.doesNotMatch(populated, /data-testimonial-empty/);
  assert.equal((populated.match(/aria-label="Deixar depoimento"/g) ?? []).length, 1);
});

test("icone de depoimentos usa balao circular e estrela preenchida com a cor herdada", () => {
  const html = renderToStaticMarkup(
    createElement(ReviewsIcon, {
      className: "size-5",
      "aria-hidden": true,
      style: { width: 28, height: 28 },
    }),
  );
  assert.match(html, /lucide-message-circle/);
  assert.match(html, /lucide-star/);
  assert.match(html, /fill="none"/);
  assert.match(html, /fill="currentColor"/);
  assert.match(html, /stroke="currentColor"/);
  assert.match(html, /width:28px;height:28px/);
  assert.doesNotMatch(html, /M9\.08,14\.25/);
});

test("acoes da resposta ficam no header lateral, antes do texto", () => {
  const html = renderToStaticMarkup(
    createElement(TestimonialCard, {
      review: { ...base, response: "Resposta preservada" },
      responseActions: createElement(
        "button",
        { type: "button", "data-test-response-action": true },
        "Editar resposta",
      ),
    }),
  );
  const header = html.indexOf("data-testimonial-response-header");
  const action = html.indexOf("data-test-response-action");
  const body = html.indexOf("Resposta preservada");
  assert.ok(header > 0 && action > header && action < body);
  assert.match(html, /flex items-start justify-between gap-2/);
  assert.match(html, /data-testimonial-stem/);
  assert.match(html, /data-testimonial-curve/);
});

test("perfil aceita a URL de depoimentos e preserva links antigos", async () => {
  const { normalizeTab } = await import("../../app/app/psychologist/[id]/modules/support.ts");
  assert.equal(normalizeTab("depoimentos"), "avaliacoes");
  assert.equal(normalizeTab("avaliacoes"), "avaliacoes");
  assert.equal(normalizeTab("publicacoes"), "publicacoes");
  const profile = readFileSync(
    new URL("../../app/app/psychologist/[id]/psychologist-profile.tsx", import.meta.url),
    "utf8",
  );
  assert.ok(profile.includes('tab === "avaliacoes" ? "depoimentos" : tab'));
  assert.ok(profile.includes('next.set("tab", "depoimentos")'));
});

test("convite do perfil usa azul compacto e o da modal cinza transparente sem mudar inline", () => {
  const source = readFileSync(new URL("./public-testimonials.tsx", import.meta.url), "utf8");
  assert.doesNotMatch(source, /variant="default"|font-extrabold tabular-nums text-primary/);
  assert.match(source, /appearance="profile"/);
  const action = readFileSync(
    new URL("./testimonial-invitation-action.tsx", import.meta.url),
    "utf8",
  );
  assert.match(action, /variant = "outline"/);
  assert.match(action, /min-h-\[44px\] min-w-\[44px\]/);
  assert.doesNotMatch(action, /min-[hw]-11/);
  assert.match(action, /bg-transparent/);
  assert.match(action, /border border-border bg-transparent px-4 text-muted/);
  assert.match(action, /h-11 border-0 bg-transparent px-2.5 text-xs text-primary-foreground/);
  assert.match(action, /before:inset-y-\[6px\]/);
  assert.match(action, /before:bg-primary/);
  assert.match(action, /text-sm font-semibold leading-5/);
  assert.doesNotMatch(action, /border-foreground/);
  assert.match(action, /size-4 shrink-0/);
  assert.match(action, /inline && "max-sm:sr-only"/);
  assert.doesNotMatch(action, /max-width:360px/);
  assert.match(action, /aria-label="Deixar depoimento"/);
  assert.match(action, /title="Deixar depoimento"/);
  assert.match(action, /user\?\.role !== "paciente" \|\| !eligibility.data\?\.eligible/);
});

test("modal de depoimentos sobe e respeita movimento reduzido", () => {
  const css = readFileSync(new URL("../../app/globals.css", import.meta.url), "utf8");
  assert.match(css, /translateY\(100%\)/);
  assert.match(css, /translateY\(0\)/);
  assert.match(css, /prefers-reduced-motion: reduce/);
  assert.match(css, /animation: none/);
  const sheet = readFileSync(new URL("./testimonial-sheet-dialog.tsx", import.meta.url), "utf8");
  assert.equal((sheet.match(/lectum-testimonial-sheet-enter/g) || []).length, 1);
});

test("editar envia somente campos permitidos mesmo recebendo os valores do formulario de criacao", async () => {
  const { default: api } = await import("../../api/index.ts");
  const { updatePatientReview } = await import("../../api/req/reviews/index.ts");
  const received = [];
  const server = createServer(async (request, response) => {
    let body = "";
    for await (const chunk of request) body += chunk;
    received.push({ method: request.method, url: request.url, body: JSON.parse(body) });
    response.setHeader("Content-Type", "application/json");
    response.end(JSON.stringify({ success: true, data: { review_id: "testimonial-local" } }));
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const previousBase = api.defaults.baseURL;
  api.defaults.baseURL = `http://127.0.0.1:${server.address().port}`;
  try {
    await updatePatientReview("testimonial-local", {
      psychologist_id: "nao-deve-ser-enviado",
      rating: 4,
      comment: "Relato editado",
    });
    assert.deepEqual(received, [
      {
        method: "PUT",
        url: "/api/private/user/reviews/testimonial-local",
        body: { rating: 4, comment: "Relato editado" },
      },
    ]);
  } finally {
    api.defaults.baseURL = previousBase;
    await new Promise((resolve) => server.close(resolve));
  }
});

test("lista e formulario bloqueiam a navegacao do feed durante a rolagem da modal", () => {
  const source = readFileSync(new URL("./testimonial-sheet-dialog.tsx", import.meta.url), "utf8");
  assert.equal((source.match(/data-psychologists-scroll-lock="true"/g) || []).length, 1);
  assert.equal((source.match(/<Modal\s/g) || []).length, 1);
  assert.match(source, /hidden=\{view !== "list"\}/);
  assert.match(source, /invitationRef.current\?\.isConnected/);
  assert.match(source, /<div \{\.\.\.drag.handleProps\} className="shrink-0"/);
  assert.match(source, /disabled: formState.submitting/);
  assert.match(source, /onClose: requestClose/);
});

test("guard de descarte preserva o formulario ao cancelar e bloqueia saida durante envio", () => {
  const source = readFileSync(new URL("./testimonial-sheet-dialog.tsx", import.meta.url), "utf8");
  const ast = ts.createSourceFile(
    "sheet.tsx",
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );
  let expression;
  const visit = (node) => {
    if (ts.isVariableDeclaration(node) && node.name.getText(ast) === "canLeave")
      expression = node.initializer.getText(ast);
    ts.forEachChild(node, visit);
  };
  visit(ast);
  assert.ok(expression);
  for (const [dirty, submitting, confirmed, expected, expectedPrompts] of [
    [false, false, false, true, 0],
    [true, false, false, false, 1],
    [true, false, true, true, 1],
    [true, true, true, false, 0],
    [false, true, true, false, 0],
  ]) {
    let prompts = 0;
    const canLeave = runInNewContext(`(${expression})`, {
      formState: { dirty, submitting },
      window: {
        confirm: () => {
          prompts += 1;
          return confirmed;
        },
      },
    });
    assert.equal(canLeave(), expected);
    assert.equal(prompts, expectedPrompts);
  }
  assert.match(source, /if \(!canLeave\(\)\) return;/);
  assert.match(source, /if \(!canLeave\(\)\) return false;\s*setOpen\(false\);\s*return true;/);
});

test("contadores usam totais do servidor, preservam zero e nao inventam total no backend antigo", () => {
  const source = readFileSync(new URL("./professional-testimonials.tsx", import.meta.url), "utf8");
  const ast = ts.createSourceFile(
    "reviews.tsx",
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );
  let expression;
  const visit = (node) => {
    if (
      ts.isJsxExpression(node) &&
      node.expression?.getText(ast).includes("data?.visibility_counts")
    )
      expression = node.expression.getText(ast);
    ts.forEachChild(node, visit);
  };
  visit(ast);
  assert.ok(expression);
  const evaluate = (data, id, filter = "visible") =>
    runInNewContext(expression, { data, id, filter });
  const data = { count: 80, visibility_counts: { visible: 80, hidden: 0, all: 80 }, items: [base] };
  assert.equal(evaluate(data, "visible"), "80");
  assert.equal(evaluate(data, "hidden"), "0");
  assert.equal(evaluate(data, "all"), "80");
  assert.equal(evaluate({ count: 80 }, "visible"), "80");
  assert.equal(evaluate({ count: 80 }, "hidden"), "…");
  assert.equal(evaluate(undefined, "all"), "…");
});

test("identidade profissional preserva nome, genero, selo e anonimato do autor", () => {
  const professional = {
    id: "professional",
    name: "Alessandra Camargo",
    gender: "feminino",
    verified: true,
    avatar: "/public/files/professional-avatar.jpg",
  };
  const html = renderToStaticMarkup(
    createElement(TestimonialCard, {
      review: { ...base, response: "Obrigada pelo relato." },
      professional,
    }),
  );
  assert.match(html, /Ana P\./);
  assert.match(html, />AP</);
  assert.match(html, /Alessandra Camargo/);
  assert.match(html, /Psicóloga/);
  assert.match(html, /Perfil verificado/);
  assert.match(html, /professional-avatar/);
  const unknown = renderToStaticMarkup(
    createElement(TestimonialProfessionalIdentity, { fallbackName: "Nome recebido" }),
  );
  assert.match(unknown, /Nome recebido/);
  assert.doesNotMatch(unknown, /Perfil verificado|<img/);
  const unverified = renderToStaticMarkup(
    createElement(TestimonialProfessionalIdentity, {
      professional: { ...professional, verified: false },
    }),
  );
  assert.doesNotMatch(unverified, /Perfil verificado/);
});

test("depoimentos usam blocos separados e removem textos redundantes sem perder os totais", () => {
  for (const file of [
    "public-testimonials.tsx",
    "patient-testimonials.tsx",
    "professional-testimonials.tsx",
    "testimonial-sheet-dialog.tsx",
  ]) {
    const source = readFileSync(new URL(`./${file}`, import.meta.url), "utf8");
    assert.match(source, /grid gap-3/);
    assert.doesNotMatch(
      source,
      /TESTIMONIAL_DESCRIPTION|Relatos sobre experiências|depoimentos visíveis no perfil|divide-y divide-border/,
    );
  }
  const html = renderToStaticMarkup(createElement(TestimonialCard, { review: base }));
  assert.match(html, /<article class="min-w-0 rounded-lg bg-surface p-4"/);
  const professional = readFileSync(
    new URL("./professional-testimonials.tsx", import.meta.url),
    "utf8",
  );
  assert.match(professional, /data\?\.visibility_counts\?\.\[id\]/);
});

test("resposta liga o avatar do pai ao avatar filho com geometria da arvore de comentarios", () => {
  const card = readFileSync(new URL("./testimonial-card.tsx", import.meta.url), "utf8");
  const tree = readFileSync(
    new URL("../../app/app/community/[slug]/post/[id]/components/reply-card.tsx", import.meta.url),
    "utf8",
  );
  for (const token of [
    "grid-cols-[2rem_minmax(0,1fr)]",
    "sm:grid-cols-[2.25rem_minmax(0,1fr)]",
    "top-10 left-4",
    "border-l-[1.5px]",
    "rounded-bl-[8px]",
    "h-[12.75px]",
    "sm:pl-[22px]",
  ]) {
    assert.ok(tree.includes(token), token);
    assert.ok(card.includes(token), token);
  }
  const html = renderToStaticMarkup(
    createElement(TestimonialCard, {
      review: { ...base, response: "Obrigada.", responded_at: base.created_at },
    }),
  );
  assert.match(html, /data-testimonial-stem/);
  assert.match(html, /data-testimonial-curve/);
  assert.match(html, /-bottom-3 top-10/);
  assert.match(html, /relative z-10 mt-3 ml-4/);
  const withoutResponse = renderToStaticMarkup(createElement(TestimonialCard, { review: base }));
  assert.doesNotMatch(withoutResponse, /data-testimonial-stem|data-testimonial-curve/);
});

test("identidade publica mantem nome abreviado e iniciais sem aproveitar foto privada extra", () => {
  const review = {
    ...base,
    author: { ...base.author, avatar: "/public/files/private-avatar.jpg", id: "private-author" },
  };
  const html = renderToStaticMarkup(createElement(TestimonialCard, { review }));
  assert.match(html, /Ana P\./);
  assert.match(html, />AP</);
  assert.doesNotMatch(html, /private-avatar|private-author/);
  const own = renderToStaticMarkup(
    createElement(TestimonialCard, {
      review: base,
      ownAuthorAvatar: "/public/files/own-avatar.jpg",
    }),
  );
  assert.match(own, /own-avatar.jpg/);
  for (const file of [
    "public-testimonials.tsx",
    "professional-testimonials.tsx",
    "testimonial-sheet-dialog.tsx",
  ]) {
    assert.doesNotMatch(
      readFileSync(new URL(`./${file}`, import.meta.url), "utf8"),
      /ownAuthorAvatar/,
    );
  }
});

test("composer associa publicar ao formulario fora da rolagem e junto da safe area", () => {
  const query = new QueryClient();
  try {
    const html = renderToStaticMarkup(
      createElement(
        QueryClientProvider,
        { client: query },
        createElement(TestimonialForm, {
          psychologistId: "profissional",
          onSuccess() {},
          sheetLayout: true,
        }),
      ),
    );
    const formId = html.match(/<form[^>]*\sid="([^"]+)"/)[1];
    const submit = html.match(/<button[^>]*type="submit"[^>]*>/)[0];
    assert.ok(submit.includes(`form="${formId}"`));
    assert.ok(html.indexOf("</form>") < html.indexOf("data-testimonial-submit"));
    assert.match(html, /min-h-0 flex-1 overflow-y-auto overscroll-contain/);
    assert.match(html, /pb-\[max\(12px,env\(safe-area-inset-bottom\)\)\]/);
    assert.match(submit, /bg-primary text-primary-foreground/);
    const sheet = readFileSync(new URL("./testimonial-sheet-dialog.tsx", import.meta.url), "utf8");
    assert.match(sheet, /className="shrink-0 px-4 py-4"/);
    assert.match(sheet, /onStateChange=\{setFormState\}\s+sheetLayout/);
  } finally {
    query.clear();
  }
});

test("depoimento mostra autor, texto e nota individual sem média", () => {
  const html = renderToStaticMarkup(createElement(TestimonialCard, { review: base }));
  assert.match(html, /Ana P\./);
  assert.match(html, /Senti respeito e acolhimento/);
  assert.match(html, /aria-label="4 de 5 estrelas"/);
  assert.doesNotMatch(html, /média|Avaliações|Responder|<form/);
});

test("depoimento tem somente a resposta do profissional, sem novos comentários", () => {
  const html = renderToStaticMarkup(
    createElement(TestimonialCard, {
      review: { ...base, response: "Obrigado pelo relato.", responded_at: "2026-10-29T15:00:00Z" },
      responseName: "Psicóloga Ana",
    }),
  );
  assert.equal((html.match(/Obrigado pelo relato/g) || []).length, 1);
  assert.match(html, /Psicóloga Ana/);
  assert.match(html, /dateTime="2026-10-29T15:00:00Z"/i);
  assert.doesNotMatch(html, /<form|Adicionar comentário|Responder/);
});

test("card público não expõe status de moderação nem interpreta HTML", () => {
  const html = renderToStaticMarkup(
    createElement(TestimonialCard, {
      review: { ...base, status: "oculta_profissional", comment: "<script>alert(1)</script>" },
    }),
  );
  assert.doesNotMatch(html, /oculta|Oculto|<script>/);
  assert.match(html, /&lt;script&gt;/);
});

test("formulário real tem placeholder aprovado, cinco estrelas e nenhum consentimento extra", () => {
  const query = new QueryClient();
  const html = renderToStaticMarkup(
    createElement(
      QueryClientProvider,
      { client: query },
      createElement(TestimonialForm, { psychologistId: "profissional", onSuccess() {} }),
    ),
  );
  assert.match(
    html,
    /Conte como você se sentiu com este psicólogo, se ele foi respeitoso e acolhedor\./,
  );
  assert.equal((html.match(/type="radio"/g) || []).length, 5);
  assert.match(html, /<form/);
  assert.match(html, /name="comment"/);
  assert.doesNotMatch(html, /Escolha sua nota|Concordo em publicar|type="checkbox"/);
  query.clear();
});

test("validação aceita cada nota inteira e texto, sem exigir atendimento ou contato", () => {
  for (const rating of ["1", "2", "3", "4", "5"]) {
    assert.ok(
      reviewFormSchema.safeParse({
        psychologist_id: "profissional",
        rating,
        comment: "A resposta a outra pessoa me ajudou.",
      }).success,
    );
  }
});

test("validação rejeita nota inválida, texto vazio ou acima do limite", () => {
  for (const rating of ["", "0", "6", "3.5", "NaN"]) {
    assert.equal(
      reviewFormSchema.safeParse({ psychologist_id: "profissional", rating, comment: "Relato" })
        .success,
      false,
    );
  }
  for (const comment of ["", "   ", "x".repeat(1001)]) {
    assert.equal(
      reviewFormSchema.safeParse({ psychologist_id: "profissional", rating: "5", comment }).success,
      false,
    );
  }
});
