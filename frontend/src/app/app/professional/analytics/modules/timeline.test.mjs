import "../../../../../../scripts/register-source-modules.mjs";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { registerHooks } from "node:module";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { pointerDayIndex, smoothTimelinePath, timelineDates, timelineValues } from "./timeline.ts";

registerHooks({
  resolve(specifier, context, nextResolve) {
    return nextResolve(specifier === "next/link" ? "next/link.js" : specifier, context);
  },
});

const { MetricTimeline } = await import("../components/metric-timeline.tsx");

test("favorites label is consistent in the legend and accessible details without changing totals", () => {
  const timeline = {
    granularity: "day",
    series: [
      { id: "communities", label: "Comunidades", points: [{ date: "2026-10-22", value: 2 }] },
      { id: "favorites", label: "Página de favoritos", points: [{ date: "2026-10-22", value: 3 }] },
    ],
  };
  const html = renderToStaticMarkup(createElement(MetricTimeline, { timeline }));
  assert.match(html, /Favoritos:/);
  assert.match(html, /Comunidades: 2; Favoritos: 3/);
  assert.doesNotMatch(html, /Página de favoritos/);
  assert.match(html, /text-xs font-semibold leading-4 text-muted/);
  assert.equal(timeline.series[1].label, "Página de favoritos");
});

test("overview places wider compact counters with icons inside chart surface, preserving comparison", () => {
  const overview = readFileSync(
    new URL("../components/analytics-overview.tsx", import.meta.url),
    "utf8",
  );
  const video = readFileSync(
    new URL("../components/presentation-video.tsx", import.meta.url),
    "utf8",
  );
  assert.match(video, /text-xs font-semibold leading-4 text-muted/);
  assert.match(overview, /text-\[15px\] font-medium leading-5/);
  assert.match(overview, /text-\[28px\] font-bold/);
  assert.ok(overview.includes("w-[78%]"));
  assert.ok(overview.includes("md:w-[36%]"));
  assert.ok(overview.includes("min-h-[100px]"));
  assert.ok(overview.includes("<card.icon"));
  assert.doesNotMatch(overview, /CurrentIcon/);
  assert.match(overview, /bg-primary text-primary-foreground/);
  assert.match(overview, /border-border bg-transparent text-foreground/);
  assert.ok(overview.includes('card.id === "video_views" ? "Vídeo de apresentação" : card.label'));
  const comparison = readFileSync(
    new URL("../components/metric-comparison.tsx", import.meta.url),
    "utf8",
  );
  // The global button font reset inherits from the comparison wrapper.
  assert.match(comparison, /absolute bottom-2 right-2 text-\[10px\] font-semibold leading-4/);
});

test("only Favoritado omits Favorites from legend and chart without mutating API data", async () => {
  const { AnalyticsOverview } = await import("../components/analytics-overview.tsx");
  const { metricCards, fallbackTrafficSources } = await import("./support.ts");
  const timeline = {
    granularity: "day",
    series: [
      { id: "profile", label: "Perfil", points: [{ date: "2026-10-22", value: 1 }] },
      { id: "favorites", label: "Favoritos", points: [{ date: "2026-10-22", value: 0 }] },
    ],
  };
  const data = {
    metrics: { favorites_received: 1, whatsapp_clicks: 1 },
    period: { key: "30d", start_at: "2026-10-01T03:00:00Z", end_at: "2026-10-23T02:59:59Z" },
    chart_data: { timelines: { favorites_received: timeline, whatsapp_clicks: timeline } },
  };
  const render = (initialSelected) =>
    renderToStaticMarkup(
      createElement(AnalyticsOverview, {
        cards: metricCards(data),
        data,
        traffic: fallbackTrafficSources,
        initialSelected,
      }),
    );
  assert.doesNotMatch(render("favorites_received"), /Favoritos:/);
  assert.match(render("whatsapp_clicks"), /Favoritos:/);
  assert.equal(timeline.series.length, 2);
  assert.equal(data.metrics.favorites_received, 1);
});

