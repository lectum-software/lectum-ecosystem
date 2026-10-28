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
    return nextResolve(
      ["next/link", "next/image"].includes(specifier) ? `${specifier}.js` : specifier,
      context,
    );
  },
});

const { MetricTimeline } = await import("../components/metric-timeline.tsx");
const { CommunityActivitySection } = await import("../components/community-activity.tsx");

const contentCategories = [
  ["post_with_video", "Posts com vídeo"],
  ["post_without_video", "Posts sem vídeo"],
  ["reply_with_video", "Respostas com vídeo"],
  ["reply_without_video", "Respostas sem vídeo"],
];
function renderContentDistribution(values, locked = false, reversed = false) {
  const breakdown = contentCategories.map(([id, label], index) => ({
    id,
    label,
    whatsapp_clicks: values[index],
  }));
  const communities = {
    content: { whatsapp_clicks_by_content: reversed ? [...breakdown].reverse() : breakdown },
    top_mentors: { whatsapp_clicks: values[4], message: "" },
    highlights: { posts: [], replies: [] },
  };
  const before = JSON.stringify(communities);
  const html = renderToStaticMarkup(
    createElement(CommunityActivitySection, {
      communities,
      locked,
      periodLabel: "Últimos 30 dias",
    }),
  );
  assert.equal(JSON.stringify(communities), before, "presentation must not mutate API data");
  const rows = [...html.matchAll(/<li data-content-origin="([^"]+)">([\s\S]*?)<\/li>/g)];
  return {
    html,
    rows: rows.map(([, id, markup]) => ({
      id,
      text: markup.replace(/<[^>]+>/g, "").trim(),
    })),
  };
}

test("content legend sorts counts descending with percentages and stable category colors", () => {
  const { html, rows } = renderContentDistribution([12, 24, 6, 15, 3]);
  assert.deepEqual(
    rows.map((row) => row.id),
    [
      "post_without_video",
      "reply_without_video",
      "post_with_video",
      "reply_with_video",
      "top_mentors",
    ],
  );
  assert.match(rows[0].text, /24.*\(40%\)/);
  assert.match(rows[1].text, /15.*\(25%\)/);
  assert.match(rows[4].text, /3.*\(5%\)/);
  assert.match(html, /divide-y divide-border/);
  // Buttons inherit their font from the list through the global form-control reset.
  assert.match(html, /<ul class="min-w-0 divide-y divide-border text-sm leading-5"/);
  for (const token of ["primary", "chart-sky", "chart-lilac", "chart-indigo", "chart-slate"]) {
    assert.ok(html.includes(`stroke="var(--lectum-${token})"`));
    assert.ok(html.includes(`background:var(--lectum-${token})`));
  }
  assert.doesNotMatch(html, /var\(--lectum-warning\)|var\(--lectum-success\)/);
});

test("content legend preserves zero rows, canonical ties and locked controls", () => {
  const { html, rows } = renderContentDistribution([0, 0, 0, 0, 0], false, true);
  assert.deepEqual(
    rows.map((row) => row.id),
    [...contentCategories.map(([id]) => id), "top_mentors"],
  );
  assert.ok(rows.every((row) => /0.*\(0%\)/.test(row.text)));
  assert.doesNotMatch(html, /role="button"/);
  const tied = renderContentDistribution([3, 3, 0, 0, 3], false, true);
  assert.deepEqual(
    tied.rows.map((row) => row.id),
    [
      "post_with_video",
      "post_without_video",
      "top_mentors",
      "reply_with_video",
      "reply_without_video",
    ],
  );
  assert.match(tied.rows[0].text, /\(33,3%\)/);
  const locked = renderContentDistribution([12, 24, 6, 15, 3], true);
  assert.equal((locked.html.match(/disabled=""/g) ?? []).length, 5);
  assert.doesNotMatch(locked.html, /role="button"/);
});

test("content percentages retain small positive shares and single-origin totals", () => {
  const tiny = renderContentDistribution([1, 9999, 0, 0, 0]);
  assert.match(tiny.rows[1].text, /\(&lt;0,1%\)/);
  const single = renderContentDistribution([0, 0, 25, 0, 0]);
  assert.match(single.rows[0].text, /25.*\(100%\)/);
  assert.match(single.html, /stroke-dasharray="100 0"/);
});

test("retention surfaces and video reuse the outer card radius", () => {
  const source = readFileSync(
    new URL("../components/presentation-video.tsx", import.meta.url),
    "utf8",
  );
  const retention = source.slice(source.indexOf('<article className="grid min-w-0 gap-4'));
  assert.equal((retention.match(/rounded-\[var\(--lectum-card-radius\)\]/g) ?? []).length, 4);
  assert.doesNotMatch(retention, /rounded-\[26px\]|rounded-\[22px\]/);
  assert.match(source, /mt-3 w-full rounded-\[var\(--lectum-card-radius\)\] border/);
});

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
  assert.match(overview, /min-w-0 break-words text-base font-semibold leading-5/);
  assert.match(overview, /rounded-2xl border p-3/);
  assert.match(overview, /h-7 w-7 shrink-0 place-items-center rounded-full/);
  assert.match(
    overview,
    /active\s*\? "bg-transparent text-primary-foreground"\s*: "bg-primary-soft text-primary"/,
  );
  assert.match(overview, /<card.icon className="h-4 w-4"/);
  assert.match(overview, /text-\[28px\] font-bold/);
  assert.ok(overview.includes("w-[78%]"));
  assert.ok(overview.includes("md:w-[36%]"));
  assert.ok(overview.includes("min-h-[100px]"));
  assert.ok(overview.includes("<card.icon"));
  assert.doesNotMatch(overview, /CurrentIcon/);
  assert.match(overview, /bg-primary text-primary-foreground/);
  assert.match(overview, /border-border-strong bg-transparent text-foreground/);
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

test("point heading keeps date and total adjacent with a decorative bullet", () => {
  const source = readFileSync(
    new URL("../components/metric-timeline.tsx", import.meta.url),
    "utf8",
  );
  assert.match(source, /<p className="font-extrabold" data-testid="point-heading">/);
  assert.match(source, /<span aria-hidden>•<\/span>/);
  assert.match(source, /<span>Total: /);
});
