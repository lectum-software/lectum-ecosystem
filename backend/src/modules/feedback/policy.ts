import { createHash } from "node:crypto";
import sharp from "sharp";
import { z } from "zod";

export const feedbackDescription = z.string().trim().min(10).max(4000);
export const feedbackStatus = z.enum(["new", "reviewing", "resolved"]);
export const feedbackCategory = z.enum(["unclassified", "technical", "suggestion"]);
export const feedbackRequestId = z.uuid();
export const feedbackVersion = z
  .string()
  .regex(/^\d+\.\d+\.\d+$/)
  .max(30)
  .optional();
export const feedbackViewport = z
  .string()
  .regex(/^\d{2,5}x\d{2,5}$/)
  .optional();
export const MAX_ATTACHMENT_SIZE = 5 * 1024 * 1024;

export async function prepareFeedbackImages(files: Express.Multer.File[]) {
  if (files.length > 3) throw new Error("FEEDBACK_IMAGE");
  const images: Buffer[] = [];
  for (const file of files) {
    if (
      file.size > MAX_ATTACHMENT_SIZE ||
      !["image/jpeg", "image/png", "image/webp"].includes(file.mimetype)
    )
      throw new Error("FEEDBACK_IMAGE");
    const input = sharp(file.buffer, {
      limitInputPixels: 16_000_000,
      animated: false,
      failOn: "warning",
    });
    const metadata = await input.metadata();
    if (!["jpeg", "png", "webp"].includes(metadata.format ?? "") || (metadata.pages ?? 1) > 1)
      throw new Error("FEEDBACK_IMAGE");
    const content = await input
      .rotate()
      .resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true })
      .flatten({ background: "#ffffff" })
      .jpeg({ quality: 85 })
      .toBuffer();
    if (content.length > 1024 * 1024) throw new Error("FEEDBACK_IMAGE");
    images.push(content);
  }
  return images;
}

export function feedbackFingerprint(description: string, images: Buffer[]) {
  return createHash("sha256")
    .update(
      JSON.stringify([
        description,
        ...images.map((image) => createHash("sha256").update(image).digest("hex")),
      ]),
    )
    .digest("hex");
}
