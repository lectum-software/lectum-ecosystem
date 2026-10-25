import type { Resolve } from "@/helpers/return";
import { error, msg } from "@/helpers/translate";
import { feedbackFingerprint, prepareFeedbackImages } from "@/modules/feedback/policy";
import type { FeedbackInput } from "../DTOs";
import { FeedbackRepository } from "../repositories/FeedbackRepository";

export const feedbackRepository = new FeedbackRepository();

export async function submitFeedback(
  userId: string,
  input: FeedbackInput,
  files: Express.Multer.File[],
): Promise<Resolve> {
  let images: Buffer[];
  try {
    images = await prepareFeedbackImages(files);
  } catch {
    return { status: 400, ...error("feedback_image") };
  }
  const result = await feedbackRepository.create(
    userId,
    input,
    images,
    feedbackFingerprint(input.description, images),
  );
  if ("error" in result)
    return {
      status: result.error === "feedback_limit" ? 429 : 409,
      ...error(result.error ?? "feedback_conflict"),
    };
  return { status: 201, ...msg("feedback_sent", result) };
}
