import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { registerHooks } from "node:module";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { createElement, Fragment, StrictMode } from "react";
import { renderToReadableStream, renderToString } from "react-dom/server";
import ts from "typescript";

// SSR nativo com módulos reais do frontend; não substitui a validação no navegador.
const sourceRoot = new URL("../", import.meta.url);
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith("@/") || specifier.startsWith(".")) {
      const base = specifier.startsWith("@/") ? sourceRoot : context.parentURL;
      const path = specifier.startsWith("@/") ? specifier.slice(2) : specifier;
      for (const suffix of ["", ".ts", ".tsx", "/index.ts", "/index.tsx"]) {
        const url = new URL(`${path}${suffix}`, base);
        if (
          /\.tsx?$/.test(url.pathname) &&
          url.href.startsWith(sourceRoot.href) &&
          existsSync(url)
        ) {
          return { shortCircuit: true, url: url.href };
        }
      }
    }
    return nextResolve(specifier, context);
  },
  load(url, context, nextLoad) {
    if (url.startsWith(sourceRoot.href) && /\.tsx?$/.test(url)) {
      const source = ts.transpileModule(readFileSync(new URL(url), "utf8"), {
        fileName: fileURLToPath(url),
        compilerOptions: {
          jsx: ts.JsxEmit.ReactJSX,
          module: ts.ModuleKind.ESNext,
          target: ts.ScriptTarget.ES2022,
        },
      }).outputText;
      return { format: "module", shortCircuit: true, source };
    }
    return nextLoad(url, context);
  },
});

const {
  getAuthTokenServerSnapshot,
  getAuthTokenSnapshot,
  subscribeAuthToken,
  useAuthTokenPresence,
} = await import("./use-auth-token-presence.ts");

const Presence = () => {
  const hasToken = useAuthTokenPresence();
  return createElement("p", { "data-token-present": hasToken }, hasToken ? "presente" : "ausente");
};

const absentMarkup = '<p data-token-present="false">ausente</p>';

test("snapshot inicial de SSR é booleano false, sem acessar um ambiente browser", () => {
  assert.equal(typeof window, "undefined");
  assert.equal(typeof document, "undefined");
  assert.equal(getAuthTokenServerSnapshot(), false);
  assert.equal(getAuthTokenServerSnapshot(), getAuthTokenSnapshot());
});

test("assinatura no servidor é inerte e seu cleanup pode ser repetido", () => {
  let notifications = 0;
  const cleanup = subscribeAuthToken(() => notifications++);
  cleanup();
  cleanup();
  assert.equal(notifications, 0);
});

test("React SSR real renderiza o hook pelo snapshot ausente", () => {
  assert.equal(renderToString(createElement(Presence)), absentMarkup);
});

test("consumidores simultâneos e renderizações SSR repetidas mantêm o mesmo snapshot", () => {
  const content = createElement(
    StrictMode,
    null,
    createElement(Fragment, null, createElement(Presence), createElement(Presence)),
  );
  assert.equal(renderToString(content), absentMarkup.repeat(2));
  assert.equal(renderToString(content), absentMarkup.repeat(2));
});

test("streaming SSR real usa o mesmo contrato, sem alegar hidratação no browser", async () => {
  const stream = await renderToReadableStream(createElement(Presence));
  assert.equal(await new Response(stream).text(), absentMarkup);
});
