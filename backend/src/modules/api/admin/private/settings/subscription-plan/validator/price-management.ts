import { z } from "zod";
import { validator } from "@/utils/validator";

const localId = z.string().regex(/^[A-Za-z0-9_-]{1,128}$/);
const revision = { key: "expected_revision", custom: z.number().int().min(0).max(2147483646) };
export const catalogListValidator = validator({
  query: [
    { key: "cursor", custom: localId.optional() },
    { key: "limit", custom: z.coerce.number().int().min(1).max(50).optional() },
  ],
});
export const createPriceValidator = validator({
  body: [
    { key: "amount_cents", custom: z.number().int().min(50).max(99999999) },
    { key: "request_key", custom: z.uuid({ version: "v4" }) },
    { key: "confirm_new_adhesions_only", custom: z.literal(true) },
  ],
});
export const resumePriceValidator = validator({ params: [{ key: "id", custom: localId }] });
export const linkOfferValidator = validator({
  body: [
    { key: "price_version_id", custom: localId },
    revision,
    { key: "confirm_new_adhesions_only", custom: z.literal(true) },
  ],
});
export const changeOfferValidator = validator({
  body: [
    { key: "enabled", custom: z.boolean() },
    revision,
    { key: "confirm_publish", custom: z.literal(true).optional() },
  ],
});
