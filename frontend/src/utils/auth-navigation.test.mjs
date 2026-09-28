import "../../scripts/register-source-modules.mjs";
import assert from "node:assert/strict";
import { afterEach, beforeEach, test } from "node:test";

const { isAuthEntryPath } = await import("./auth-entry.ts");
const { resolveAuthRedirect } = await import("./auth-redirect.ts");
const { navigateBackFromCommunity, navigateBackFromTopMentors } = await import(
  "./community-ranking-navigation.ts"
);
const { canNavigateBackInApp, recordAppNavigationPoint, resetNavigationAfterAuthentication } =
  await import("./navigation-history.ts");

const oldWindow = globalThis.window;
const oldDocument = globalThis.document;
let calls;
let router;
beforeEach(() => {
  const storage = new Map();
  calls = [];
  router = {
    back: () => calls.push("back"),
    push: (href) => calls.push(`push:${href}`),
    replace: (href) => calls.push(`replace:${href}`),
  };
  globalThis.window = {
    location: { pathname: "/", origin: "https://lectum.test" },
    history: { length: 8, state: { idx: 7 } },
    sessionStorage: {
      getItem: (key) => storage.get(key) ?? null,
      setItem: (key, value) => storage.set(key, value),
    },
  };
  globalThis.document = { referrer: "https://lectum.test/auth/profile-selection" };
});
afterEach(() => {
  globalThis.window = oldWindow;
  globalThis.document = oldDocument;
});
const visit = (path) => {
  window.location.pathname = path;
  recordAppNavigationPoint(path);
};

test("ranking after authentication returns to community and then feed, never signup", () => {
  visit("/comunidades/ansiedade");
  resetNavigationAfterAuthentication();
  visit("/comunidades/top-mentores");
  navigateBackFromTopMentors(router, "ansiedade");
  visit("/comunidades/ansiedade");
  navigateBackFromCommunity(router);
  assert.deepEqual(calls, ["replace:/comunidades/ansiedade", "replace:/"]);
});
test("authentication boundary prevents native history fallback", () => {
  resetNavigationAfterAuthentication();
  visit("/comunidades/ansiedade");
  assert.equal(canNavigateBackInApp(), false);
  navigateBackFromCommunity(router);
  assert.deepEqual(calls, ["replace:/"]);
});
test("ordinary content navigation still supports back", () => {
  resetNavigationAfterAuthentication();
  visit("/");
  visit("/comunidades/ansiedade");
  navigateBackFromCommunity(router);
  assert.deepEqual(calls, ["back"]);
});
test("legacy auth history is not a valid back destination", () => {
  visit("/auth/register/patient");
  visit("/comunidades/ansiedade");
  assert.equal(canNavigateBackInApp(), false);
  navigateBackFromCommunity(router);
  assert.deepEqual(calls, ["replace:/"]);
});
test("entry guard covers signup and login but excludes unfinished auth flows", () => {
  for (const path of [
    "/auth/login",
    "/auth/profile-selection",
    "/auth/register/patient",
    "/auth/register/psychologist/",
  ])
    assert.equal(isAuthEntryPath(path), true);
  for (const path of [
    "/auth/redirect",
    "/auth/verify-email",
    "/auth/error",
    "/auth/admin-view-as",
    "/auth/reset/code",
  ])
    assert.equal(isAuthEntryPath(path), false);
});
test("requested ranking is preserved and email confirmation still takes precedence", () => {
  const target = "/comunidades/top-mentores?community=ansiedade";
  assert.equal(resolveAuthRedirect({ confirmed: true, role: "paciente" }, target, "/"), target);
  assert.equal(
    resolveAuthRedirect({ confirmed: false, role: "paciente" }, target, "/"),
    `/auth/verify-email?redirectTo=${encodeURIComponent(target)}`,
  );
});
