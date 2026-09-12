import { z } from "zod";
import { validator } from "@/utils/validator";
export const statusValidator = validator({});
export const acceptValidator = validator({
  body: [
    {
      key: "document_ids",
      custom: z
        .array(z.string().min(1).max(160))
        .length(2, { message: "Selecione os documentos atuais." }),
    },
    { key: "terms_accepted", custom: z.boolean() },
    { key: "privacy_acknowledged", custom: z.boolean() },
    { key: "adult_confirmed", custom: z.boolean() },
  ],
});
