import "../../../scripts/register-source-modules.mjs";
import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import test from "node:test";
import { zodResolver } from "@hookform/resolvers/zod";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createFormControl } from "react-hook-form";

registerHooks({
  resolve(specifier, context, nextResolve) {
    return nextResolve(specifier === "next/link" ? "next/link.js" : specifier, context);
  },
});

const { whatsappWeekFormSchema, WhatsappWeekForm } = await import("./whatsapp-week-form.tsx");
const { metricCards } = await import("../../app/app/professional/analytics/modules/support.ts");
const { PremiumAnalyticsBanner, MetricCard } = await import(
  "../../app/app/professional/analytics/components/period-and-metrics.tsx"
);

for (const count of [0, 1, 10]) {
  test(`formulario aceita resposta intencional ${count}`, async () => {
    const form = createFormControl({
      defaultValues: { count },
      resolver: zodResolver(whatsappWeekFormSchema(10)),
    });
    let submitted;
    await form.handleSubmit((value) => {
      submitted = value;
    })();
    assert.deepEqual(submitted, { count });
  });
}
for (const count of [null, undefined, "", -1, 0.5, 11]) {
  test(`formulario rejeita ausencia/valor invalido ${count}`, () => {
    assert.equal(whatsappWeekFormSchema(10).safeParse({ count }).success, false);
  });
}
test("formulario inicia vazio, usa controller real e preserva zero salvo", () => {
  const render = (count) =>
    renderToStaticMarkup(
      createElement(WhatsappWeekForm, {
        report: { people_count: 10, acquired_count: count },
        pending: false,
        onSubmit() {},
      }),
    );
  assert.match(render(null), /value=""/);
  assert.match(render(0), /value="0"/);
  assert.match(render(null), /type="number"/);
  assert.match(render(null), /Sua resposta será registrada nos seus Analytics da Lectum\./);
  assert.doesNotMatch(render(null), /Não sei informar/);
});
test("indicadores lado a lado, ausencia distinta de zero e nota de autoria", () => {
  const cards = metricCards({
    metrics: { whatsapp_clicks: 3, acquired_patients: 0, unanswered_weeks: 1 },
  });
  assert.equal(cards.length, 6);
  assert.equal(cards[4].label, "Cliques no WhatsApp");
  assert.equal(cards[4].layout, undefined);
  assert.equal(cards[4].description, undefined);
  assert.equal(cards[5].label, "Pacientes adquiridos");
  assert.equal(cards[5].value, "0");
  assert.match(cards[5].description, /Dados informados pelo psicólogo/);
  assert.match(cards[5].description, /Há semanas sem resposta/);
  assert.equal(metricCards()[5].value, "—");
  const locked = renderToStaticMarkup(
    createElement(MetricCard, { locked: true, metric: metricCards()[4] }),
  );
  assert.match(locked, /blur-/);
});
test("upgrade usa checkout de pagamento e texto aprovado", () => {
  const html = renderToStaticMarkup(createElement(PremiumAnalyticsBanner));
  assert.match(html, /Disponível para assinantes/);
  assert.match(html, /Assine o plano profissional para acompanhar seus resultados\./);
  assert.match(html, /href="\/app\/profissional\/assinatura\/pagamento"/);
});
