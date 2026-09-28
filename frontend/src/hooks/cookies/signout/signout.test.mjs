import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { registerHooks } from "node:module";
import { after, beforeEach, test } from "node:test";

const calls = [];
let rejection;
const previousWindow = globalThis.window;
globalThis.__signoutTest = {
  post: async () => {
    calls.push("revoke");
    if (rejection) throw rejection;
  },
  cleanup: (name) => calls.push(name),
};
const stubs = {
  sonner: "export const toast = { error() {} };",
  "@/api": "export default { post: (...args) => globalThis.__signoutTest.post(...args) };",
  "@/hooks/cookies/token":
    'export const getBearerToken = () => null; export const removeToken = () => globalThis.__signoutTest.cleanup("token");',
  "@/hooks/cookies/user":
    'export const removeUser = () => globalThis.__signoutTest.cleanup("user");',
  "@/utils/analytics-session":
    'export const resetAnalyticsSession = () => globalThis.__signoutTest.cleanup("analytics");',
  "@/utils/push-subscription":
    'export const unsubscribeCurrentPushSubscription = async () => globalThis.__signoutTest.cleanup("push");',
};
const hooks = registerHooks({
  resolve(specifier, context, nextResolve) {
    if (stubs[specifier]) {
      return {
        shortCircuit: true,
        url: `data:text/javascript,${encodeURIComponent(stubs[specifier])}`,
      };
    }
    if (specifier.startsWith("@/utils/")) {
      return {
        shortCircuit: true,
        url: new URL(`../../../utils/${specifier.slice(8)}.ts`, import.meta.url).href,
      };
    }
    return nextResolve(specifier, context);
  },
});
const { signOut } = await import("./index.ts");

beforeEach(() => {
  calls.length = 0;
  rejection = undefined;
  globalThis.window = {
    location: {
      pathname: "/app/profile",
      set href(value) {
        calls.push(`navigate:${value}`);
      },
    },
    localStorage: { removeItem: (key) => calls.push(`local:${key}`) },
    sessionStorage: { removeItem: (key) => calls.push(`session:${key}`) },
  };
});
after(() => {
  hooks.deregister();
  globalThis.window = previousWindow;
  delete globalThis.__signoutTest;
});

test("manual logout revokes and clears the session before opening the public feed", async () => {
  await signOut();
  assert.deepEqual(calls, [
    "revoke",
    "push",
    "analytics",
    "token",
    "user",
    "local:persist:lectum",
    "local:lectum.adminViewAs",
    "session:lectum.adminViewAs",
    "navigate:/",
  ]);
});
test("expired sessions still request authentication with a return path", async () => {
  await signOut(true);
  assert.equal(calls.at(-1), "navigate:/auth/login?callbackUrl=%2Fapp%2Fprofile");
});
test("explicit internal authentication navigation is preserved", async () => {
  await signOut(false, "/auth/login?redirectTo=%2Fapp%2Fprofile");
  assert.equal(calls.at(-1), "navigate:/auth/login?redirectTo=%2Fapp%2Fprofile");
});
test("unsafe redirects fall back to the public feed", async () => {
  await signOut(false, "https://external.example");
  assert.equal(calls.at(-1), "navigate:/");
});
test("network failure does not clear the local session or navigate", async () => {
  rejection = new Error("Network failure");
  await assert.rejects(signOut(), /Network failure/);
  assert.deepEqual(calls, ["revoke"]);
});
test("profile logout uses the shared default destination", () => {
  const source = readFileSync(
    new URL("../../../app/app/profile/logic.tsx", import.meta.url),
    "utf8",
  );
  assert.match(source, /onClick=\{\(\) => out\(\)\}/);
  assert.doesNotMatch(source, /out\("\/auth\/login"\)/);
});
