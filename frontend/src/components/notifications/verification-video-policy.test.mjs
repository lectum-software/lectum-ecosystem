import assert from "node:assert/strict";
import { test } from "node:test";
import { hasWatchedVerificationVideo, VERIFICATION_VIDEO } from "./verification-video-policy.ts";

const ranges = (...values) => ({
  length: values.length,
  start: (i) => values[i][0],
  end: (i) => values[i][1],
});

test("verification notice uses approved copy", () => {
  assert.equal(VERIFICATION_VIDEO.title, "Selo verificado: o que significa?");
  assert.equal(
    VERIFICATION_VIDEO.description,
    "Clique e descubra o que verificamos antes de conceder o selo ao profissional.",
  );
});
test("opening and seeking to the end do not count as watching", () => {
  assert.equal(hasWatchedVerificationVideo(ranges(), 100), false);
  assert.equal(hasWatchedVerificationVideo(ranges([0, 2], [99, 100]), 100), false);
});
test("90 percent of played ranges completes the notice", () => {
  assert.equal(hasWatchedVerificationVideo(ranges([0, 89.9]), 100), false);
  assert.equal(hasWatchedVerificationVideo(ranges([0, 90]), 100), true);
  assert.equal(hasWatchedVerificationVideo(ranges([0, 40], [50, 100]), 100), true);
});
test("unknown or invalid duration never completes", () => {
  for (const duration of [0, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
    assert.equal(hasWatchedVerificationVideo(ranges([0, 100]), duration), false);
  }
});
