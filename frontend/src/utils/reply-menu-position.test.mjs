import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { getReplyMenuPosition } from "./reply-menu-position.ts";

const bounds = { top: 0, left: 0, right: 390, bottom: 700 };
test("reply menus open below when there is room", () => {
  assert.deepEqual(getReplyMenuPosition({ top: 100, bottom: 128, right: 350 }, bounds, 256, 220), {
    top: 136,
    left: 94,
    width: 256,
    maxHeight: 556,
  });
});
test("reply menus flip above the composer without covering controls through transparency", () => {
  const position = getReplyMenuPosition({ top: 590, bottom: 618, right: 350 }, bounds, 256, 220);
  assert.equal(position.top, 362);
  assert.ok(position.top + 220 < 700);
});
test("visual viewport offsets and narrow screens constrain every menu edge", () => {
  for (const frame of [bounds, { top: 120, left: 25, right: 270, bottom: 430 }]) {
    const result = getReplyMenuPosition({ top: 330, bottom: 358, right: 400 }, frame, 256, 300);
    assert.ok(result.left >= frame.left + 8);
    assert.ok(result.left + result.width <= frame.right - 8);
    assert.ok(result.top >= frame.top + 8);
    assert.ok(result.top + Math.min(300, result.maxHeight) <= frame.bottom - 8);
  }
});
test("owner and guest menus share the portal, dismissal shield and keyboard navigation", () => {
  const surface = readFileSync(
    new URL("../components/community/reply-menu-surface.tsx", import.meta.url),
    "utf8",
  );
  assert.match(surface, /createPortal/);
  assert.match(surface, /document.body/);
  assert.match(surface, /z-\[900\]/);
  assert.match(surface, /data-fixed-bottom-recovery/);
  assert.match(surface, /bg-surface/);
  assert.match(surface, /event.preventDefault\(\)/);
  assert.match(surface, /ArrowDown/);
  for (const path of [
    "../components/community/reply-owner-action-menu.tsx",
    "../app/app/community/[slug]/post/[id]/components/reply-overflow-menu.tsx",
  ]) {
    const source = readFileSync(new URL(path, import.meta.url), "utf8");
    assert.match(source, /<ReplyMenuSurface/);
    assert.doesNotMatch(source, /absolute top-[79] right-0/);
  }
});
