import { z } from "zod";
import { validator } from "@/utils/validator";
import { feeDay } from "../use-cases/services";
export const listValidator = validator({
  query: [
    { key: "from", custom: feeDay.optional() },
    { key: "to", custom: feeDay.optional() },
    { key: "page", custom: z.coerce.number().int().min(1).max(100000).optional() },
    { key: "limit", custom: z.coerce.number().int().min(1).max(50).optional() },
  ],
});
export const observeValidator = validator({
  params: [{ key: "receiptId", custom: z.string().regex(/^[A-Za-z0-9_-]{1,128}$/) }],
});
