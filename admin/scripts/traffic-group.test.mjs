import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire, registerHooks } from "node:module";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";

const source = new URL(
  "../src/app/(admin)/psicologos/components/traffic-metrics.tsx",
  import.meta.url,
);
const support = new URL("../modules/dashboard-support.ts", source);
const utils = new URL("../src/lib/utils.ts", import.meta.url);
const dates = new URL("../src/lib/date-period.ts", import.meta.url);
const baseline = process.argv.find((arg) => arg.startsWith("--baseline="))?.slice(11);
// Real modules and React; type-only API imports disappear in TypeScript compilation.
const hooks = registerHooks({
  resolve(specifier, context, next) {
    const aliases = {
      "@/lib/utils": utils,
      "@/lib/date-period": dates,
      "../modules/dashboard-support": support,
    };
    return next(aliases[specifier] ? fileURLToPath(aliases[specifier]) : specifier, context);
  },
  load(url, context, next) {
    if (![source.href, support.href, utils.href, dates.href].includes(url))
      return next(url, context);
    const input = readFileSync(url === source.href && baseline ? baseline : new URL(url), "utf8");
    return {
      format: "commonjs",
      source: ts.transpileModule(input, {
        fileName: fileURLToPath(url),
        compilerOptions: {
          jsx: ts.JsxEmit.ReactJSX,
          module: ts.ModuleKind.CommonJS,
          target: ts.ScriptTarget.ES2022,
        },
      }).outputText,
      shortCircuit: true,
    };
  },
});
let buildRows, Breakdown;
try {
  ({
    buildTrafficSourceDisplayRows: buildRows,
    TrafficSourceWhatsappClickActorBreakdown: Breakdown,
  } = createRequire(import.meta.url)(fileURLToPath(source)));
} finally {
  hooks.deregister();
}
const item = (id, author, other, extra = {}) =>
  Object.freeze({
    id,
    label: id,
    description: "Fonte unitária",
    badge: null,
    considered_count: 1,
    whatsapp_clicks: author + other,
    percentage: 50,
    profile_views: 0,
    sessions: 0,
    platform_metrics: null,
    whatsapp_click_actor_breakdown: Object.freeze({
      author_clicks: author,
      other_users_clicks: other,
      author_percentage: 99,
      other_users_percentage: 99,
      source: "engajamento",
    }),
    ...extra,
  });
for (const ids of [
  ["community_post_text", "community_reply_video"],
  ["explore", "search_filters"],
]) {
  test(`soma contagens, não percentuais nem primeira fonte: ${ids.join(",")}`, () => {
    const input = Object.freeze([item(ids[0], 1, 2), item(ids[1], 2, 5)]);
    const [group] = buildRows(input);
    assert.equal(group.whatsapp_clicks, 10);
    assert.deepEqual(group.whatsapp_click_actor_breakdown, {
      author_clicks: 3,
      other_users_clicks: 7,
      author_percentage: 30,
      other_users_percentage: 70,
      source: "engajamento",
    });
    assert.equal(group.children.length, 2);
    assert.ok(group.children.every((child) => input.includes(child)));
    const html = renderToStaticMarkup(createElement(Breakdown, { source: group }));
    assert.ok(html.includes("Autor do conteúdo 3 (30%)"));
    assert.ok(html.includes("Outros usuários 7 (70%)"));
    assert.equal(input[0].whatsapp_click_actor_breakdown.author_percentage, 99);
  });
}
test("resultado independe da ordem das fontes", () => {
  const input = [item("community_post_text", 1, 2), item("community_reply_video", 2, 5)];
  assert.deepEqual(
    buildRows(input)[0].whatsapp_click_actor_breakdown,
    buildRows([...input].reverse())[0].whatsapp_click_actor_breakdown,
  );
});
test("fonte com cliques não classificados torna agregado indisponível", () => {
  const [group] = buildRows([
    item("community_reply_text", 0, 10),
    item("community_top_mentors", 0, 1, { whatsapp_click_actor_breakdown: null }),
  ]);
  assert.equal(group.whatsapp_clicks, 11);
  assert.equal(group.whatsapp_click_actor_breakdown, null);
  assert.equal(renderToStaticMarkup(createElement(Breakdown, { source: group })), "");
});
test("origem sem classificação e com zero cliques não introduz lacuna", () => {
  const [group] = buildRows([
    item("community_reply_text", 2, 3),
    item("community_top_mentors", 0, 0, { whatsapp_click_actor_breakdown: null }),
  ]);
  assert.equal(group.whatsapp_click_actor_breakdown.author_percentage, 40);
  assert.equal(group.whatsapp_click_actor_breakdown.other_users_percentage, 60);
});
test("ausência total de classificação continua ausente", () => {
  const [group] = buildRows([
    item("explore", 0, 0, { whatsapp_click_actor_breakdown: null }),
    item("search_filters", 0, 0, { whatsapp_click_actor_breakdown: null }),
  ]);
  assert.equal(group.whatsapp_click_actor_breakdown, null);
});
for (const extra of [
  { whatsapp_clicks: 99 },
  { whatsapp_clicks: -1 },
  { whatsapp_clicks: Number.NaN },
  { whatsapp_clicks: Number.MAX_SAFE_INTEGER + 1 },
]) {
  test(`contagens inválidas não criam atribuição: ${String(extra.whatsapp_clicks)}`, () => {
    const [group] = buildRows([item("community_post_text", 1, 2, extra)]);
    assert.equal(group.whatsapp_click_actor_breakdown, null);
  });
}
test("zero conhecido conserva porcentagens zero", () => {
  const [group] = buildRows([item("community_post_text", 0, 0)]);
  assert.equal(group.whatsapp_click_actor_breakdown.author_percentage, 0);
  assert.equal(group.whatsapp_click_actor_breakdown.other_users_percentage, 0);
});
test("fontes independentes e lista vazia preservadas", () => {
  const single = item("favorites", 1, 2);
  const [row] = buildRows([single]);
  assert.equal(row.id, single.id);
  assert.equal(row.whatsapp_click_actor_breakdown, single.whatsapp_click_actor_breakdown);
  assert.deepEqual(buildRows([]), []);
});
