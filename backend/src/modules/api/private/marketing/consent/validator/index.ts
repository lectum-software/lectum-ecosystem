import { z } from "zod";
import { validator } from "@/utils/validator";

const campaign = z
  .string()
  .regex(/^[A-Za-z0-9_-]{1,128}$/)
  .optional();
export const statusValidator = validator({});
export const grantValidator = validator({
  body: [
    { key: "accepted", custom: z.literal(true) },
    { key: "document_version", custom: z.string().min(1).max(160) },
    { key: "expected_revision", custom: z.number().int().min(0).max(Number.MAX_SAFE_INTEGER) },
    {
      key: "guest_token",
      custom: z
        .string()
        .regex(/^[a-f0-9]{64}$/)
        .optional(),
    },
    { key: "authorize_transfer", custom: z.literal(true).optional() },
    {
      key: "campaigns",
      custom: z
        .object({
          utm_source: campaign,
          utm_medium: campaign,
          utm_campaign: campaign,
          utm_content: campaign,
          utm_term: campaign,
        })
        .strict()
        .optional(),
    },
  ],
});
