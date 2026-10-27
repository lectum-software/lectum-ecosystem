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
const { WeeklyWhatsappNotification } = await import(
  "../../app/app/notifications/weekly-whatsapp-notification.tsx"
);

for (const answered of [false, true]) {
  test(`notificacao semanal tem titulo em negrito e acao propria: answered=${answered}`, () => {
    const html = renderToStaticMarkup(
      createElement(WeeklyWhatsappNotification, {
        startLabel: "19/10",
        endLabel: "25/10",
        peopleCount: 1,
        answered,
        href: "/app/notificacoes?whatsapp_week=week-id",
        relativeTime: "8 h",
      }),
    );
    assert.match(html, /<h3 class="[^"]*font-bold[^"]*">Pacientes adquiridos<\/h3>/);
    assert.match(html, /1 pessoa clicou no seu WhatsApp/);
    assert.match(html, /href="\/app\/notificacoes\?whatsapp_week=week-id"/);
    assert.match(html, /bg-primary/);
    assert.match(html, /rounded-lg/);
    assert.match(html, /lucide-user-round-plus/);
    assert.equal((html.match(/<a /g) ?? []).length, 1);
    assert.doesNotMatch(html, /<button/);
    if (answered) {
      assert.match(html, />Ver resposta<\/a>/);
      assert.match(html, /Agendamentos informados/);
      assert.doesNotMatch(html, /Informe mesmo que nenhuma/);
    } else {
      assert.match(html, />Informar pacientes<\/a>/);
      assert.match(html, /Quantas agendaram uma consulta\?/);
      assert.doesNotMatch(html, /Informe mesmo que nenhuma/);
    }
  });
}

test("notificacao semanal suporta plural e ausencia de destino sem acao falsa", () => {
  const html = renderToStaticMarkup(
    createElement(WeeklyWhatsappNotification, {
      peopleCount: 12,
      answered: false,
      relativeTime: "1 d",
    }),
  );
  assert.match(html, /12 pessoas clicaram/);
  assert.doesNotMatch(html, /<a |<button|undefined/);
});
const { metricCards, fallbackTrafficSources } = await import(
  "../../app/app/professional/analytics/modules/support.ts"
);
const { PremiumAnalyticsBanner, MetricCard, PeriodTabs } = await import(
  "../../app/app/professional/analytics/components/period-and-metrics.tsx"
);

for (const count of [0, 1, 10, 11, 1_000_000]) {
  test(`formulario aceita resposta intencional ${count}`, async () => {
    const form = createFormControl({
      defaultValues: { count },
      resolver: zodResolver(whatsappWeekFormSchema()),
    });
    let submitted;
    await form.handleSubmit((value) => {
      submitted = value;
    })();
    assert.deepEqual(submitted, { count });
  });
}
for (const count of [null, undefined, "", -1, 0.5, 1_000_001]) {
  test(`formulario rejeita ausencia/valor invalido ${count}`, () => {
    assert.equal(whatsappWeekFormSchema().safeParse({ count }).success, false);
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
  assert.doesNotMatch(render(null), /max="10"/);
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
  assert.equal(cards[4].value, "3");
  assert.equal(cards[4].source, "important_action_event");
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

test("contador de pacientes abre historico por link com chevron", () => {
  const metric = metricCards()[5];
  assert.equal(metric.href, "/app/profissional/pacientes-adquiridos");
  const html = renderToStaticMarkup(createElement(MetricCard, { metric }));
  assert.match(html, /href="\/app\/profissional\/pacientes-adquiridos"/);
  assert.match(html, /chevron-right/);
  assert.match(html, /after:inset-0/);
  assert.doesNotMatch(html, /blur-/);
});

test("datas aparecem apenas no seletor personalizado aplicado", () => {
  const render = (current) =>
    renderToStaticMarkup(
      createElement(PeriodTabs, {
        current,
        customPopoverOpen: false,
        customRange: { start_at: "2026-10-01", end_at: "2026-10-18" },
        onChange() {},
        onCustomPopoverOpenChange() {},
        onCustomRangeApply() {},
      }),
    );
  assert.match(render("custom"), /Personalizado • 01\/10\/26 a 18\/10\/26/);
  for (const period of ["all", "7d", "30d", "year"]) {
    assert.doesNotMatch(render(period), /01\/10\/26|18\/10\/26/);
    assert.match(render(period), />Personalizado<\/button>/);
  }
});

const { AnalyticsOverview } = await import(
  "../../app/app/professional/analytics/components/analytics-overview.tsx"
);
test("resumo de WhatsApp distingue ações, pessoas e média sem alterar pacientes adquiridos", () => {
  const data = {
    metrics: {
      whatsapp_clicks: 4,
      whatsapp_unique_people: 2,
      whatsapp_clicks_per_person: 2,
      acquired_patients: 1,
    },
    period: { key: "custom", start_at: "2026-10-19T03:00:00Z", end_at: "2026-10-21T02:59:59Z" },
  };
  const html = renderToStaticMarkup(
    createElement(AnalyticsOverview, {
      cards: metricCards(data),
      data,
      traffic: fallbackTrafficSources,
    }),
  );
  assert.match(html, /Total de cliques:/);
  assert.match(html, /Pessoas únicas:/);
  assert.match(html, /Média de cliques por pessoa:/);
  assert.ok(html.includes(">2,0</dd>"));
  assert.equal(metricCards(data).find((card) => card.id === "acquired_patients").value, "1");
});
