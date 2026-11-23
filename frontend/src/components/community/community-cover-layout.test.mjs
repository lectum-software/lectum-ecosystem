import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("community cover has no light veil and keeps its compact height", () => {
  const source = readFileSync(
    new URL("../../app/app/community/[slug]/components/community-header.tsx", import.meta.url),
    "utf8",
  );
  assert.doesNotMatch(source, /community-header-highlight|radial-gradient/);
  assert.match(source, /h-\[100px\]/);
  assert.match(source, /linear-gradient\(145deg/);
});
