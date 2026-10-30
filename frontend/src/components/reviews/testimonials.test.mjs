import "../../../scripts/register-source-modules.mjs";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createServer } from "node:http";
import test from "node:test";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

const { TestimonialCard } = await import("./testimonial-card.tsx");
const { TestimonialForm } = await import("./testimonial-form.tsx");
const { reviewFormSchema } = await import("../../app/app/reviews/new/use-form.tsx");
const base = {
  id: "testimonial-local",
  rating: 4,
  comment: "Senti respeito e acolhimento.",
  response: null,
  created_at: "2026-10-29T12:00:00Z",
  author: { name: "Ana P.", initials: "AP" },
};

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
  const source = readFileSync(new URL("./testimonials-sheet.tsx", import.meta.url), "utf8");
  assert.equal((source.match(/data-psychologists-scroll-lock="true"/g) || []).length, 2);
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
