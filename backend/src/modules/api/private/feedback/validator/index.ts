import { z } from "zod";
import {
  feedbackDescription,
  feedbackRequestId,
  feedbackVersion,
  feedbackViewport,
} from "@/modules/feedback/policy";
import { validator } from "@/utils/validator";

export const createValidator = validator({
  body: [
    { key: "description", custom: feedbackDescription },
    { key: "request_id", custom: feedbackRequestId },
    { key: "app_version", custom: feedbackVersion },
    { key: "viewport", custom: feedbackViewport },
  ],
});
export const idField = { key: "id", custom: z.string().min(1).max(100) };
