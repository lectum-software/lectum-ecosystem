import { z } from "zod";
import { type Field, useFormList } from "@/hooks/form";

export const TERMS_VERSION = "task09-professional-terms-pending-legal-copy";

export const registerPsychologistSchema = z
  .object({
    professional_first_name: z
      .string()
      .trim()
      .min(2, "Informe seu nome")
      .max(80, "Use no m\u00e1ximo 80 caracteres"),
    professional_last_name: z
      .string()
      .trim()
      .min(1, "Informe seu sobrenome")
      .max(120, "Use no m\u00e1ximo 120 caracteres"),
    email: z.email("Informe um e-mail profissional v\u00e1lido"),
    password: z
      .string()
      .min(10, "Use no m\u00ednimo 10 caracteres")
      .max(128, "Use no m\u00e1ximo 128 caracteres"),
    password_confirm: z.string().min(1, "Confirme sua senha"),
    terms_accepted: z.boolean().refine((value) => value, {
      message: "Aceite os termos profissionais para continuar",
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

export type RegisterPsychologistForm = z.infer<typeof registerPsychologistSchema>;

const fields = [
  {
    name: "professional_first_name",
    field: "input",
    label: "Nome",
    placeholder: "Ex.: Ana Clara",
    after: (
      <span className="mt-1 block text-xs font-normal leading-5 text-muted">
        Esse nome aparece no botão de WhatsApp do seu perfil.
      </span>
    ),
    autoComplete: "given-name",
    inputClassName: "h-14 rounded-[var(--lectum-control-radius)] bg-surface-muted text-base",
  },
  {
    name: "professional_last_name",
    field: "input",
    label: "Sobrenome",
    placeholder: "Ex.: Martins",
    autoComplete: "family-name",
    inputClassName: "h-14 rounded-[var(--lectum-control-radius)] bg-surface-muted text-base",
  },
  {
    name: "email",
    field: "input",
    label: "E-mail profissional",
    placeholder: "nome@exemplo.com",
    type: "email",
    autoComplete: "email",
    inputClassName: "h-14 rounded-[var(--lectum-control-radius)] bg-surface-muted text-base",
  },
  {
    name: "password",
    field: "input",
    label: "Senha",
    placeholder: "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022",
    type: "password",
    autoComplete: "new-password",
    inputClassName: "h-14 rounded-[var(--lectum-control-radius)] bg-surface-muted text-base",
  },
  {
    name: "password_confirm",
    field: "input",
    label: "Confirmar senha",
    placeholder: "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022",
    type: "password",
    autoComplete: "new-password",
    inputClassName: "h-14 rounded-[var(--lectum-control-radius)] bg-surface-muted text-base",
  },
  {
    name: "terms_accepted",
    field: "checkbox",
    label:
      "Ao criar uma conta, voc\u00ea concorda com nossos Termos de Servi\u00e7o e Pol\u00edtica de Privacidade.",
    inputClassName: "mt-0.5 h-4 w-4",
  },
] satisfies Field<RegisterPsychologistForm>[];

export const useForm = () => {
  return useFormList<RegisterPsychologistForm>({
    fields,
    schema: registerPsychologistSchema,
    defaultValues: {
      professional_first_name: "",
      professional_last_name: "",
      email: "",
      password: "",
      password_confirm: "",
      terms_accepted: false,
    },
  });
};
