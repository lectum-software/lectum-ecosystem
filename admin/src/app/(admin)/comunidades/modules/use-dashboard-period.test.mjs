import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { createRequire, registerHooks } from "node:module";
import path from "node:path";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";
import ts from "typescript";

const require = createRequire(import.meta.url);
const { createElement, useState } = require("react");
const { renderToStaticMarkup } = require("react-dom/server");
const root = fileURLToPath(new URL("../../../../..", import.meta.url));
const sourceRoot = path.join(root, "src");

// Compile the actual local TS sources. React, hooks and validators are not replaced.
const loader = registerHooks({
  resolve(specifier, context, nextResolve) {
    const source = specifier.startsWith("@/")
      ? path.join(sourceRoot, specifier.slice(2))
      : specifier.startsWith(".") && context.parentURL?.startsWith("file:")
        ? path.resolve(path.dirname(fileURLToPath(context.parentURL)), specifier)
        : null;
    if (source?.startsWith(`${sourceRoot}${path.sep}`)) {
      const resolved = [
        source,
        `${source}.ts`,
        `${source}.tsx`,
        `${source}/index.ts`,
        `${source}/index.tsx`,
      ].find((candidate) => /\.tsx?$/.test(candidate) && existsSync(candidate));
      if (resolved) return nextResolve(resolved, context);
    }
    return nextResolve(specifier, context);
  },
  load(url, context, nextLoad) {
    if (!url.startsWith(pathToFileURL(`${sourceRoot}/`).href) || !/\.tsx?$/.test(url)) {
      return nextLoad(url, context);
    }
    const { outputText } = ts.transpileModule(readFileSync(new URL(url), "utf8"), {
      compilerOptions: {
        jsx: ts.JsxEmit.ReactJSX,
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
      },
    });
    return { format: "commonjs", source: outputText, shortCircuit: true };
  },
});
const { useCommunityDashboardPeriod } = require(
  fileURLToPath(new URL("./use-dashboard-period.ts", import.meta.url)),
);
const { getCommunityDashboardPeriodLabel } = require(
  fileURLToPath(new URL("./period-support.ts", import.meta.url)),
);

// React's render-phase updates exercise the real hook state/handlers without a DOM or API.
const run = (steps = []) => {
  const states = [];
  const results = [];
  function Probe() {
    const period = useCommunityDashboardPeriod();
    const [step, setStep] = useState(0);
    states.push({
      applied: period.appliedPeriod,
      selected: period.periodControls.period,
      query: period.queryInput,
      draft: period.periodControls.displayRange,
      valid: period.validRange,
      error: period.periodControls.rangeError,
      label: getCommunityDashboardPeriodLabel(period.appliedPeriod),
    });
    if (step < steps.length) {
      results.push(steps[step](period));
      setStep(step + 1);
    }
    return null;
  }
  renderToStaticMarkup(createElement(Probe));
  return { current: states.at(-1), states, results };
};
const change = (field, value) => (p) => p.periodControls.onDateChange(field, value);
const commit = (p) => p.commitDraftRange();
const preset = (value) => (p) => p.periodControls.onPeriodChange(value);
const validDates = [change("from", "2026-09-01"), change("to", "2026-09-03")];

test("all começa com consulta válida mesmo sem início no rascunho", () => {
  const { current } = run();
  assert.equal(current.draft.from, "");
  assert.equal(current.valid, true);
  assert.deepEqual(current.query, { period: "all" });
});

test("primeira edição incompleta não desmonta dados nem muda consulta/rótulo", () => {
  const { current } = run([change("to", "2026-09-10")]);
  assert.equal(current.selected, "custom");
  assert.equal(current.applied, "all");
  assert.equal(current.valid, true);
  assert.equal(current.label, "Todo o período");
  assert.deepEqual(current.query, { period: "all" });
});

test("commit incompleto mostra erro local e mantém consulta anterior", () => {
  const { current, results } = run([change("to", "2026-09-10"), commit]);
  assert.equal(results.at(-1), false);
  assert.match(current.error, /^Informe um período personalizado completo/);
  assert.equal(current.valid, true);
  assert.deepEqual(current.query, { period: "all" });
});

test("intervalo invertido não é aplicado", () => {
  const { current, results } = run([
    change("from", "2026-09-03"),
    change("to", "2026-09-01"),
    commit,
  ]);
  assert.equal(results.at(-1), false);
  assert.equal(current.applied, "all");
  assert.equal(current.valid, true);
});

test("edições válidas alteram a consulta somente no commit", () => {
  const { current, states, results } = run([...validDates, commit]);
  assert.ok(states.slice(0, -1).every((state) => state.query.period === "all"));
  assert.equal(results.at(-1), true);
  assert.equal(current.applied, "custom");
  assert.equal(current.error, null);
  assert.deepEqual(current.query, { period: "custom", from: "2026-09-01", to: "2026-09-03" });
});

test("erro após intervalo válido mantém exatamente o último período aplicado", () => {
  const { current } = run([...validDates, commit, change("from", ""), commit]);
  assert.equal(current.valid, true);
  assert.equal(current.draft.from, "");
  assert.notEqual(current.error, null);
  assert.deepEqual(current.query, { period: "custom", from: "2026-09-01", to: "2026-09-03" });
});

test("presets substituem custom mesmo com callback síncrono de applyRange", () => {
  for (const next of ["all", "today", "week", "month", "year", "7d", "30d", "90d"]) {
    const { current } = run([...validDates, commit, change("from", ""), commit, preset(next)]);
    assert.equal(current.selected, next);
    assert.equal(current.applied, next);
    assert.equal(current.error, null);
    assert.deepEqual(current.query, { period: next });
  }
});

test("blur sem nova edição conserva preset e erro não sobrevive ao próximo ajuste", () => {
  assert.equal(run([preset("month"), commit]).current.applied, "month");
  const { current } = run([change("to", ""), commit, change("to", "2026-09-03")]);
  assert.equal(current.error, null);
  assert.deepEqual(current.query, { period: "all" });
});

test("cliente usa o hook real para query, render e rótulo aplicado (wiring estático)", () => {
  const source = readFileSync(new URL("../client.tsx", import.meta.url), "utf8");
  assert.match(source, /useCommunityDashboardPeriod\(\)/);
  assert.match(source, /useAdminCommunitiesDashboard\(queryInput, \{ enabled: validRange \}\)/);
  assert.match(source, /getCommunityDashboardPeriodLabel\(appliedPeriod\)/);
  assert.match(source, /periodControls=\{periodControls\}/);
  assert.match(source, /onRetry=\{\(\) => periodControls.onPeriodChange\("all"\)\}/);
  assert.doesNotMatch(source, /getCommunityDashboardPeriodLabel\(selectedPeriod\)/);
});

test.after(() => loader.deregister());
