import { z } from "zod";
import { type Field, useFormList } from "@/hooks/form";

export const recoverySchema = z.object({
  email: z.email("Informe um e-mail válido"),
});

export type RecoveryForm = z.infer<typeof recoverySchema>;

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
] satisfies Field<RecoveryForm>[];

export const useForm = () => {
  return useFormList<RecoveryForm>({
    fields,
    schema: recoverySchema,
    defaultValues: {
      email: "",
    },
  });
};
