import assert from "node:assert/strict";
import { test } from "node:test";
import {
  captionCuesSchema,
  captionEditSchema,
  captionsEnabledFor,
  captionsFitDuration,
} from "./policy";
import { parseCaptionStatus, parseCaptionVtt } from "./provider";

test("captions are opt-in per asset; wildcard does not activate anything", () => {
  assert.equal(captionsEnabledFor("testasset01", {}), false);
  assert.equal(captionsEnabledFor("testasset01", { VIDEO_CAPTIONS_ASSET_IDS: "*" }), false);
  assert.equal(
    captionsEnabledFor("testasset01", { VIDEO_CAPTIONS_ASSET_IDS: "testasset01, otherasset" }),
    true,
  );
  assert.equal(
    captionsEnabledFor("anotherasset", { VIDEO_CAPTIONS_ASSET_IDS: "testasset01" }),
    false,
  );
});

test("provider states must be successful Portuguese caption responses", () => {
  for (const status of ["inprogress", "ready", "error"]) {
    assert.equal(
      parseCaptionStatus(JSON.stringify({ success: true, result: { status, language: "pt" } })),
      status,
    );
  }
  assert.throws(() => parseCaptionStatus('{"success":false}'));
  assert.throws(() =>
    parseCaptionStatus('{"success":true,"result":{"status":"ready","language":"en"}}'),
  );
});

test("WebVTT preserves accented text and exact timing", () => {
  const cues = parseCaptionVtt(
    "WEBVTT\n\n00:00:00.250 --> 00:00:02.500\nAtenção e acolhimento.\n\n00:00:02.500 --> 00:00:04.000\nRespeite seu tempo.\n",
  );
  assert.deepEqual(cues, [
    { start: 0.25, end: 2.5, text: "Atenção e acolhimento." },
    { start: 2.5, end: 4, text: "Respeite seu tempo." },
  ]);
  assert.throws(() => parseCaptionVtt("invalid data"));
  assert.throws(() =>
    parseCaptionVtt("WEBVTT\n\n00:00:00.000 --> 00:00:01.000\n<script>alert(1)</script>\n"),
  );
});

test("timing rejects overlap, reversed cues and durations outside video", () => {
  const cue = { start: 0, end: 2, text: "Texto" };
  assert.equal(captionCuesSchema.safeParse([cue, { ...cue, start: 1, end: 3 }]).success, false);
  assert.equal(captionCuesSchema.safeParse([{ ...cue, start: 3 }]).success, false);
  assert.equal(captionsFitDuration([cue], 2), true);
  assert.equal(captionsFitDuration([cue], 1), false);
  assert.equal(captionsFitDuration([cue], null), false);
});

test("edits require a revision and bounded plain text", () => {
  const cue = { start: 0, end: 1, text: "Texto" };
  assert.equal(captionEditSchema.safeParse({ cues: [cue] }).success, false);
  assert.equal(captionEditSchema.safeParse({ cues: [cue], revision: 0 }).success, true);
  for (const text of ["", " ", "x".repeat(501), "<b>Texto</b>", "Texto\u0000"]) {
    assert.equal(captionCuesSchema.safeParse([{ ...cue, text }]).success, false);
  }
  assert.equal(
    captionCuesSchema.safeParse(
      Array.from({ length: 5001 }, (_, i) => ({ ...cue, start: i, end: i + 1 })),
    ).success,
    false,
  );
});
