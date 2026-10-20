import assert from "node:assert/strict";
import test from "node:test";
import { metricChange } from "./comparison.ts";

test("change handles growth, decline, zero and missing bases", () => {
  assert.deepEqual(metricChange(112, 100), { label: "12%", direction: "up" });
  assert.deepEqual(metricChange(92, 100), { label: "8%", direction: "down" });
  assert.deepEqual(metricChange(0, 12), { label: "100%", direction: "down" });
  assert.deepEqual(metricChange(0, 0), { label: "0%", direction: "neutral" });
  assert.deepEqual(metricChange(5, 0), { label: "Novo", direction: "up" });
  for (const missing of [null, undefined, NaN, Infinity, -1]) {
    assert.equal(metricChange(5, missing), null);
    assert.equal(metricChange(missing, 5), null);
  }
});
test("small changes preserve direction and large percentages stay compact", () => {
  assert.deepEqual(metricChange(10001, 10000), { label: "<0,1%", direction: "up" });
  assert.deepEqual(metricChange(9999, 10000), { label: "<0,1%", direction: "down" });
  assert.ok(metricChange(1000000, 1).label.length < 12);
});
