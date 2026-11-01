import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (name) =>
  readFileSync(
    new URL(`../../app/app/community/[slug]/post/[id]/components/${name}`, import.meta.url),
    "utf8",
  );

test("reel focus lifecycle handles native keyboard collapse, external touches and cleanup", () => {
  const hook = read("use-reels-composer-focus.ts");
  assert.match(hook, /if \(!enabled \|\| locked\) return/);
  assert.match(hook, /node\?\.contains\(event.target\)\) return/);
  assert.match(hook, /event.type === "pointerdown"/);
  assert.match(hook, /event.preventDefault\(\)/);
  assert.match(hook, /viewport.scale - 1/);
  assert.match(hook, /if \(occlusion >= 100\) keyboardWasOpen = true/);
  assert.match(hook, /else if \(keyboardWasOpen\)/);
  for (const event of ["pointerdown", "click", "resize", "focusin", "orientationchange"]) {
    assert.match(hook, new RegExp(`addEventListener\\("${event}"`));
    assert.match(hook, new RegExp(`removeEventListener\\("${event}"`));
  }
  assert.match(hook, /clearTimeout\(settleTimer\)/);
});

test("shared composer scopes silent discard and focus dismissal to reels", () => {
  const composer = read("reply-composer.tsx");
  assert.match(composer, /confirmDiscard = true/);
  assert.match(
    composer,
    /confirmDiscard && !isReels && hasDiscardableDraft && !confirmDiscardReplyDraft\(\)/,
  );
  assert.match(composer, /enabled: isReels/);
  assert.match(
    composer,
    /locked: interactionLocked \|\| mediaPickerActive \|\| mediaUpgradeModalOpen/,
  );
  assert.match(composer, /onDismiss: dismissComposerKeyboard/);
  assert.match(composer, /inputNode\?\.blur\(\)/);
});
