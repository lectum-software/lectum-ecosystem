import { z } from "zod";
import { type Field, useFormList } from "@/hooks/form";

const strongPasswordRegex =
  /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]).+$/;

export const TERMS_VERSION = "task07-pending-legal-copy";

export const registerPatientSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, "Informe seu nome completo")
      .max(120, "Use no máximo 120 caracteres"),
    email: z.email("Informe um e-mail válido"),
    password: z
      .string()
      .min(12, "Use no mínimo 12 caracteres")
      .max(128, "Use no máximo 128 caracteres")
      .regex(strongPasswordRegex, "Use maiúscula, minúscula, número e caractere especial"),
    password_confirm: z.string().min(1, "Confirme sua senha"),
    terms_accepted: z.boolean().refine((value) => value, {
      message: "Aceite os termos para continuar",
    }),
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
    label: "Nome completo",
    placeholder: "Seu nome",
    autoComplete: "name",
    required: true,
  },
  {
    name: "email",
    field: "input",
    label: "E-mail",
    placeholder: "nome@exemplo.com",
    type: "email",
    autoComplete: "email",
    required: true,
  },
  {
    name: "password",
    field: "input",
    label: "Senha",
    placeholder: "Crie uma senha forte",
    type: "password",
    autoComplete: "new-password",
    required: true,
  },
  {
    name: "password_confirm",
    field: "input",
    label: "Confirmar senha",
    placeholder: "Repita sua senha",
    type: "password",
    autoComplete: "new-password",
    required: true,
  },
  {
    name: "terms_accepted",
    field: "checkbox",
    label: "Aceito os termos de uso e a política de privacidade",
    description: "O texto legal final ainda será revisado nas próximas etapas de LGPD.",
    required: true,
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
      terms_accepted: false,
    },
  });
};
