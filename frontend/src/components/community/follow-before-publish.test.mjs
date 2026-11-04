import "../../../scripts/register-source-modules.mjs";
import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import { afterEach, beforeEach, test } from "node:test";

const bridge = `data:text/javascript,${encodeURIComponent(`
export const getCommunityDetail = async () => globalThis.__followingTest.detail;
export const followCommunity = async (slug) => {
  globalThis.__followingTest.followCalls.push(slug);
  if (globalThis.__followingTest.fail) throw new Error("Não foi possível seguir.");
  return { following: true };
};
`)}`;
registerHooks({
  resolve(specifier, context, next) {
    return next(specifier === "@/api/req/community" ? bridge : specifier, context);
  },
});
const { ensurePublicationFollowing } = await import("./follow-before-publish.tsx");
const originalWindow = globalThis.window;
beforeEach(() => {
  globalThis.__followingTest = {
    detail: { community: { name: "Comunidade" }, participation: { following: false } },
    followCalls: [],
    confirmCalls: 0,
    confirmed: true,
    fail: false,
  };
  globalThis.window = {
    dispatchEvent(event) {
      event.preventDefault();
      globalThis.__followingTest.confirmCalls++;
      event.detail.resolve(globalThis.__followingTest.confirmed);
    },
  };
});
afterEach(() => {
  globalThis.window = originalWindow;
  delete globalThis.__followingTest;
});
test("member proceeds without a second follow or confirmation", async () => {
  globalThis.__followingTest.detail.participation.following = true;
  await ensurePublicationFollowing("community");
  assert.equal(globalThis.__followingTest.confirmCalls, 0);
  assert.deepEqual(globalThis.__followingTest.followCalls, []);
});
test("nonmember explicitly confirms before following", async () => {
  await ensurePublicationFollowing("community");
  assert.equal(globalThis.__followingTest.confirmCalls, 1);
  assert.deepEqual(globalThis.__followingTest.followCalls, ["community"]);
});
test("going back never follows or allows publication", async () => {
  globalThis.__followingTest.confirmed = false;
  await assert.rejects(ensurePublicationFollowing("community"), /conteúdo foi mantido/);
  assert.deepEqual(globalThis.__followingTest.followCalls, []);
});
test("follow failure propagates and prevents publication", async () => {
  globalThis.__followingTest.fail = true;
  await assert.rejects(ensurePublicationFollowing("community", true), /Não foi possível seguir/);
});
