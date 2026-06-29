import { z } from "zod";
import { type Field, useFormList } from "@/hooks/form";

export const resetPasswordSchema = z
  .object({
    password: z
      .string()
      .min(10, "Use no mínimo 10 caracteres")
      .max(128, "Use no máximo 128 caracteres"),
    password_confirm: z.string().min(1, "Confirme sua nova senha"),
  })
  .superRefine((data, ctx) => {
    if (data.password !== data.password_confirm) {
      ctx.addIssue({
        code: "custom",
        path: ["password_confirm"],
        message: "As senhas precisam ser iguais",
      });
    }
  });

export type ResetPasswordForm = z.infer<typeof resetPasswordSchema>;

const fields = [
  {
    name: "password",
    field: "input",
    label: "Nova senha",
    placeholder: "Digite sua nova senha",
    type: "password",
    autoComplete: "new-password",
    required: true,
  },
  {
    name: "password_confirm",
    field: "input",
    label: "Confirmar nova senha",
    placeholder: "Repita a nova senha",
    type: "password",
    autoComplete: "new-password",
    required: true,
  },
] satisfies Field<ResetPasswordForm>[];

export const useForm = () => {
  return useFormList<ResetPasswordForm>({
    fields,
    schema: resetPasswordSchema,
    defaultValues: {
      password: "",
      password_confirm: "",
    },
  });
};
