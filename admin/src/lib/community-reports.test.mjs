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
const { ContentTab } = loadSource("../app/(admin)/comunidades/[slug]/views/content-tab.tsx");
const { contentTypeOptions } = loadSource(
  "../app/(admin)/comunidades/[slug]/modules/detail-support.tsx",
);
const { SearchParamsContext } = require("next/dist/shared/lib/hooks-client-context.shared-runtime");

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

const emptyContent = { count: 0, data: [], page: 1, pages: 1, per_page: 10 };
const populatedContent = {
  ...emptyContent,
  count: 1,
  data: [
    {
      author: {
        id: "discardable-author",
        name: "Local render author",
        role: "paciente",
        avatar: null,
        verified: false,
        anonymous: false,
      },
      content_id: "discardable-post",
      content_kind: "patient_post",
      content_kind_label: "Post de paciente",
      created_at: "2026-09-01T12:00:00.000Z",
      excerpt: "Local render content",
      media: null,
      metrics: {
        comments_count: 0,
        downvotes_count: 0,
        reports_count: 0,
        saves_count: 0,
        shares_count: 0,
        upvotes_count: 0,
        views_count: 0,
        whatsapp_clicks_count: 0,
      },
      public_url: "/comunidades/discardable-content/publicacao/discardable-post",
      status: "published",
      title: "Discardable content title",
      type: "post",
    },
  ],
};

const renderContentState = (status, data, type = "all") => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, retryOnMount: false, staleTime: Infinity } },
  });
  const queryKey = adminCommunitiesKeys.content("discardable-content", {
    limit: 10,
    page: 1,
    period: "all",
    q: "",
    sort: "engagement",
    type,
  });
  client
    .getQueryCache()
    .build(client, { queryKey })
    .setState({
      data,
      dataUpdatedAt: data ? Date.now() : 0,
      error: status === "error" ? new Error("Local content render-state regression") : null,
      fetchStatus: status === "pending" ? "fetching" : "idle",
      status,
    });
  try {
    return renderToStaticMarkup(
      createElement(
        QueryClientProvider,
        { client },
        createElement(
          SearchParamsContext.Provider,
          { value: new URLSearchParams({ contentType: type }) },
          createElement(ContentTab, {
            createdAt: "2026-09-01T12:00:00.000Z",
            slug: "discardable-content",
          }),
        ),
      ),
    );
  } finally {
    client.clear();
  }
};

test("content renders every actual offered type selected through the real Next search context", () => {
  assert.deepEqual(
    contentTypeOptions.map(({ id }) => id),
    [
      "all",
      "posts",
      "verified_psychologist_post",
      "unverified_psychologist_post",
      "verified_psychologist_reply",
      "unverified_psychologist_reply",
      "patient_comment",
      "anonymous_post",
    ],
  );
  for (const { id } of contentTypeOptions) {
    assert.match(
      renderContentState("success", emptyContent, id),
      new RegExp(`value="${id}" selected=""`),
    );
  }
});

test("a failed content query shows retry without inventing a zero count", () => {
  const html = renderContentState("error");
  assert.match(html, /Tentar novamente/);
  assert.doesNotMatch(html, /Mostrando|Nenhum conteúdo encontrado|Página anterior/);
});

test("a failed content refresh hides stale empty data and pagination", () => {
  const html = renderContentState("error", emptyContent);
  assert.match(html, /Tentar novamente/);
  assert.doesNotMatch(html, /Mostrando|Nenhum conteúdo encontrado|Página anterior/);
});

test("a failed content refresh hides stale populated cards and counts", () => {
  const html = renderContentState("error", populatedContent);
  assert.match(html, /Tentar novamente/);
  assert.doesNotMatch(html, /Mostrando|Discardable content title|Página anterior/);
});

test("pending content shows loading without claiming an empty result", () => {
  const html = renderContentState("pending");
  assert.match(html, /Carregando dados/);
  assert.doesNotMatch(html, /Mostrando|Nenhum conteúdo encontrado|Página anterior/);
});

test("successful empty content alone shows the genuine zero count and empty result", () => {
  const html = renderContentState("success", emptyContent);
  assert.match(html, /Mostrando 0 de 0 registros/);
  assert.match(html, /Nenhum conteúdo encontrado/);
  assert.doesNotMatch(html, /Tentar novamente|Carregando dados/);
});

test("successful populated content keeps real cards, count and pagination", () => {
  const html = renderContentState("success", populatedContent);
  assert.match(html, /Mostrando 1 de 1 registros/);
  assert.match(html, /Discardable content title/);
  assert.match(html, /Página anterior/);
  assert.doesNotMatch(html, /Nenhum conteúdo encontrado|Tentar novamente|Carregando dados/);
});
