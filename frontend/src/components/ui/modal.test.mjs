import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { registerHooks } from "node:module";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { createElement, createRef, Fragment, StrictMode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";

// Real frontend modules only. SSR does not emulate dialog/focus/browser lifecycle APIs.
const sourceRoot = new URL("../../", import.meta.url);
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

const { Modal } = await import("./modal.tsx");
const { createModalScrollLock } = await import("../../hooks/use-modal-scroll-lock.ts");
const { PostReportModal } = await import(
  "../../app/app/community/[slug]/post/[id]/components/post-report-modal.tsx"
);
const { postReportSchema, toPostReportPayload } = await import(
  "../../app/app/community/[slug]/post/[id]/use-form.tsx"
);

const report = (props = {}) =>
  createElement(PostReportModal, {
    open: true,
    onClose: () => {},
    onSubmit: () => {},
    returnFocusRef: createRef(),
    title: "Denunciar post",
    subject: "Post da comunidade",
    ...props,
  });

test("SSR usa dialog nativo inicialmente fechado, sem simular showModal", () => {
  for (const open of [true, false]) {
    const html = renderToStaticMarkup(report({ open }));
    const dialog = html.match(/^<dialog\b[^>]*>/)?.[0];
    assert.ok(dialog);
    assert.doesNotMatch(dialog, /\sopen(?:=|\s|>)|tabindex=|role="dialog"/);
    assert.match(dialog, /aria-labelledby=/);
  }
});

test("SSR não sobrescreve display none do dialog fechado e conserva backdrop/tokens", () => {
  const html = renderToStaticMarkup(report({ open: false }));
  const className = html.match(/^<dialog\b[^>]*class="([^"]*)"/)?.[1] ?? "";
  const classes = className.split(/\s+/);
  assert.ok(classes.includes("open:grid"));
  for (const unconditional of ["grid", "flex", "block", "inline", "inline-flex"]) {
    assert.equal(classes.includes(unconditional), false);
  }
  assert.ok(classes.includes("backdrop:bg-foreground/55"));
  assert.ok(classes.includes("backdrop:backdrop-blur-md"));
  assert.match(html, /max-h-full[^"]*max-w-\[430px\][^"]*overflow-y-auto/);
});

test("SSR de duas denúncias gera IDs únicos para títulos, labels e campos reais", () => {
  const html = renderToStaticMarkup(createElement(Fragment, null, report(), report()));
  const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map((match) => match[1]);
  assert.equal(ids.length, new Set(ids).size);
  const titles = [...html.matchAll(/<dialog\b[^>]*aria-labelledby="([^"]+)"/g)].map(
    (match) => match[1],
  );
  assert.equal(titles.length, 2);
  assert.notEqual(titles[0], titles[1]);
  for (const id of titles) assert.ok(ids.includes(id));
  for (const [, target] of html.matchAll(/<label\b[^>]*for="([^"]+)"/g)) {
    assert.ok(ids.includes(target));
  }
});

test("SSR mantém fechamento durante envio e desabilita somente a ação Enviar", () => {
  const html = renderToStaticMarkup(report({ disabled: true }));
  const buttons = [...html.matchAll(/<button\b([^>]*)>([\s\S]*?)<\/button>/g)];
  for (const caption of ["Fechar denúncia", "Cancelar", "Enviar denúncia"]) {
    const button = buttons.find((match) => match[0].includes(caption));
    assert.ok(button, caption);
    assert.equal(/\sdisabled=/.test(button[1]), caption === "Enviar denúncia");
  }
});

test("SSR conserva RHF/select nativo e formulário de envio, não method dialog", () => {
  const html = renderToStaticMarkup(report());
  assert.match(html, /<form\b[^>]*noValidate=""/);
  assert.match(html, /<select\b[^>]*name="reason"/);
  assert.match(html, /<option value="spam" selected=""/);
  assert.match(html, /<textarea\b[^>]*name="description"/);
  assert.doesNotMatch(html, /method="dialog"|role="combobox"/);
});

test("SSR de erro conserva campos e alerta dentro da denúncia", () => {
  const html = renderToStaticMarkup(report({ apiError: "Tente novamente mais tarde." }));
  assert.match(html, /Não foi possível enviar/);
  assert.match(html, /Tente novamente mais tarde\./);
  assert.match(html, /name="reason"/);
  assert.match(html, /name="description"/);
  const feedback = html.match(/<div\b[^>]*id="[^"]+-report-error"[^>]*>/)?.[0] ?? "";
  assert.match(feedback, /tabindex="-1"/);
  assert.match(feedback, /focus-visible:outline-2/);
});

test("SSR da primitive em StrictMode não acessa document nem abre diálogo no servidor", () => {
  const html = renderToStaticMarkup(
    createElement(
      StrictMode,
      null,
      createElement(
        Modal,
        {
          open: true,
          labelledBy: "title",
          initialFocusRef: createRef(),
          returnFocusRef: createRef(),
          onClose: () => {},
        },
        createElement("h2", { id: "title" }, "Título"),
      ),
    ),
  );
  assert.match(html, /^<dialog\b/);
  assert.doesNotMatch(html.match(/^<dialog\b[^>]*>/)?.[0] ?? "", /\sopen=/);
});

test("schema e payload reais da denúncia preservam motivos, limites e trim", () => {
  for (const reason of ["spam", "abuse", "self_harm", "privacy", "other"]) {
    const values = postReportSchema.parse({ reason, description: "  Detalhes  " });
    assert.deepEqual(toPostReportPayload(values), { reason, description: "Detalhes" });
  }
  assert.equal(postReportSchema.safeParse({ reason: "unknown" }).success, false);
  assert.equal(
    postReportSchema.safeParse({ reason: "spam", description: "a".repeat(501) }).success,
    false,
  );
  assert.deepEqual(toPostReportPayload({ reason: "spam", description: "  " }), {
    reason: "spam",
    description: undefined,
  });
});

test("ownership puro: primeira aquisição aplica uma vez; último dono restaura", () => {
  let acquisitions = 0;
  let releases = 0;
  const acquire = createModalScrollLock(() => {
    acquisitions++;
    return () => releases++;
  });
  const releaseA = acquire();
  const releaseB = acquire();
  assert.equal(acquisitions, 1);
  releaseA();
  assert.equal(releases, 0);
  releaseB();
  assert.equal(releases, 1);
});

test("ownership puro: cleanup duplicado não libera o lock de outro dono", () => {
  let locked = false;
  const acquire = createModalScrollLock(() => {
    locked = true;
    return () => {
      locked = false;
    };
  });
  const releaseA = acquire();
  const releaseB = acquire();
  releaseB();
  releaseB();
  assert.equal(locked, true);
  releaseA();
  assert.equal(locked, false);
});

test("ownership puro: release antigo não afeta reabertura nem replay de aquisição", () => {
  let acquisitions = 0;
  let releases = 0;
  const acquire = createModalScrollLock(() => {
    acquisitions++;
    return () => releases++;
  });
  const releaseFirst = acquire();
  releaseFirst();
  const releaseReopened = acquire();
  releaseFirst();
  assert.equal(acquisitions, 2);
  assert.equal(releases, 1);
  releaseReopened();
  assert.equal(releases, 2);
});

test("ownership puro: instâncias independentes não compartilham donos", () => {
  const released = [];
  const first = createModalScrollLock(() => () => released.push("first"));
  const second = createModalScrollLock(() => () => released.push("second"));
  const releaseFirst = first();
  const releaseSecond = second();
  releaseFirst();
  assert.deepEqual(released, ["first"]);
  releaseSecond();
  assert.deepEqual(released, ["first", "second"]);
});
