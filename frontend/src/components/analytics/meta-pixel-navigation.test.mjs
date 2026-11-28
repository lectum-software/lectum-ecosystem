import "../../../scripts/register-source-modules.mjs";
import assert from "node:assert/strict";
import test from "node:test";

const { createPixelNavigation } = await import("./meta-pixel-navigation.ts");
test("page visits survive polling, distinguish return navigation and reset on consent/route exit", () => {
  let sequence = 0;
  const tracker = createPixelNavigation(() => String(++sequence));
  const first = tracker.visit("consent", "/comunidades/ansiedade");
  assert.equal(tracker.visit("consent", "/comunidades/ansiedade"), first);
  assert.notEqual(tracker.visit("consent", "/psicologos"), first);
  assert.notEqual(tracker.visit("consent", "/comunidades/ansiedade"), first);
  const returning = tracker.visit("consent", "/comunidades/ansiedade");
  assert.notEqual(tracker.visit("new-consent", "/comunidades/ansiedade"), returning);
  const beforeReset = tracker.visit("new-consent", "/comunidades/ansiedade");
  tracker.reset();
  assert.notEqual(tracker.visit("new-consent", "/comunidades/ansiedade"), beforeReset);
});
