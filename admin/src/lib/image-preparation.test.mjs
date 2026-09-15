import assert from "node:assert/strict";
import test from "node:test";
import { probeImageAnimation } from "./image-preparation/animation.ts";
import {
  hasTransparentPixels,
  normalizeImageMimeType,
  resolveImageFileMimeType,
  resolveImageOutputMimeType,
  resolveImagePreparationPolicy,
  resolveImageTargetDimensions,
  shouldAttemptImagePreparation,
  shouldUseImageCandidate,
  withCanonicalImageFileType,
  withImageFileExtension,
} from "./image-preparation/policy.ts";

const ascii = (value) => Array.from(value, (character) => character.charCodeAt(0));
const pngChunk = (type, data = []) => {
  const length = data.length;
  return [
    (length >>> 24) & 0xff,
    (length >>> 16) & 0xff,
    (length >>> 8) & 0xff,
    length & 0xff,
    ...ascii(type),
    ...data,
    0,
    0,
    0,
    0,
  ];
};

test("aplica limites conservadores para avatar e Open Graph sem ampliar", () => {
  const avatar = resolveImagePreparationPolicy("community-avatar");
  assert.deepEqual(resolveImageTargetDimensions(1024, 2048, avatar), {
    height: 512,
    resized: true,
    width: 256,
  });
  assert.deepEqual(resolveImageTargetDimensions(240, 180, avatar), {
    height: 180,
    resized: false,
    width: 240,
  });

  const openGraph = resolveImagePreparationPolicy("seo-open-graph");
  assert.deepEqual(resolveImageTargetDimensions(2400, 1260, openGraph), {
    height: 630,
    resized: true,
    width: 1200,
  });
});

test("tenta preparar por dimensão ou peso e preserva arquivo pequeno", () => {
  const openGraph = resolveImagePreparationPolicy("seo-open-graph");
  assert.equal(
    shouldAttemptImagePreparation({
      fileSize: 128 * 1024,
      height: 315,
      policy: openGraph,
      width: 600,
    }),
    false,
  );
  assert.equal(
    shouldAttemptImagePreparation({
      fileSize: 512 * 1024,
      height: 315,
      policy: openGraph,
      width: 600,
    }),
    true,
  );
});

test("só troca o original por candidato com ganho material", () => {
  assert.equal(shouldUseImageCandidate(2000, 1500), true);
  assert.equal(shouldUseImageCandidate(2000, 1901), false);
  assert.equal(shouldUseImageCandidate(2000, 1999, true), true);
  assert.equal(shouldUseImageCandidate(2000, 2000), false);
  assert.equal(shouldUseImageCandidate(2000, 2500), false);
});

test("preserva MIME com alpha e rejeita formato não suportado", () => {
  assert.equal(normalizeImageMimeType("image/jpg"), "image/jpeg");
  assert.equal(normalizeImageMimeType("image/svg+xml"), null);
  assert.equal(resolveImageOutputMimeType("image/png", true), "image/png");
  assert.equal(resolveImageOutputMimeType("image/webp", true), "image/webp");
  assert.equal(resolveImageOutputMimeType("image/jpeg", true), null);
  assert.equal(resolveImageFileMimeType({ name: "avatar.WEBP", type: "" }), "image/webp");
  assert.equal(resolveImageFileMimeType({ name: "documento.pdf", type: "" }), null);
  assert.equal(
    resolveImageFileMimeType({ name: "avatar.webp", type: "application/octet-stream" }),
    null,
  );
});

test("detecta transparência e alinha nome do arquivo ao formato", () => {
  assert.equal(hasTransparentPixels(Uint8ClampedArray.from([1, 2, 3, 0])), true);
  assert.equal(hasTransparentPixels(Uint8ClampedArray.from([1, 2, 3, 255])), false);
  assert.equal(withImageFileExtension("card.jpeg", "image/png"), "card.png");
  assert.equal(withImageFileExtension("", "image/webp"), "imagem.webp");

  const original = new File([Uint8Array.from([1])], "avatar.jpg", {
    lastModified: 456,
    type: "image/jpg",
  });
  const canonical = withCanonicalImageFileType(original, "image/jpeg");
  assert.equal(canonical.type, "image/jpeg");
  assert.equal(canonical.name, "avatar.jpg");
  assert.equal(canonical.lastModified, original.lastModified);
});

test("identifica formatos animados antes da rasterização", () => {
  const pngSignature = [137, 80, 78, 71, 13, 10, 26, 10];
  const animatedPng = Uint8Array.from([
    ...pngSignature,
    ...pngChunk("IHDR", new Array(13).fill(0)),
    ...pngChunk("acTL", new Array(8).fill(0)),
  ]);
  const staticPng = Uint8Array.from([
    ...pngSignature,
    ...pngChunk("IHDR", new Array(13).fill(0)),
    ...pngChunk("IDAT"),
  ]);
  const animatedWebp = new Uint8Array(30);
  animatedWebp.set(ascii("RIFF"), 0);
  animatedWebp.set(ascii("WEBP"), 8);
  animatedWebp.set(ascii("VP8X"), 12);
  animatedWebp[20] = 0x02;

  assert.equal(probeImageAnimation(animatedPng, "image/png"), "animated");
  assert.equal(probeImageAnimation(staticPng, "image/png"), "static");
  assert.equal(probeImageAnimation(animatedWebp, "image/webp"), "animated");
  assert.equal(probeImageAnimation(new Uint8Array([1, 2, 3]), "image/png"), "unknown");
});
