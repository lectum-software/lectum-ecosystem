import assert from "node:assert/strict";
import { existsSync, readFileSync, statSync } from "node:fs";
import { createRequire, registerHooks } from "node:module";
import { after, test } from "node:test";
import { fileURLToPath } from "node:url";
import ts from "typescript";

// Compile only actual Admin source; dependencies keep Node's normal resolution.
// Like the controllers regression, CJS keeps the hook/provider on one React context.
const sourceRoot = new URL("../", import.meta.url);
const loader = registerHooks({
  resolve(specifier, context, nextResolve) {
    if (
      context.parentURL?.startsWith(sourceRoot.href) &&
      (specifier.startsWith("@/") || specifier.startsWith("."))
    ) {
      const base = specifier.startsWith("@/") ? sourceRoot : context.parentURL;
      const relative = specifier.startsWith("@/") ? specifier.slice(2) : specifier;
      for (const suffix of ["", ".ts", ".tsx", "/index.ts", "/index.tsx"]) {
        const url = new URL(`${relative}${suffix}`, base);
        if (url.href.startsWith(sourceRoot.href) && existsSync(url) && statSync(url).isFile()) {
          return { shortCircuit: true, url: url.href };
        }
      }
    }
    return nextResolve(specifier, context);
  },
  load(url, context, nextLoad) {
    if (!url.startsWith(sourceRoot.href) || !/\.tsx?$/.test(url)) {
      return nextLoad(url, context);
    }
    const { outputText } = ts.transpileModule(readFileSync(new URL(url), "utf8"), {
      fileName: fileURLToPath(url),
      compilerOptions: {
        esModuleInterop: true,
        jsx: ts.JsxEmit.ReactJSX,
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
      },
    });
    return { format: "commonjs", source: outputText, shortCircuit: true };
  },
});
after(() => loader.deregister());

const require = createRequire(import.meta.url);
const { createElement } = require("react");
const { renderToStaticMarkup } = require("react-dom/server");
const { QueryClient, QueryClientProvider } = require("@tanstack/react-query");
const loadSource = (relativePath) => require(fileURLToPath(new URL(relativePath, import.meta.url)));
const { adminCommunitiesKeys } = loadSource("../api/cache/keys.ts");
const { cleanReportsParams } = loadSource("../api/req/communities/params.ts");
const { ReportsTab } = loadSource("../app/(admin)/comunidades/[slug]/views/reports-tab.tsx");

test("reports omit blank dates without changing pagination or filters", () => {
  assert.deepEqual(
    cleanReportsParams({ from: "", to: "", limit: 10, page: 1, status: "all", type: "all" }),
    { limit: 10, page: 1, status: "all", type: "all" },
  );
  assert.deepEqual(cleanReportsParams({}), {});
});

test("reports preserve custom ranges and every psychologist filter identifier", () => {
  for (const type of [
    "verified_psychologist_post",
    "unverified_psychologist_post",
    "verified_psychologist_reply",
    "unverified_psychologist_reply",
  ]) {
    const input = {
      from: "2026-09-01",
      to: "2026-09-11",
      limit: 10,
      page: 2,
      status: "dismissed",
      type,
    };
    assert.deepEqual(cleanReportsParams(input), input);
  }
});

test("reports do not silently discard a partial or invalid custom range", () => {
  assert.deepEqual(cleanReportsParams({ from: "2026-09-01", to: "" }), { from: "2026-09-01" });
  assert.deepEqual(cleanReportsParams({ from: "", to: "not-a-date" }), { to: "not-a-date" });
});

// Unit tests of the real React/QueryCache render states, not HTTP integration.
const emptyResult = {
  cards: [{ id: "total", label: "Total de denúncias", source: "conteudo", value: 0 }],
  count: 0,
  data: [],
  filters: { statuses: [], types: [] },
  page: 1,
  pages: 1,
};

const renderState = (status, data) => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, retryOnMount: false, staleTime: Infinity } },
  });
  const queryKey = adminCommunitiesKeys.reports("discardable-reports", {
    from: "",
    to: "",
    limit: 10,
    page: 1,
    status: "all",
    type: "all",
  });
  client
    .getQueryCache()
    .build(client, { queryKey })
    .setState({
      data,
      dataUpdatedAt: data ? Date.now() : 0,
      error: status === "error" ? new Error("Local render-state regression") : null,
      fetchStatus: "idle",
      status,
    });
  try {
    return renderToStaticMarkup(
      createElement(
        QueryClientProvider,
        { client },
        createElement(ReportsTab, { slug: "discardable-reports" }),
      ),
    );
  } finally {
    client.clear();
  }
};

test("a failed reports query shows retry, not zero metrics or an empty result", () => {
  const html = renderState("error");
  assert.match(html, /Tentar novamente/);
  assert.doesNotMatch(html, /Total de denúncias|Nenhuma denúncia encontrada|Todos \(0\)/);
});

test("a failed refresh does not present stale empty data as a successful result", () => {
  const html = renderState("error", emptyResult);
  assert.match(html, /Tentar novamente/);
  assert.doesNotMatch(html, /Total de denúncias|Nenhuma denúncia encontrada|Página anterior/);
});

test("a pending query does not claim zero metrics or an empty result", () => {
  assert.doesNotMatch(renderState("pending"), /Total de denúncias|Nenhuma denúncia encontrada/);
});

test("only a successful empty response shows zero metrics and the empty result", () => {
  const html = renderState("success", emptyResult);
  assert.match(html, /Total de denúncias/);
  assert.match(html, /Nenhuma denúncia encontrada/);
  assert.doesNotMatch(html, /Tentar novamente/);
});
