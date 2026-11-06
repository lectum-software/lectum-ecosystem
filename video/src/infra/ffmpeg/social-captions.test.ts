import assert from "node:assert/strict";
import { test } from "node:test";
import { buildSocialCaptionAss, socialCaptionCuesSchema } from "./social-captions.js";

test("caption timing rejects invalid, overlapping and oversized input", () => {
  for (const cues of [
    [],
    [{ start: 2, end: 1, text: "test" }],
    [
      { start: 0, end: 2, text: "a" },
      { start: 1, end: 3, text: "b" },
    ],
    [{ start: 0, end: 2, text: "a".repeat(501) }],
  ]) {
    assert.equal(socialCaptionCuesSchema.safeParse(cues).success, false);
  }
});

test("ASS keeps full cues and original times with one background per cue", () => {
  const result = buildSocialCaptionAss([
    {
      start: 1.25,
      end: 8.5,
      text: `Psicologia e atenção. {\\pos(1,1)} ${"Conteúdo profissional. ".repeat(8)}`,
    },
  ]);
  assert.match(result, /Psicologia e atenção/u);
  assert.match(result, /Style: Default,Manrope,44,/u);
  assert.doesNotMatch(result, /\\pos|\{\\/u);
  assert.match(result, /0:00:01\.25/u);
  assert.match(result, /0:00:08\.50/u);
  const events = result.split("\n").filter((line) => line.startsWith("Dialogue:"));
  assert.equal(events.length, 1);
  assert.ok(events[0]);
  assert.ok(events[0].endsWith("Conteúdo profissional. ".repeat(8).trim()));
  assert.match(result, /,4,0,8,2,150,150,480,1/);
});
