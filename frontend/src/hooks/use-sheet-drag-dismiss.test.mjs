import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { after, afterEach, before, beforeEach, describe, test } from "node:test";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const backendRequire = createRequire(new URL("../../../backend/package.json", import.meta.url));
const { build } = createRequire(backendRequire.resolve("tsx/package.json"))("esbuild");
const harness = await build({
  stdin: {
    contents: `
      import React, { useRef, useState } from 'react';
      import { createRoot } from 'react-dom/client';
      import { flushSync } from 'react-dom';
      import { useSheetDragDismiss } from './src/hooks/use-sheet-drag-dismiss';
      import { Modal } from './src/components/ui/modal';
      let props = { disabled: false, dirty: false };
      window.closeRequests = 0;
      function Harness(options) {
        const [open, setOpen] = useState(true);
        const closeRef = useRef(null);
        const returnFocusRef = useRef(document.getElementById('opener'));
        window.setOpen = value => flushSync(() => setOpen(value));
        const close = () => {
          window.closeRequests++;
          if (options.disabled || (options.dirty && !window.confirm('Discard draft?'))) return;
          setOpen(false);
        };
        const drag = useSheetDragDismiss({ open, disabled: options.disabled, onClose: close });
        return <Modal open={open} onClose={close} dismissible={!options.disabled && !options.dirty}
          initialFocusRef={closeRef} returnFocusRef={returnFocusRef} labelledBy="title">
          <section id="sheet" style={drag.sheetStyle} data-dragging={drag.isDragging}>
            <header id="handle" {...drag.handleProps}>
              <h2 id="title">Discussion</h2>
              <button id="close" ref={closeRef} onClick={close} disabled={options.disabled}>Close</button>
              <a id="link" href="#local">Link</a>
            </header>
            <div id="content"><textarea id="editor" aria-label="Draft" defaultValue="Draft"/><div id="tall"/></div>
          </section>
        </Modal>;
      }
      const root = createRoot(document.getElementById('root'));
      window.update = patch => {
        props = { ...props, ...patch };
        flushSync(() => root.render(<React.StrictMode><Harness {...props}/></React.StrictMode>));
      };
      window.unmount = () => flushSync(() => root.unmount());
      window.update({});
    `,
    resolveDir: fileURLToPath(new URL("../../", import.meta.url)),
    loader: "jsx",
  },
  bundle: true,
  write: false,
  platform: "browser",
  define: { "process.env.NODE_ENV": '"production"' },
});

