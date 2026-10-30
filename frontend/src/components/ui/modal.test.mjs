import "../../../scripts/register-source-modules.mjs";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test, { after, afterEach, before, beforeEach, describe } from "node:test";
import { fileURLToPath } from "node:url";
import { createElement, createRef, Fragment, StrictMode } from "react";
import { renderToStaticMarkup } from "react-dom/server";

// Real frontend modules only. SSR does not emulate dialog/focus/browser lifecycle APIs.

const { Modal } = await import("./modal.tsx");
const { createModalMediaSuspension } = await import("../../hooks/use-modal-media-suspension.ts");
const { acquireModalMediaSuspension, isModalMediaSuspended } = await import(
  "../../hooks/use-modal-media-suspension.ts"
);
const { isVideoBlockedByModal } = await import("../../lib/modal-media-scope.ts");
const { playVideoWithActiveDocument } = await import("../../lib/video-playback.ts");
const { createModalScrollLock } = await import("../../hooks/use-modal-scroll-lock.ts");
const { PostReportModal } = await import(
  "../../app/app/community/[slug]/post/[id]/components/post-report-modal.tsx"
);
const { postReportSchema, toPostReportPayload } = await import(
  "../../app/app/community/[slug]/post/[id]/use-form.tsx"
);

describe("native Modal close veto in Chrome", {
  skip: !process.env.PLAYWRIGHT_MODULE && "Set PLAYWRIGHT_MODULE to an installed Playwright",
}, () => {
  let browser;
  let page;
  let harness;
  let errors;
  before(async () => {
    const require = createRequire(import.meta.url);
    const backendRequire = createRequire(
      new URL("../../../../backend/package.json", import.meta.url),
    );
    const { build } = createRequire(backendRequire.resolve("tsx/package.json"))("esbuild");
    harness = await build({
      stdin: {
        contents: `
          import React, { useRef, useState } from 'react';
          import { createRoot } from 'react-dom/client';
          import { flushSync } from 'react-dom';
          import { Modal } from './src/components/ui/modal';
          let props = { dismissible: true, dismissOnBackdrop: true };
          window.closeRequests = 0;
          window.closeResult = false;
          window.nativeCloseEvents = 0;
          document.addEventListener('close', () => window.nativeCloseEvents++, true);
          function Harness(options) {
            const [open, setOpen] = useState(true);
            const initialFocusRef = useRef(null);
            const returnFocusRef = useRef(document.getElementById('opener'));
            window.setOpen = value => flushSync(() => setOpen(value));
            return <Modal {...options} open={open} labelledBy="title"
              initialFocusRef={initialFocusRef} returnFocusRef={returnFocusRef}
              onClose={() => {
                window.closeRequests++;
                if (window.closeResult !== false) setOpen(false);
                return window.closeResult;
              }}>
              <section><h2 id="title">Draft</h2>
                <textarea id="editor" ref={initialFocusRef} defaultValue="Unsaved draft"/>
              </section>
            </Modal>;
          }
          const root = createRoot(document.getElementById('root'));
          window.update = patch => {
            props = { ...props, ...patch };
            flushSync(() => root.render(<React.StrictMode><Harness {...props}/></React.StrictMode>));
          };
          window.update({});
        `,
        resolveDir: fileURLToPath(new URL("../../../", import.meta.url)),
        loader: "jsx",
      },
      bundle: true,
      write: false,
      platform: "browser",
      define: { "process.env.NODE_ENV": '"production"' },
    });
    const { chromium } = require(process.env.PLAYWRIGHT_MODULE);
    browser = await chromium.launch({ channel: "chrome", headless: true });
  });
  after(async () => browser?.close());
  beforeEach(async () => {
    page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.setContent(`<style>
      body{margin:0}dialog{margin:0;width:100vw;height:100dvh;max-width:none;max-height:none;border:0;padding:0}
      section{margin:100px 20px;padding:20px;background:white}
      </style><button id="opener">Open</button><div id="root"></div>`);
    await page.locator("#opener").focus();
    await page.addScriptTag({ content: harness.outputFiles[0].text });
    await page.locator("dialog[open]").waitFor();
  });
  afterEach(async () => {
    await page?.close();
    assert.deepEqual(errors, []);
  });
  const dismiss = async (kind) => {
    if (kind === "Escape") {
      // Refresh native CloseWatcher user activation as an actual draft interaction would.
      if (await page.locator("dialog[open]").count()) await page.locator("#editor").click();
      await page.keyboard.press("Escape");
    } else await page.mouse.click(5, 5);
    await page.evaluate(
      () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))),
    );
  };
  const requests = () => page.evaluate(() => window.closeRequests);
  const settleClose = () => page.waitForFunction(() => window.nativeCloseEvents === 1);

  for (const kind of ["Escape", "backdrop"]) {
    test(`${kind}: repeated false permits retry; true blocks duplicates and preserves focus lifecycle`, async () => {
      for (let count = 1; count <= 2; count++) {
        await page.locator("#editor").focus();
        await dismiss(kind);
        assert.equal(await requests(), count);
        assert.equal(await page.locator("dialog").evaluate((dialog) => dialog.open), true);
        assert.equal(await page.evaluate(() => document.body.style.overflow), "hidden");
        assert.equal(await page.locator("#editor").inputValue(), "Unsaved draft");
        if (kind === "Escape") {
          assert.equal(await page.evaluate(() => document.activeElement.id), "editor");
        }
      }
      await page.evaluate(() => {
        window.closeResult = true;
      });
      await dismiss(kind);
      await settleClose();
      assert.equal(await requests(), 3);
      if (kind === "Escape") {
        assert.equal(await page.evaluate(() => document.activeElement.id), "opener");
      }
      assert.equal(await page.evaluate(() => document.body.style.overflow), "");
      await dismiss("Escape");
      await dismiss("backdrop");
      assert.equal(await requests(), 3);
      await page.evaluate(() => {
        window.closeResult = false;
        window.setOpen(true);
      });
      await dismiss(kind);
      assert.equal(await requests(), 4);
      assert.equal(await page.locator("dialog").evaluate((dialog) => dialog.open), true);
    });
  }

  test("legacy void close stays deduplicated through the native close event", async () => {
    await page.evaluate(() => {
      window.closeResult = undefined;
    });
    await dismiss("Escape");
    await dismiss("Escape");
    await dismiss("backdrop");
    assert.equal(await requests(), 1);
    await settleClose();
    assert.equal(await requests(), 1);
  });

  test("dismissible and backdrop guards still block requests without consuming the retry", async () => {
    await page.evaluate(() => window.update({ dismissible: false }));
    await dismiss("Escape");
    await dismiss("backdrop");
    assert.equal(await requests(), 0);
    await page.evaluate(() => window.update({ dismissible: true, dismissOnBackdrop: false }));
    await dismiss("backdrop");
    assert.equal(await requests(), 0);
    await dismiss("Escape");
    assert.equal(await requests(), 1);
    await page.evaluate(() => window.update({ dismissOnBackdrop: true }));
    await dismiss("backdrop");
    assert.equal(await requests(), 2);
  });
});

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

