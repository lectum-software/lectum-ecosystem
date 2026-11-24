import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import { isAnonymousFeedRead } from "./anonymous-feed-read.ts";

test("real interceptor starts guest reads while device promise is unresolved", async () => {
  const source = readFileSync(new URL("index.ts", import.meta.url), "utf8");
  let interceptor;
  let marker;
  let deviceCalls = 0;
  let resolveDevice;
  const device = new Promise((resolve) => {
    resolveDevice = resolve;
  });
  const modules = {
    axios: {
      default: {
        create: () => ({
          interceptors: {
            request: {
              use: (fn) => {
                interceptor = fn;
              },
            },
          },
        }),
      },
      AxiosHeaders: { from: (headers) => headers },
    },
    "@/api/auth-cookie": { USER_COOKIE_AUTH_HEADERS: {}, applyStoredBearerFallback: () => {} },
    "@/api/anonymous-feed-read": { isAnonymousFeedRead },
    "@/hooks/cookies/token": { getToken: () => marker, getBearerToken: () => undefined },
    "@/utils/fingerprint": {
      fingerprint: () => {
        deviceCalls += 1;
        return device;
      },
    },
    "@/utils/public-asset-sources": {
      getPublicApiSource: () => ({ origin: "https://api.example.com" }),
    },
  };
  const js = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText;
  vm.runInNewContext(js, { exports: {}, require: (name) => modules[name], URL });
  const headers = () => new Map();
  const guest = await interceptor({
    method: "GET",
    url: "/api/private/community/feed/posts",
    headers: headers(),
  });
  assert.equal(deviceCalls, 0);
  assert.equal(guest.withCredentials, false);
  assert.equal(guest.headers.has("x-device"), false);
  marker = "cookie-session";
  let finished = false;
  const signedIn = interceptor({
    method: "GET",
    url: "/api/private/community/feed/posts",
    withCredentials: true,
    headers: headers(),
  }).then((value) => {
    finished = true;
    return value;
  });
  await Promise.resolve();
  assert.equal(deviceCalls, 1);
  assert.equal(finished, false);
  resolveDevice("original-device");
  const authenticated = await signedIn;
  assert.equal(authenticated.withCredentials, true);
  assert.equal(authenticated.headers.get("x-device"), "original-device");
});

test("only allowlisted guest GET reads skip device preparation", () => {
  for (const url of [
    "/api/private/community",
    "/api/private/community?limit=12",
    "/api/private/community/feed/posts?seed=41&page=2",
    "/api/public/video-assets/cmwjvz3jb07eg01o0wldb38rv/playback",
  ]) {
    assert.equal(isAnonymousFeedRead({ url, hasSession: false }), true);
    assert.equal(isAnonymousFeedRead({ url, hasSession: true }), false);
    for (const method of ["POST", "PUT", "PATCH", "DELETE", "HEAD"]) {
      assert.equal(isAnonymousFeedRead({ url, method, hasSession: false }), false);
    }
  }
  for (const url of [
    undefined,
    "/api/private/account",
    "/api/private/community/suggestions",
    "/api/private/community/feed/posts/extra",
    "/api/private/video-assets/cmwjvz3jb07eg01o0wldb38rv/playback",
    "/api/public/video-assets/../playback",
    "https://evil.invalid/api/private/community",
  ])
    assert.equal(isAnonymousFeedRead({ url, hasSession: false }), false);
});

test("session markers and explicit credentials preserve device authentication", () => {
  const api = readFileSync(new URL("index.ts", import.meta.url), "utf8");
  assert.match(api, /getToken\(\) \|\| headers.has\("Authorization"\) \|\| config.auth/);
  assert.match(api, /if \(anonymousFeedRead\) config.withCredentials = false/);
  assert.match(api, /anonymousFeedRead \? null : await fingerprint\(\)/);
  assert.match(api, /applyStoredBearerFallback\(headers, token\)/);
});

test("zoom and scoped poster optimization preserve public post markup", () => {
  const root = new URL("../", import.meta.url);
  const read = (path) => readFileSync(new URL(path, root), "utf8");
  assert.match(read("app/page.tsx"), /views\/community-feed/);
  assert.doesNotMatch(read("app/page.tsx"), /CommunityRouteLogic/);
  assert.doesNotMatch(
    read("app/layout.tsx"),
    /MobileZoomGuard|maximumScale: 1|userScalable: false/,
  );
  assert.equal(
    (read("app/globals.css").match(/touch-action: pan-x pan-y pinch-zoom/g) ?? []).length,
    2,
  );
  assert.match(read("components/ui/vertical-video-player-stream.tsx"), /deferPoster = false/);
  assert.match(
    read("components/community/community-media-frame.tsx"),
    /deferPoster=\{enableFeedAutoplay\}/,
  );
  assert.match(
    read("components/ui/vertical-video-player-stream.tsx"),
    /!deferPoster \|\| playbackMode !== "visible" \|\| preparedPosterSource === src/,
  );
});
