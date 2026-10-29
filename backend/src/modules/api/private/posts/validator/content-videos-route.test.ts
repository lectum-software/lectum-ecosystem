import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

test("content videos inherit the same optional-auth read policy as show/replies", () => {
  const routes = readFileSync(resolve(__dirname, "../index.ts"), "utf8");
  const mounts = readFileSync(
    resolve(__dirname, "../../../../../main/server/imports/write.ts"),
    "utf8",
  );
  assert.match(mounts, /mountRoute\("\/api\/private\/posts", optionalAuth, apiPrivatePosts\)/);
  assert.match(
    routes,
    /routes\.get\("\/:id\/content-videos", contentVideosValidator, contentVideos\)/,
  );
  assert.match(routes, /routes\.get\("\/:id\/replies", repliesValidator, replies\)/);
  assert.match(routes, /routes\.get\("\/:id", showValidator, show\)/);
  assert.match(routes, /routes\.post\("\/:id\/vote", privateAuth, voteValidator, vote\)/);
});
