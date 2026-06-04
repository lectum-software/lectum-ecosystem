import { z } from "zod";
import { type Field, useFormList } from "@/hooks/form";

export const verifyEmailSchema = z.object({
  code: z.string().regex(/^\d{6}$/, "Informe o código de 6 dígitos"),
});

export type VerifyEmailForm = z.infer<typeof verifyEmailSchema>;

const fields = [
  {
    name: "code",
    field: "otp",
    label: "Código de confirmação",
    description: "Digite os 6 números enviados para o seu e-mail.",
    length: 6,
    autoFocus: true,
    required: true,
  },
] satisfies Field<VerifyEmailForm>[];

export const useForm = () => {
  return useFormList<VerifyEmailForm>({
    fields,
    schema: verifyEmailSchema,
    defaultValues: {
      code: "",
    },
  });
};
