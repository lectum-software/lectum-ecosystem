import assert from "node:assert/strict";
import { test } from "node:test";
import sharp from "sharp";
import {
  feedbackCategory,
  feedbackDescription,
  feedbackFingerprint,
  feedbackRequestId,
  feedbackStatus,
  feedbackVersion,
  feedbackViewport,
  prepareFeedbackImages,
} from "./policy";

test("feedback validates text, states and bounded technical data", () => {
  assert.equal(feedbackDescription.safeParse("          ").success, false);
  assert.equal(feedbackDescription.safeParse("x".repeat(4001)).success, false);
  assert.equal(feedbackDescription.parse("  Problema no aplicativo  "), "Problema no aplicativo");
  assert.equal(feedbackStatus.safeParse("deleted").success, false);
  assert.equal(feedbackCategory.safeParse("clinical").success, false);
  assert.equal(feedbackVersion.safeParse("https://private/?token=secret").success, false);
  assert.equal(feedbackViewport.safeParse("390x844").success, true);
  assert.equal(feedbackRequestId.safeParse("arbitrary-key").success, false);
});
test("feedback images are decoded, resized and stripped of metadata", async () => {
  const buffer = await sharp({
    create: { width: 1800, height: 800, channels: 3, background: "#2196f3" },
  })
    .withExif({ IFD0: { Artist: "Sensitive metadata" } })
    .png()
    .toBuffer();
  const [content] = await prepareFeedbackImages([
    { buffer, size: buffer.length, mimetype: "image/png" } as Express.Multer.File,
  ]);
  const metadata = await sharp(content).metadata();
  assert.equal(metadata.format, "jpeg");
  assert.equal(metadata.width, 1600);
  assert.equal(metadata.exif, undefined);
  assert.equal(metadata.xmp, undefined);
  assert.ok(content.length <= 1024 * 1024);
});
test("feedback rejects disguised content, unsupported media and excessive attachments", async () => {
  const file = {
    buffer: Buffer.from("<svg></svg>"),
    size: 11,
    mimetype: "image/png",
  } as Express.Multer.File;
  await assert.rejects(() => prepareFeedbackImages([file]));
  await assert.rejects(() => prepareFeedbackImages([{ ...file, mimetype: "image/svg+xml" }]));
  await assert.rejects(() => prepareFeedbackImages([file, file, file, file]));
  await assert.rejects(() => prepareFeedbackImages([{ ...file, size: 6 * 1024 * 1024 }]));
});
test("idempotency fingerprint binds message and attachments", () => {
  const image = Buffer.from("sample");
  assert.equal(feedbackFingerprint("Message", [image]), feedbackFingerprint("Message", [image]));
  assert.notEqual(feedbackFingerprint("Message", [image]), feedbackFingerprint("Changed", [image]));
  assert.notEqual(feedbackFingerprint("Message", [image]), feedbackFingerprint("Message", []));
});
