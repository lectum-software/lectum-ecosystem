import { z } from "zod";
import { type Field, useFormList } from "@/hooks/form";

const buildDeleteAccountSchema = (requiresPassword: boolean) =>
  z
    .object({
      confirmation: z.string().trim(),
      current_password: z.string().optional(),
    })
    .superRefine((values, ctx) => {
      if (requiresPassword && !values.current_password) {
        ctx.addIssue({
          code: "custom",
          message: "Informe sua senha atual para excluir a conta.",
          path: ["current_password"],
        });
      }

      if (values.confirmation.toUpperCase() !== "EXCLUIR") {
        ctx.addIssue({
          code: "custom",
          message: "Digite EXCLUIR para confirmar.",
          path: ["confirmation"],
        });
      }
    });

export const deleteAccountSchema = buildDeleteAccountSchema(false);

export type DeleteAccountForm = z.infer<typeof deleteAccountSchema>;

const buildFields = (hasPassword: boolean) =>
  [
    {
      name: "current_password",
      field: "input",
      label: "Senha atual",
      placeholder: "Digite sua senha atual",
      type: "password",
      autoComplete: "current-password",
      hide: !hasPassword,
      description: "Obrigatória para excluir uma conta com senha cadastrada.",
    },
    {
      name: "confirmation",
      field: "input",
      label: "Confirmação",
      placeholder: "Digite EXCLUIR",
      autoComplete: "off",
      description: "Esta ação é permanente e remove seus dados pessoais da plataforma.",
    },
  ] satisfies Field<DeleteAccountForm>[];

export const useDeleteAccountForm = (hasPassword: boolean) => {
  return useFormList<DeleteAccountForm>({
    fields: buildFields(hasPassword),
    schema: buildDeleteAccountSchema(hasPassword),
    values: {
      confirmation: "",
      current_password: "",
    },
    resetOptions: {
      keepDirtyValues: true,
    },
  });
};
