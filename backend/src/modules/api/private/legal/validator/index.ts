import { z } from "zod";
import { validator } from "@/utils/validator";
export const statusValidator = validator({});
export const acceptValidator = validator({
  body: [
    {
      key: "document_ids",
      custom: z
        .array(z.string().min(1).max(160))
        .min(1, { message: "Selecione os documentos pendentes." })
        .max(2),
    },
    { key: "terms_accepted", custom: z.boolean() },
    { key: "privacy_acknowledged", custom: z.boolean() },
    { key: "adult_confirmed", custom: z.boolean() },
  ],
});