test("daily dates include zero days and use Sao Paulo boundaries", () => {
  const timeline = {
    granularity: "day",
    series: [{ id: "a", label: "A", points: [{ date: "2026-10-17", value: 2 }] }],
  };
  assert.deepEqual(
    timelineDates(timeline, {
      key: "custom",
      start_at: "2026-10-16T03:00:00Z",
      end_at: "2026-10-19T02:59:59Z",
    }),
    ["2026-10-16", "2026-10-17", "2026-10-18"],
  );
});
test("all time starts with first real event, and weekly reports do not invent daily values", () => {
  const series = [
    {
      id: "a",
      label: "A",
      points: [
        { date: "2026-10-05", value: 3 },
        { date: "2026-10-19", value: 1 },
      ],
    },
  ];
  assert.deepEqual(timelineDates({ granularity: "week", series }), ["2026-10-05", "2026-10-19"]);
  assert.equal(
    timelineDates(
      { granularity: "day", series },
      { key: "all", start_at: "1970-01-01T00:00:00Z", end_at: "2026-10-20T02:59:00Z" },
    ).length,
    15,
  );
});
test("scrubbing clamps to first and last day", () => {
  assert.equal(pointerDayIndex(-20, 10, 100, 7), 0);
  assert.equal(pointerDayIndex(110, 10, 100, 7), 6);
  assert.equal(pointerDayIndex(60, 10, 100, 7), 3);
  assert.equal(pointerDayIndex(60, 10, 100, 1), 0);
});

test("total curve sums actions across origins and fills zero days without mutating data", () => {
  const timeline = {
    granularity: "day",
    series: [
      {
        id: "profile",
        label: "Perfil",
        points: [
          { date: "2026-10-20", value: 3 },
          { date: "2026-10-22", value: 1 },
        ],
      },
      { id: "communities", label: "Comunidades", points: [{ date: "2026-10-20", value: 2 }] },
      { id: "unknown", label: "Outras", points: [] },
    ],
  };
  const before = JSON.stringify(timeline);
  const result = timelineValues(timeline);
  assert.deepEqual(result.totals, [5, 0, 1]);
  assert.deepEqual(
    result.series.map((s) => s.total),
    [4, 2],
  );
  assert.equal(JSON.stringify(timeline), before);
  const html = renderToStaticMarkup(createElement(MetricTimeline, { timeline, showLegend: false }));
  assert.equal((html.match(/data-testid="total-curve"/g) ?? []).length, 1);
  assert.match(html, /Total: 1; Perfil: 1; Comunidades: 0/);
  assert.match(html, /linearGradient/);
  assert.match(html, /stop-opacity="0.22"/);
  assert.doesNotMatch(html, /data-testid="period-totals"/);
});

test("bounded cubic curve hits all observations and never overshoots even around zero", () => {
  const values = [0, 4, 1, 9, 0, 0, 3, 7, 10, 2, 0];
  const points = values.map((y, index) => ({ x: index * 10, y }));
  const path = smoothTimelinePath(points);
  const segments = [...path.matchAll(/C ([^,]+),([^ ]+) ([^,]+),([^ ]+) ([^,]+),([^ ]+)/g)];
  assert.equal(segments.length, points.length - 1);
  segments.forEach((segment, index) => {
    const [, x1, y1, x2, y2, x3, y3] = segment.map(Number);
    assert.equal(x3, points[index + 1].x);
    assert.equal(y3, points[index + 1].y);
    assert.ok(x1 < x2 && x2 < x3);
    for (let step = 0; step <= 100; step++) {
      const t = step / 100,
        u = 1 - t;
      const y = u ** 3 * points[index].y + 3 * u * u * t * y1 + 3 * u * t * t * y2 + t ** 3 * y3;
      assert.ok(y >= Math.min(values[index], values[index + 1]) - 1e-8);
      assert.ok(y <= Math.max(values[index], values[index + 1]) + 1e-8);
    }
  });
  assert.equal(smoothTimelinePath([]), "");
  assert.equal(smoothTimelinePath([{ x: 2, y: 0 }]), "M 2,0");
});

