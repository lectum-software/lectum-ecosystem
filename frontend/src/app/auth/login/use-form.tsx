import { z } from "zod";
import { type Field, useFormList } from "@/hooks/form";

export const loginSchema = z.object({
  email: z.email("Informe um e-mail válido"),
  password: z.string().min(1, "Informe sua senha"),
});

export type LoginForm = z.infer<typeof loginSchema>;

const fields = [
  {
    name: "email",
    field: "input",
    label: "E-mail",
    placeholder: "seu@email.com",
    type: "email",
    autoComplete: "email",
    required: true,
  },
  {
    name: "password",
    field: "input",
    label: "Senha",
    placeholder: "Digite sua senha",
    type: "password",
    autoComplete: "current-password",
    required: true,
  },
] satisfies Field<LoginForm>[];

export const useForm = () => {
  return useFormList<LoginForm>({
    fields,
    schema: loginSchema,
    defaultValues: {
      email: "",
      password: "",
    },
  });
};
