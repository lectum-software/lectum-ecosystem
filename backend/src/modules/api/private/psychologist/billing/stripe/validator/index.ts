import { z } from "zod";
import { validator } from "@/utils/validator";

const requestKey = z.uuid();
const quoteRevision = z
  .string()
  .min(3)
  .max(160)
  .regex(/^[A-Za-z0-9_-]+:[1-9][0-9]*$/);
const operationId = z
  .string()
  .min(16)
  .max(64)
  .regex(/^[A-Za-z0-9-]+$/);
const intent = z.literal("courtesy_renewal");

export const configValidator = validator({
  query: [{ key: "intent", custom: intent, optional: true }],
});
export const checkoutValidator = validator({
  body: [
    { key: "request_key", custom: requestKey },
    { key: "quote_revision", custom: quoteRevision },
    { key: "intent", custom: intent, optional: true },
  ],
});
export const cardValidator = validator({ body: [{ key: "request_key", custom: requestKey }] });
export const confirmValidator = validator({
  params: [{ key: "id", custom: operationId }],
  body: [],
});
