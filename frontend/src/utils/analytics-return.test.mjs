import assert from "node:assert/strict";
import test from "node:test";
import {
  ANALYTICS_SCROLL_KEY,
  analyticsReturnHref,
  rememberAnalyticsPosition,
} from "./analytics-return.ts";
import { myPostsTabHref } from "./my-posts-tab.ts";

test("analytics return keeps period across publication tabs and rejects other origins", () => {
  const target =
    "/app/profissional/estatisticas?restore=1&period=custom&start_at=2026-10-16&end_at=2026-10-19";
  const href = myPostsTabHref(
    "/app/publicacoes/minhas",
    new URLSearchParams({ returnTo: target }).toString(),
    "replies",
  );
  const query = new URL(href, "https://lectum.local").searchParams;
  assert.equal(analyticsReturnHref(query.get("returnTo")), target + "#conteudos-em-destaque");
  for (const invalid of [
    null,
    "https://evil.test/app/profissional/estatisticas",
    "//evil.test/app/profissional/estatisticas",
    "/app/perfil",
    "javascript:alert(1)",
  ])
    assert.equal(analyticsReturnHref(invalid), null);
});
test("leaving analytics remembers position and selected metric without requiring storage", () => {
  let captured;
  globalThis.window = { scrollY: 852 };
  globalThis.document = { querySelector: () => ({ getAttribute: () => "video_views" }) };
  globalThis.sessionStorage = {
    setItem: (key, value) => {
      assert.equal(key, ANALYTICS_SCROLL_KEY);
      captured = JSON.parse(value);
    },
  };
  rememberAnalyticsPosition();
  assert.equal(captured.top, 852);
  globalThis.sessionStorage = {
    setItem: () => {
      throw new Error("blocked");
    },
  };
  assert.doesNotThrow(rememberAnalyticsPosition);
  delete globalThis.window;
  delete globalThis.document;
  delete globalThis.sessionStorage;
});
