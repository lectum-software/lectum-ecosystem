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

test("aplica limites por finalidade sem ampliar nem deformar imagens", () => {
  const avatar = resolveImagePreparationPolicy("professional-avatar");
  assert.deepEqual(resolveImageTargetDimensions(2048, 1024, avatar), {
    height: 256,
    resized: true,
    width: 512,
  });
  assert.deepEqual(resolveImageTargetDimensions(300, 200, avatar), {
    height: 200,
    resized: false,
    width: 300,
  });

  const post = resolveImagePreparationPolicy("community-post-image");
  assert.deepEqual(resolveImageTargetDimensions(3000, 4000, post), {
    height: 2048,
    resized: true,
    width: 1536,
  });
});

test("analisa arquivos grandes e ignora miniaturas já preparadas", () => {
  const avatar = resolveImagePreparationPolicy("patient-avatar");
  assert.equal(
    shouldAttemptImagePreparation({ fileSize: 64 * 1024, height: 300, policy: avatar, width: 300 }),
    false,
  );
  assert.equal(
    shouldAttemptImagePreparation({
      fileSize: 64 * 1024,
      height: 2000,
      policy: avatar,
      width: 1000,
    }),
    true,
  );

  const thumbnail = resolveImagePreparationPolicy("generated-video-thumbnail");
  assert.equal(
    shouldAttemptImagePreparation({
      fileSize: 4 * 1024 * 1024,
      height: 3000,
      policy: thumbnail,
      width: 3000,
    }),
    false,
  );
});

test("só adota candidato válido com ganho material", () => {
  assert.equal(shouldUseImageCandidate(1000, 950), true);
  assert.equal(shouldUseImageCandidate(1000, 951), false);
  assert.equal(shouldUseImageCandidate(1000, 999, true), true);
  assert.equal(shouldUseImageCandidate(1000, 1000), false);
  assert.equal(shouldUseImageCandidate(1000, 1001), false);
  assert.equal(shouldUseImageCandidate(1000, 0), false);
});

test("normaliza formatos aceitos sem remover transparência", () => {
  assert.equal(normalizeImageMimeType("image/JPG"), "image/jpeg");
  assert.equal(normalizeImageMimeType("image/png; charset=binary"), "image/png");
  assert.equal(normalizeImageMimeType("image/gif"), null);
  assert.equal(resolveImageOutputMimeType("image/png", true), "image/png");
  assert.equal(resolveImageOutputMimeType("image/webp", true), "image/webp");
  assert.equal(resolveImageOutputMimeType("image/jpeg", true), null);
  assert.equal(resolveImageFileMimeType({ name: "camera.JPEG", type: "" }), "image/jpeg");
  assert.equal(resolveImageFileMimeType({ name: "arquivo.pdf", type: "" }), null);
  assert.equal(resolveImageFileMimeType({ name: "arquivo.png", type: "application/pdf" }), null);
});

test("detecta alpha e mantém extensão coerente com o MIME", () => {
  assert.equal(hasTransparentPixels(Uint8ClampedArray.from([0, 0, 0, 255, 0, 0, 0, 254])), true);
  assert.equal(hasTransparentPixels(Uint8ClampedArray.from([0, 0, 0, 255])), false);
  assert.equal(withImageFileExtension("foto.PNG", "image/jpeg"), "foto.jpg");
  assert.equal(withImageFileExtension("sem-extensao", "image/webp"), "sem-extensao.webp");

  const original = new File([Uint8Array.from([1, 2, 3])], "camera.JPEG", {
    lastModified: 123,
    type: "",
  });
  const canonical = withCanonicalImageFileType(original, "image/jpeg");
  assert.equal(canonical.type, "image/jpeg");
  assert.equal(canonical.name, "camera.jpg");
  assert.equal(canonical.size, original.size);
  assert.equal(canonical.lastModified, original.lastModified);
});

test("preserva APNG e WebP animado sem rasterizar os frames", () => {
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
  assert.equal(probeImageAnimation(new Uint8Array([1, 2, 3]), "image/webp"), "unknown");
});
