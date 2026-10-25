import { z } from "zod";
import { idField } from "@/modules/api/private/feedback/validator";
import { feedbackCategory, feedbackStatus } from "@/modules/feedback/policy";
import { validator } from "@/utils/validator";

export const detailValidator = validator({ params: [idField] });
export const attachmentValidator = validator({
  params: [idField, { key: "attachmentId", custom: z.string().min(1).max(100) }],
});
export const listValidator = validator({
  query: [
    { key: "page", custom: z.coerce.number().int().min(1).max(100000).optional() },
    { key: "q", custom: z.string().trim().max(120).optional() },
    { key: "status", custom: feedbackStatus.optional() },
    { key: "category", custom: feedbackCategory.optional() },
    { key: "role", custom: z.enum(["paciente", "psicologo"]).optional() },
  ],
});
export const updateValidator = validator({
  params: [idField],
  body: [
    { key: "revision", custom: z.number().int().min(0) },
    { key: "status", custom: feedbackStatus },
    { key: "category", custom: feedbackCategory },
    { key: "internal_note", custom: z.string().trim().max(4000) },
  ],
});
