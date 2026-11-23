import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const base = "src/app/(admin)/comunidades/[slug]/";

test("download selector offers all formats and guards pending actions", () => {
  const source = read(`${base}components/content-video-download-actions.tsx`);
  assert.match(source, /aria-label="Opções de download"/);
  assert.match(source, /label: "Original"/);
  assert.match(source, /label: "Legenda"/);
  assert.match(source, /label: "ID"/);
  assert.match(source, /disabled=\{pending \|\| disabled\}/);
  assert.match(source, /download: downloadWithCaptions/);
});

test("caption and identity reuse the renderer while original keeps its endpoint", () => {
  const source = read(`${base}modules/video-downloads.ts`);
  assert.match(source, /action === "captions" \? "captions" : "identification"/);
  assert.match(source, /downloadOriginal/);
  assert.match(source, /downloadAdminCommunityContentVideoArtRenderJobFile/);
  assert.match(source, /job.status !== "completed"/);
  assert.match(read("src/api/req/communities/content-reports.ts"), /\{ overlayMode \}/);
});
