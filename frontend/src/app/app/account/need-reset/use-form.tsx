import { z } from "zod";
import { type Field, useFormList } from "@/hooks/form";

export const needResetPasswordSchema = z
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

export type NeedResetPasswordForm = z.infer<typeof needResetPasswordSchema>;

const fields = [
  {
    name: "password",
    field: "input",
    label: "Nova senha definitiva",
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
] satisfies Field<NeedResetPasswordForm>[];

export const useNeedResetPasswordForm = () => {
  return useFormList<NeedResetPasswordForm>({
    fields,
    schema: needResetPasswordSchema,
    defaultValues: {
      password: "",
      password_confirm: "",
    },
  });
};
