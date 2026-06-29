import { z } from "zod";
import { type Field, useFormList } from "@/hooks/form";

export const accountFormSchema = z
  .object({
    current_email: z.string().optional(),
    current_password: z.string(),
    email: z.string(),
    password: z.string(),
    password_confirm: z.string(),
  })
  .superRefine((values, ctx) => {
    const wantsEmailChange = values.email.trim().length > 0;
    const wantsPasswordChange = values.password.length > 0 || values.password_confirm.length > 0;

    if (!wantsEmailChange && !wantsPasswordChange) {
      ctx.addIssue({
        code: "custom",
        message: "Informe um novo e-mail ou uma nova senha para salvar.",
        path: ["email"],
      });
      return;
    }

    if ((wantsEmailChange || wantsPasswordChange) && values.current_password.length === 0) {
      ctx.addIssue({
        code: "custom",
        message: "Informe sua senha atual para confirmar a alteração.",
        path: ["current_password"],
      });
    }

    if (wantsEmailChange) {
      const parsedEmail = z.email().safeParse(values.email.trim());
      if (!parsedEmail.success) {
        ctx.addIssue({
          code: "custom",
          message: "Informe um e-mail válido.",
          path: ["email"],
        });
      }
    }

    if (wantsPasswordChange) {
      if (values.password.length < 10) {
        ctx.addIssue({
          code: "custom",
          message: "A nova senha precisa ter no mínimo 10 caracteres.",
          path: ["password"],
        });
      }

      if (values.password_confirm.length === 0) {
        ctx.addIssue({
          code: "custom",
          message: "Confirme a nova senha.",
          path: ["password_confirm"],
        });
      }

      if (values.password !== values.password_confirm) {
        ctx.addIssue({
          code: "custom",
          message: "As senhas não conferem.",
          path: ["password_confirm"],
        });
      }
    }
  });

export type AccountForm = z.infer<typeof accountFormSchema>;

export const emailFields = [
  {
    name: "current_email",
    field: "input",
    label: "E-mail atual",
    type: "email",
    autoComplete: "email",
    disabled: true,
    readOnly: true,
  },
  {
    name: "email",
    field: "input",
    label: "Novo e-mail",
    placeholder: "Digite o novo e-mail",
    type: "email",
    autoComplete: "email",
  },
] satisfies Field<AccountForm>[];

export const passwordFields = [
  {
    name: "current_password",
    field: "input",
    label: "Senha atual",
    placeholder: "Digite sua senha atual",
    type: "password",
    autoComplete: "current-password",
    description: "Obrigatória para alterar e-mail ou senha.",
  },
  {
    name: "password",
    field: "input",
    label: "Nova senha",
    placeholder: "Mínimo 10 caracteres",
    type: "password",
    autoComplete: "new-password",
  },
  {
    name: "password_confirm",
    field: "input",
    label: "Confirmar nova senha",
    placeholder: "Repita a nova senha",
    type: "password",
    autoComplete: "new-password",
  },
] satisfies Field<AccountForm>[];

export const accountFields = [...emailFields, ...passwordFields] satisfies Field<AccountForm>[];

export const useAccountForm = (currentEmail?: string | null) => {
  return useFormList<AccountForm>({
    fields: accountFields,
    schema: accountFormSchema,
    values: {
      current_email: currentEmail || "",
      current_password: "",
      email: "",
      password: "",
      password_confirm: "",
    },
    resetOptions: {
      keepDirtyValues: true,
    },
  });
};
