import { z } from "zod";
import { validator } from "@/utils/validator";

const localId = z.string().regex(/^[A-Za-z0-9_-]{1,100}$/);

export const invoicePdfValidator = validator({
  params: [{ key: "id", custom: localId }],
  query: [{ key: "user_id", custom: localId }],
});