describe("real sheet gesture and native Modal in Chrome", {
  skip: !process.env.PLAYWRIGHT_MODULE && "Set PLAYWRIGHT_MODULE to an installed Playwright",
}, () => {
  let browser;
  let page;
  let cdp;
  let errors;
  before(async () => {
    const { chromium } = require(process.env.PLAYWRIGHT_MODULE);
    browser = await chromium.launch({ channel: "chrome", headless: true });
  });
  after(async () => browser?.close());
  beforeEach(async () => {
    page = await browser.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true });
    errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.setContent(`<style>
      body{margin:0;height:1800px}dialog{margin:0;width:100vw;max-width:none;height:100dvh;max-height:none;border:0;padding:0}
      #sheet{position:fixed;bottom:0;left:0;right:0;height:500px}
      #handle{height:72px;display:flex;align-items:center;gap:12px}h2{margin:0;width:160px}
      #close{width:60px;height:44px}#content{height:400px;overflow-y:auto;overscroll-behavior:contain}
      #editor{display:block;height:40px}#tall{height:1200px}
      </style><button id="opener">Open</button><div id="root"></div>`);
    await page.locator("#opener").focus();
    await page.addScriptTag({ content: harness.outputFiles[0].text });
    await page.locator("dialog[open]").waitFor();
    cdp = await page.context().newCDPSession(page);
  });
  afterEach(async () => {
    await cdp.detach();
    await page.close();
    assert.deepEqual(errors, []);
  });
  const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const touch = (type, x = 80, y = 380) =>
    cdp.send("Input.dispatchTouchEvent", {
      type,
      touchPoints: type === "touchEnd" || type === "touchCancel" ? [] : [{ x, y }],
    });
  const drag = async (distance, { x = 80, y = 380, horizontal = 0, hold = 0 } = {}) => {
    await touch("touchStart", x, y);
    for (let step = 1; step <= 4; step++) {
      await touch("touchMove", x + (horizontal * step) / 4, y + (distance * step) / 4);
      await pause(20);
    }
    if (hold) await pause(hold);
    await touch("touchEnd");
  };
  const requests = () => page.evaluate(() => window.closeRequests);
  const settled = () =>
    page.waitForFunction(() => document.getElementById("sheet").style.translate === "none");

  test("downward threshold closes once, releases scroll lock and restores focus", async () => {
    assert.equal(await page.evaluate(() => document.body.style.overflow), "hidden");
    await drag(120);
    await page.waitForFunction(() => !document.querySelector("dialog").open);
    assert.equal(await requests(), 1);
    assert.equal(await page.evaluate(() => document.body.style.overflow), "");
    assert.equal(await page.evaluate(() => document.activeElement.id), "opener");
  });

  test("short drag snaps back; short tap and horizontal/upward motion never dismiss", async () => {
    await drag(24);
    await settled();
    await drag(10, { horizontal: 130 });
    await drag(-90);
    await touch("touchStart");
    await touch("touchEnd");
    assert.equal(await requests(), 0);
    assert.equal(await page.evaluate(() => document.querySelector("dialog").open), true);
  });

  test("recent fast motion can dismiss below threshold, but a held short drag cannot", async () => {
    await drag(70, { hold: 180 });
    assert.equal(await requests(), 0);
    await settled();
    await pause(200);
    await touch("touchStart");
    await touch("touchMove", 80, 410);
    await touch("touchMove", 80, 450);
    await touch("touchEnd");
    await page.waitForFunction(() => window.closeRequests === 1);
  });

  test("pointer cancellation and lost capture reset without closing", async () => {
    await touch("touchStart");
    await touch("touchMove", 80, 510);
    await touch("touchCancel");
    await settled();
    await pause(200);
    await page.evaluate(() => {
      document.getElementById("handle").addEventListener(
        "gotpointercapture",
        (event) => {
          window.capturedPointer = event.pointerId;
        },
        { once: true },
      );
    });
    await touch("touchStart");
    await touch("touchMove", 80, 500);
    await page.evaluate(() =>
      document.getElementById("handle").releasePointerCapture(window.capturedPointer),
    );
    await touch("touchMove", 80, 505);
    await touch("touchEnd");
    await settled();
    assert.equal(await requests(), 0);
  });

  test("pending state cancels an active gesture and blocks new gestures", async () => {
    await touch("touchStart");
    await touch("touchMove", 80, 510);
    await page.evaluate(() => window.update({ disabled: true }));
    await touch("touchEnd");
    await settled();
    await drag(120);
    assert.equal(await requests(), 0);
  });

  test("a focusable panel ancestor does not disable its noninteractive handle", async () => {
    await page.locator("#sheet").evaluate((node) => node.setAttribute("tabindex", "-1"));
    await drag(120);
    await page.waitForFunction(() => window.closeRequests === 1);
  });

  test("an additional touch cancels the primary drag without dismissing", async () => {
    await touch("touchStart");
    await touch("touchMove", 80, 510);
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [
        { x: 80, y: 510, id: 0 },
        { x: 300, y: 600, id: 1 },
      ],
    });
    await touch("touchEnd");
    await settled();
    assert.equal(await requests(), 0);
  });

  test("rejected draft confirmation retains text, focus and scroll lock; a retry can close", async () => {
    await page.evaluate(() => window.update({ dirty: true }));
    await page.locator("#editor").fill("Unsaved real DOM draft");
    page.once("dialog", (dialog) => dialog.dismiss());
    await drag(120);
    await settled();
    assert.equal(await requests(), 1);
    assert.equal(await page.locator("#editor").inputValue(), "Unsaved real DOM draft");
    assert.equal(await page.evaluate(() => document.body.style.overflow), "hidden");
    assert.equal(await page.evaluate(() => document.activeElement.id), "editor");
    await pause(200);
    page.once("dialog", (dialog) => dialog.accept());
    await drag(120);
    await page.waitForFunction(() => !document.querySelector("dialog").open);
    assert.equal(await requests(), 2);
  });

  test("content scroll remains native and cannot start dismissal", async () => {
    await drag(-150, { y: 660 });
    assert.ok(await page.locator("#content").evaluate((node) => node.scrollTop > 40));
    assert.equal(await requests(), 0);
    assert.equal(await page.evaluate(() => window.scrollY), 0);
  });

  test("interactive header targets and mouse dragging never start a gesture; keyboard close works", async () => {
    await drag(120, { x: 200 });
    assert.equal(await requests(), 0);
    await page.mouse.move(80, 380);
    await page.mouse.down();
    await page.mouse.move(80, 520, { steps: 4 });
    await page.mouse.up();
    assert.equal(await requests(), 0);
    await page.locator("#close").focus();
    await page.keyboard.press("Enter");
    await page.waitForFunction(() => window.closeRequests === 1);
  });

  test("reduced motion disables snap-back transition and reopening resets translation", async () => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await drag(24);
    await settled();
    assert.equal(
      await page.locator("#sheet").evaluate((node) => getComputedStyle(node).transitionDuration),
      "0s",
    );
    await touch("touchStart");
    await touch("touchMove", 80, 440);
    await page.evaluate(() => window.setOpen(false));
    await touch("touchEnd");
    await page.evaluate(() => window.setOpen(true));
    await settled();
    assert.equal(await requests(), 0);
    await page.evaluate(() => window.unmount());
    assert.equal(await page.evaluate(() => document.body.style.overflow), "");
  });
});
