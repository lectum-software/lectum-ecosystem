import "../../scripts/register-source-modules.mjs";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { resolveModalPortalHost } from "./use-modal-portal-host.ts";

test("portal host prefers the dialog containing the triggering focus", () => {
  const focused = { id: "comments" };
  assert.equal(
    resolveModalPortalHost({
      activeElement: {
        closest: (selector) => {
          assert.equal(selector, "dialog:modal");
          return focused;
        },
      },
      querySelectorAll: () => [{ id: "other-dialog" }],
    }),
    focused,
  );
});

test("portal host falls back to the last modal when its trigger was removed", () => {
  const latest = { id: "comments" };
  assert.equal(
    resolveModalPortalHost({
      activeElement: { closest: () => null },
      querySelectorAll: () => [{ id: "older" }, latest],
    }),
    latest,
  );
});

test("ordinary pages preserve their existing portal target", () => {
  assert.equal(
    resolveModalPortalHost({
      activeElement: null,
      querySelectorAll: () => [],
    }),
    null,
  );
});

test("tree overlays use the modal host and consume Escape before the native sheet", () => {
  for (const path of [
    "../components/psychologists/psychologist-whatsapp-redirect-button.tsx",
    "../components/community/reply-edit-modal.tsx",
    "../components/community/reply-owner-action-menu.tsx",
    "../components/community/lectum-share-download-dialog.tsx",
    "../components/community/community-media-upgrade-modal.tsx",
    "../components/community/community-delete-confirmation-modal.tsx",
    "../components/conversion/progressive-conversion-prompt.tsx",
  ]) {
    const source = readFileSync(new URL(path, import.meta.url), "utf8");
    assert.match(source, /useModalPortalHost\(/, path);
    assert.match(source, /createPortal\(/, path);
    assert.match(source, /portalHost/, path);
    assert.match(source, /event\.preventDefault\(\)/, path);
    assert.match(source, /event\.stopPropagation\(\)/, path);
  }
});

test("delete confirmation keeps focus and Escape in the native host and blocks pending dismissal", () => {
  const source = readFileSync(
    new URL("../components/community/community-delete-confirmation-modal.tsx", import.meta.url),
    "utf8",
  );
  assert.match(source, /useModalPortalHost\(open, overlayRef\)/);
  assert.match(source, /portalHost \?\? document.body/);
  assert.match(source, /ref=\{overlayRef\}/);
  assert.match(source, /tabIndex=\{-1\}/);
  assert.match(source, /if \(!open \|\| portalHost\) return/);
  assert.match(
    source,
    /event.preventDefault\(\);\s*event.stopPropagation\(\);\s*if \(!pending\) onClose\(\)/,
  );
  assert.match(source, /if \(!pending && event.target === event.currentTarget\) onClose\(\)/);
  assert.match(source, /removeEventListener\("keydown", handleKeyDown, true\)/);
});
