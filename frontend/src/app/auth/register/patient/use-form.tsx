import { z } from "zod";
import { ADULT_DECLARATION, adultConfirmedSchema } from "@/components/legal/use-form";
import { type Field, useFormList } from "@/hooks/form";

// Compatibility only: never a published document or authoritative legal acceptance.
export const LEGACY_TERMS_VERSION = "task07-pending-legal-copy";

export const registerPatientSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, "Informe seu nome de exibição")
      .max(120, "Use no máximo 120 caracteres"),
    email: z.email("Informe um e-mail válido"),
    password: z
      .string()
      .min(10, "Use no mínimo 10 caracteres")
      .max(128, "Use no máximo 128 caracteres"),
    password_confirm: z.string().min(1, "Confirme sua senha"),
    adult_confirmed: adultConfirmedSchema,
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

export type RegisterPatientForm = z.infer<typeof registerPatientSchema>;

const fields = [
  {
    name: "name",
    field: "input",
    label: "Nome de exibição",
    placeholder: "Seu nome",
    autoComplete: "name",
    required: true,
    inputClassName: "h-14 rounded-[var(--lectum-control-radius)] bg-surface-muted text-base",
  },
  {
    name: "email",
    field: "input",
    label: "E-mail",
    placeholder: "nome@exemplo.com",
    type: "email",
    autoComplete: "email",
    required: true,
    inputClassName: "h-14 rounded-[var(--lectum-control-radius)] bg-surface-muted text-base",
  },
  {
    name: "password",
    field: "input",
    label: "Senha",
    placeholder: "••••••••",
    type: "password",
    autoComplete: "new-password",
    required: true,
    inputClassName: "h-14 rounded-[var(--lectum-control-radius)] bg-surface-muted text-base",
  },
  {
    name: "password_confirm",
    field: "input",
    label: "Confirmar senha",
    placeholder: "••••••••",
    type: "password",
    autoComplete: "new-password",
    required: true,
    inputClassName: "h-14 rounded-[var(--lectum-control-radius)] bg-surface-muted text-base",
  },
  {
    name: "adult_confirmed",
    field: "checkbox",
    label: ADULT_DECLARATION,
    inputClassName: "mt-0.5 h-4 w-4",
  },
] satisfies Field<RegisterPatientForm>[];

export const useForm = () => {
  return useFormList<RegisterPatientForm>({
    fields,
    schema: registerPatientSchema,
    defaultValues: {
      name: "",
      email: "",
      password: "",
      password_confirm: "",
      adult_confirmed: false,
    },
  });
};