test("ownership puro de suspensao de midia: primeira modal pausa e ultima libera", () => {
  const states = [];
  const acquire = createModalMediaSuspension((suspended) => {
    states.push(suspended);
  });
  const releaseA = acquire();
  const releaseB = acquire();
  assert.deepEqual(states, [true]);
  releaseA();
  assert.deepEqual(states, [true]);
  releaseB();
  assert.deepEqual(states, [true, false]);
});

// Isolated DOM/media adapters exercise real suspension code; browser smoke covers native media.
const mediaDocument = (t) => {
  const target = new EventTarget();
  const attributes = new Map();
  const videos = [];
  target.visibilityState = "visible";
  target.hasFocus = () => true;
  target.documentElement = {
    getAttribute: (key) => attributes.get(key) ?? null,
    setAttribute: (key, value) => attributes.set(key, value),
    removeAttribute: (key) => attributes.delete(key),
  };
  target.querySelectorAll = () => videos;
  for (const [key, value] of Object.entries({
    document: target,
    window: { setTimeout: () => 0 },
  })) {
    const previous = Object.getOwnPropertyDescriptor(globalThis, key);
    Object.defineProperty(globalThis, key, { configurable: true, value });
    t.after(() => {
      if (previous) Object.defineProperty(globalThis, key, previous);
      else delete globalThis[key];
    });
  }
  const video = (options = {}) => {
    const attrs = new Map();
    const media = {
      nodeName: "VIDEO",
      ownerDocument: target,
      paused: false,
      ended: false,
      muted: true,
      volume: 0.4,
      currentTime: 12,
      pauses: 0,
      plays: 0,
      getAttribute: (key) => attrs.get(key) ?? null,
      setAttribute: (key, value) => attrs.set(key, value),
      removeAttribute: (key) => attrs.delete(key),
      pause() {
        this.paused = true;
        this.pauses++;
      },
      async play() {
        this.plays++;
        this.paused = false;
      },
      ...options,
    };
    videos.push(media);
    return media;
  };
  const emit = (type, media) => {
    const event = new Event(type);
    Object.defineProperty(event, "target", { value: media });
    target.dispatchEvent(event);
  };
  return { target, video, emit, root: (...members) => ({ contains: (v) => members.includes(v) }) };
};

