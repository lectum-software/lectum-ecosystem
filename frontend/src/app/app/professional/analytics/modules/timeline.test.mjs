import "../../../../../../scripts/register-source-modules.mjs";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { registerHooks } from "node:module";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { pointerDayIndex, timelineDates } from "./timeline.ts";

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

test("overview counters gain emphasis without widening cards or moving comparison", () => {
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
  assert.match(overview, /w-\[46%\].*sm:w-\[30%\].*md:w-\[20%\]/);
  assert.match(overview, /bg-primary text-primary-foreground/);
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
