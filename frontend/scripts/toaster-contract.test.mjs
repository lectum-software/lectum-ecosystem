import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire, registerHooks } from "node:module";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";

const layoutUrl = new URL("../src/app/layout.tsx", import.meta.url);
const app = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8")).name;
const source = readFileSync(layoutUrl, "utf8");
const ast = ts.createSourceFile(
  layoutUrl.href,
  source,
  ts.ScriptTarget.Latest,
  true,
  ts.ScriptKind.TSX,
);
const hosts = [];
const visit = (node) => {
  if (ts.isJsxSelfClosingElement(node) && node.tagName.getText(ast) === "Toaster") hosts.push(node);
  ts.forEachChild(node, visit);
};
visit(ast);
assert.equal(hosts.length, 1, "Um único host de avisos por layout");

// Render the original JSX host with actual Sonner/React, without loading app providers.
const loader = registerHooks({
  load(url, context, nextLoad) {
    if (url !== layoutUrl.href) return nextLoad(url, context);
    return {
      format: "commonjs",
      shortCircuit: true,
      source: ts.transpileModule(
        `import { Toaster } from 'sonner'; export const host = () => (${hosts[0].getText(ast)});`,
        { compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS } },
      ).outputText,
    };
  },
});
let host;
try {
  ({ host } = createRequire(import.meta.url)(fileURLToPath(layoutUrl)));
} finally {
  loader.deregister();
}

test("região real de notificações usa PT-BR", () => {
  assert.equal(host().props.containerAriaLabel, "Notificações");
  const html = renderToStaticMarkup(host());
  assert.ok(html.includes('aria-label="Notificações alt+T"'));
  assert.ok(!html.includes('aria-label="Notifications'));
});

test("nome acessível de fechar fica na opção consumida pelo Sonner", () => {
  assert.equal(host().props.toastOptions?.closeButtonAriaLabel, "Fechar notificação");
});

test("preserva posição, aparência, fechamento, duração e atalho anteriores", () => {
  const { props } = host();
  assert.equal(props.position, "top-right");
  assert.equal(props.richColors, true);
  assert.equal(props.closeButton, app === "admin" ? true : undefined);
  assert.equal(props.duration, undefined);
  assert.equal(props.hotkey, undefined);
  assert.equal(props.toastOptions?.duration, undefined);
});
