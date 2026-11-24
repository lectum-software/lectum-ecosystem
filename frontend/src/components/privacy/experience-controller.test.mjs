import assert from "node:assert/strict";
import { test } from "node:test";
import { createExperienceController } from "./experience-controller.ts";

function fixture() {
  let scope = null;
  let finish;
  const events = [];
  const sdk = { start: () => events.push("start"), stop: () => events.push("stop") };
  const controller = createExperienceController({
    scope: () => scope,
    load: () => {
      events.push("load");
      return new Promise((resolve) => {
        finish = () => resolve(sdk);
      });
    },
  });
  return {
    controller,
    events,
    setScope: (value) => {
      scope = value;
    },
    finish: () => finish(),
  };
}

test("public navigation resumes using the same SDK while private scope stays stopped", async () => {
  const f = fixture();
  f.setScope("guest:public-a");
  const pending = f.controller.sync();
  f.finish();
  await pending;
  f.controller.stop();
  f.setScope(null);
  await f.controller.sync();
  f.setScope("guest:public-b");
  await f.controller.sync();
  f.setScope(null);
  await f.controller.sync();
  assert.deepEqual(f.events, ["load", "start", "stop", "start", "stop"]);
});

test("denial never loads a library", async () => {
  const f = fixture();
  await f.controller.sync();
  assert.deepEqual(f.events, []);
});
test("grant starts once, denial stops once", async () => {
  const f = fixture();
  f.setScope("guest:1");
  const pending = f.controller.sync();
  f.finish();
  await pending;
  await f.controller.sync();
  f.setScope(null);
  await f.controller.sync();
  await f.controller.sync();
  assert.deepEqual(f.events, ["load", "start", "stop"]);
});
test("revocation during download prevents late start", async () => {
  const f = fixture();
  f.setScope("guest:1");
  const pending = f.controller.sync();
  f.setScope(null);
  await f.controller.sync();
  f.finish();
  await pending;
  assert.deepEqual(f.events, ["load"]);
});
test("changing account during download prevents late start", async () => {
  const f = fixture();
  f.setScope("guest:1");
  const pending = f.controller.sync();
  f.setScope("account:2");
  f.finish();
  await pending;
  assert.deepEqual(f.events, ["load"]);
});
test("dispose cancels download activation and future starts", async () => {
  const f = fixture();
  f.setScope("guest:1");
  const pending = f.controller.sync();
  f.controller.dispose();
  f.finish();
  await pending;
  await f.controller.sync();
  assert.deepEqual(f.events, ["load"]);
});
test("load failure stays closed without repeated requests", async () => {
  let loads = 0;
  const c = createExperienceController({
    scope: () => "grant",
    load: async () => {
      loads++;
      throw Error("offline");
    },
  });
  await c.sync();
  await c.sync();
  assert.equal(loads, 1);
});