test("all origin metrics have a period table while locked data never renders details", async () => {
  const { AnalyticsOverview } = await import("../components/analytics-overview.tsx");
  const { metricCards, fallbackTrafficSources } = await import("./support.ts");
  const timeline = {
    granularity: "day",
    series: [
      { id: "profile", label: "Perfil", points: [{ date: "2026-10-20", value: 2 }] },
      { id: "unknown", label: "Outras", points: [{ date: "2026-10-20", value: 1 }] },
    ],
  };
  for (const metric of ["whatsapp_clicks", "video_views", "profile_views", "favorites_received"]) {
    const data = {
      metrics: {},
      period: { key: "30d", start_at: "2026-10-01T03:00:00Z", end_at: "2026-10-21T02:59:59Z" },
      chart_data: { timelines: { [metric]: timeline }, video_search_terms: [] },
    };
    const render = (locked) =>
      renderToStaticMarkup(
        createElement(AnalyticsOverview, {
          cards: metricCards(data),
          data,
          traffic: fallbackTrafficSources,
          initialSelected: metric,
          locked,
        }),
      );
    assert.match(render(false), /Resultados por origem/);
    assert.match(render(false), /Outras/);
    assert.doesNotMatch(render(true), /Resultados por origem/);
    assert.doesNotMatch(render(true), /total-curve/);
  }
});

test("period menu offers only requested ranges and custom label keeps dates", async () => {
  const { PERIOD_OPTIONS, analyticsPeriodLabel } = await import("./support.ts");
  assert.deepEqual(PERIOD_OPTIONS, [
    { label: "Últimos 7 dias", value: "7d" },
    { label: "Últimos 30 dias", value: "30d" },
    { label: "Últimos 12 meses", value: "365d" },
    { label: "Personalizado", value: "custom" },
  ]);
  const range = { start_at: "2026-10-01", end_at: "2026-10-28" };
  assert.equal(analyticsPeriodLabel("custom", range), "Personalizado: 01/10/2026 a 28/10/2026");
  assert.equal(analyticsPeriodLabel("365d", range), "Últimos 12 meses");
});

test("origin tables use metric-specific columns without a redundant heading", async () => {
  const { MetricDetails } = await import("../components/metric-details.tsx");
  const timeline = {
    granularity: "day",
    series: [
      { id: "search", label: "Minha Busca", points: [{ date: "2026-10-20", value: 8 }] },
      { id: "profile", label: "Perfil", points: [{ date: "2026-10-20", value: 12 }] },
      { id: "explore", label: "Explorar", points: [{ date: "2026-10-20", value: 1 }] },
    ],
  };
  const before = JSON.stringify(timeline);
  for (const [metric, column] of [
    ["video_views", "Visualizações"],
    ["profile_views", "Acessos"],
    ["favorites_received", "Total"],
  ]) {
    const html = renderToStaticMarkup(createElement(MetricDetails, { timeline, metric }));
    assert.doesNotMatch(html, /<h3/);
    assert.match(html, new RegExp(`scope="col"[^>]*>${column}`));
    assert.match(html, /scope="col"[^>]*>Origem/);
    if (metric === "video_views") {
      assert.ok(html.indexOf(">Explorar<") < html.indexOf(">Minha Busca<"));
      assert.ok(html.indexOf(">Minha Busca<") < html.indexOf(">Perfil<"));
    } else {
      assert.ok(html.indexOf(">Perfil<") < html.indexOf(">Minha Busca<"));
    }
  }
  assert.equal(JSON.stringify(timeline), before);
});
