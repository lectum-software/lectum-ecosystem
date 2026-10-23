import "../../scripts/register-source-modules.mjs";
import assert from "node:assert/strict";
import test from "node:test";

const { interactionAnalyticsPath } = await import("./analytics-path.ts");
const { createVideoSessionKey } = await import(
  "../app/app/psychologists/modules/video-analytics.ts"
);
const {
  getProfileViewNavigationOrigin,
  recordAppNavigationPoint,
  resetNavigationAfterAuthentication,
  navigateBackWithFallback,
} = await import("./navigation-history.ts");

test("interaction attribution preserves search filters but excludes credentials and navigation metadata", () => {
  assert.equal(
    interactionAnalyticsPath(
      "/psicologos?q=ansiedade&specialty=ansiedade&token=secret&returnTo=/favoritos&traffic_origin=community_top_mentors",
    ),
    "/psicologos?q=ansiedade&specialty=ansiedade",
  );
  assert.equal(interactionAnalyticsPath("/psicologos/one?returnTo=/favoritos"), "/psicologos/one");
});

test("profile attribution ignores stale sessions; Analytics back uses the actual previous page", () => {
  const oldWindow = globalThis.window,
    oldDocument = globalThis.document;
  const storage = new Map([
    ["lectum.appNavigationHistory", JSON.stringify(["/psicologos", "/psicologos/a"])],
  ]);
  globalThis.window = {
    location: { pathname: "/psicologos/a", origin: "https://lectum.test" },
    history: { length: 2 },
    sessionStorage: { getItem: (k) => storage.get(k), setItem: (k, v) => storage.set(k, v) },
  };
  globalThis.document = { referrer: "" };
  try {
    const exploreKey = createVideoSessionKey("professional", "video.mp4", "/psicologos");
    assert.equal(createVideoSessionKey("professional", "video.mp4", "/psicologos"), exploreKey);
    assert.notEqual(
      createVideoSessionKey("professional", "video.mp4", "/psicologos?q=ansiedade"),
      exploreKey,
    );
    assert.notEqual(
      createVideoSessionKey("professional", "video.mp4", "/psicologos/professional"),
      exploreKey,
    );
    assert.equal(getProfileViewNavigationOrigin(), null);
    resetNavigationAfterAuthentication();
    window.location.pathname = "/app/favoritos";
    recordAppNavigationPoint();
    window.location.pathname = "/psicologos/a";
    recordAppNavigationPoint();
    assert.equal(getProfileViewNavigationOrigin(), "/app/favoritos");
    window.location.pathname = "/app/notificacoes";
    recordAppNavigationPoint();
    window.location.pathname = "/app/profissional/estatisticas";
    recordAppNavigationPoint();
    const calls = [];
    const router = { back: () => calls.push("back"), push: (href) => calls.push(href) };
    navigateBackWithFallback(router, "/app/perfil");
    assert.deepEqual(calls, ["back"]);
    resetNavigationAfterAuthentication();
    calls.length = 0;
    navigateBackWithFallback(router, "/app/perfil");
    assert.deepEqual(calls, ["/app/perfil"]);
  } finally {
    globalThis.window = oldWindow;
    globalThis.document = oldDocument;
  }
});
