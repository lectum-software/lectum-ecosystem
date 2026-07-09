import { z } from "zod";
import { type Field, useFormList } from "@/hooks/form";

export const adminLoginSchema = z.object({
  email: z.email("Informe um e-mail válido"),
  password: z.string().min(1, "Informe sua senha"),
});

export type AdminLoginForm = z.infer<typeof adminLoginSchema>;

const fields = [
  {
    name: "email",
    field: "input",
    label: "E-mail administrativo",
    placeholder: "admin@lectum.com",
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
] satisfies Field<AdminLoginForm>[];

export const useAdminLoginForm = () => {
  return useFormList<AdminLoginForm>({
    defaultValues: {
      email: "",
      password: "",
    },
    fields,
    schema: adminLoginSchema,
  });
};
