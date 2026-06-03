import { zodResolver } from "@hookform/resolvers/zod";
import { useForm as useHookForm } from "react-hook-form";
import { z } from "zod";

export const loginSchema = z.object({
  email: z.email("Informe um e-mail valido"),
  password: z.string().min(1, "Informe sua senha"),
});

export type LoginForm = z.infer<typeof loginSchema>;

export const useForm = () => {
  const hook = useHookForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  return {
    hook,
    isDirty: hook.formState.isDirty,
  };
};
