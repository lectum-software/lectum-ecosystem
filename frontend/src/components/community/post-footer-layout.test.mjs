import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("public post has no duplicate video index and retains transcripts and reels", () => {
  const source = readFileSync(
    new URL("../../app/comunidades/[slug]/publicacao/[id]/page.tsx", import.meta.url),
    "utf8",
  );
  assert.doesNotMatch(source, /PublicReelLinks/);
  assert.match(source, /PublicTranscript/);
  assert.match(source, /PublicReelPage/);
});

test("post reserves only the mobile composer clearance at the bottom", () => {
  const source = readFileSync(
    new URL("../../app/app/community/[slug]/post/[id]/views/post-detail.tsx", import.meta.url),
    "utf8",
  );
  assert.doesNotMatch(source, /pb-36/);
  assert.match(source, /104px_\+_var\(--lectum-safe-area-bottom\)/);
});
