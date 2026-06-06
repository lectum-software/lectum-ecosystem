import { z } from "zod";
import { type Field, useFormList } from "@/hooks/form";

const onlyDigits = (value: string) => value.replace(/\D/g, "");

const isValidCpf = (value: string) => {
  const cpf = onlyDigits(value);

  if (cpf.length !== 11) return false;
  if (/^(\d)\1+$/.test(cpf)) return false;

  const calcDigit = (base: string, factor: number) => {
    const total = base
      .split("")
      .reduce((sum, digit, index) => sum + Number(digit) * (factor - index), 0);
    const rest = (total * 10) % 11;
    return rest === 10 ? 0 : rest;
  };

  const digit1 = calcDigit(cpf.slice(0, 9), 10);
  const digit2 = calcDigit(cpf.slice(0, 10), 11);

  return digit1 === Number(cpf[9]) && digit2 === Number(cpf[10]);
};

export const cfpSearchSchema = z.object({
  cpf: z
    .string()
    .trim()
    .refine((value) => onlyDigits(value).length === 11, "Informe os 11 dígitos do CPF")
    .refine(isValidCpf, "Informe um CPF válido"),
});

export type CfpSearchForm = z.infer<typeof cfpSearchSchema>;

const fields = [
  {
    name: "cpf",
    field: "cpf",
    label: "CPF",
    placeholder: "000.000.000-00",
    autoComplete: "off",
    inputClassName: "h-[55px] rounded-[14px] bg-surface text-base shadow-sm",
  },
] satisfies Field<CfpSearchForm>[];

export const useForm = () => {
  return useFormList<CfpSearchForm>({
    fields,
    schema: cfpSearchSchema,
    defaultValues: {
      cpf: "",
    },
  });
};