test("modal pausa qualquer video de fundo sem alterar audio/tempo; preview continua permitido", async (t) => {
  const { target, video, root } = mediaDocument(t);
  const background = video({ muted: false });
  const manuallyPaused = video({ paused: true });
  const preview = video();
  const release = acquireModalMediaSuspension(target, root(preview));
  assert.equal(background.paused, true);
  assert.equal(background.pauses, 1);
  assert.equal(manuallyPaused.pauses, 0);
  assert.equal(preview.paused, false);
  assert.equal(await playVideoWithActiveDocument(background), false);
  assert.equal(background.plays, 0);
  assert.equal(await playVideoWithActiveDocument(preview), true);
  release();
  assert.equal(isModalMediaSuspended(target), false);
  assert.equal(background.paused, true);
  assert.equal(background.currentTime, 12);
  assert.equal(background.muted, false);
  assert.equal(background.volume, 0.4);
  assert.equal(manuallyPaused.paused, true);
});

test("captura play/playing tardios inclusive de videos novos e limpa listeners ao fechar", (t) => {
  const { target, video, root, emit } = mediaDocument(t);
  const release = acquireModalMediaSuspension(target, root());
  const lateVideo = video();
  emit("play", lateVideo);
  assert.equal(lateVideo.paused, true);
  lateVideo.paused = false;
  emit("playing", lateVideo);
  assert.equal(lateVideo.paused, true);
  release();
  lateVideo.paused = false;
  emit("play", lateVideo);
  emit("playing", lateVideo);
  assert.equal(lateVideo.paused, false);
});

test("modal aberta durante promessa de play impede retomada ao resolver", async (t) => {
  const { target, video, root } = mediaDocument(t);
  let finishPlay;
  const background = video({
    paused: true,
    play: () =>
      new Promise((resolve) => {
        finishPlay = resolve;
      }),
  });
  const pending = playVideoWithActiveDocument(background);
  const release = acquireModalMediaSuspension(target, root());
  background.paused = false;
  finishPlay();
  assert.equal(await pending, false);
  assert.equal(background.paused, true);
  release();
});

test("modal aninhada bloqueia preview anterior e cleanup fora de ordem nao libera o fundo", (t) => {
  const { target, video, root } = mediaDocument(t);
  const background = video();
  const previewA = video();
  const releaseA = acquireModalMediaSuspension(target, root(previewA));
  const previewB = video();
  const releaseB = acquireModalMediaSuspension(target, root(previewB));
  assert.equal(previewA.paused, true);
  assert.equal(isVideoBlockedByModal(previewA), true);
  assert.equal(isVideoBlockedByModal(previewB), false);
  releaseA();
  releaseA();
  assert.equal(isModalMediaSuspended(target), true);
  assert.equal(isVideoBlockedByModal(background), true);
  releaseB();
  assert.equal(isModalMediaSuspended(target), false);
  const releaseReopened = acquireModalMediaSuspension(target, root(previewA));
  releaseB();
  assert.equal(isVideoBlockedByModal(previewB), true);
  assert.equal(isVideoBlockedByModal(previewA), false);
  releaseReopened();
});

test("fechar modal filha libera apenas o preview da modal pai ainda aberta", (t) => {
  const { target, video, root } = mediaDocument(t);
  const preview = video();
  const background = video();
  const releaseParent = acquireModalMediaSuspension(target, root(preview));
  const releaseChild = acquireModalMediaSuspension(target, root());
  releaseChild();
  assert.equal(isVideoBlockedByModal(preview), false);
  assert.equal(isVideoBlockedByModal(background), true);
  releaseParent();
});
