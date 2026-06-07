import { z } from "zod";
import { onlyDigits } from "@/components/controllers/utils";
import { type Field, useFormList } from "@/hooks/form";

export type WhatsappPhoneForm = {
  phone: string;
};

const getBrazilNationalDigits = (value?: string | null) => {
  const digits = onlyDigits(value);

  if (digits.startsWith("55") && digits.length > 11) {
    return digits.slice(2);
  }

  return digits;
};

const isBrazilPhone = (value: string) => {
  const nationalDigits = getBrazilNationalDigits(value);

  return nationalDigits.length === 10 || nationalDigits.length === 11;
};

export const toWhatsappPhoneInput = (value?: string | null) => onlyDigits(value).slice(0, 13);

export const toWhatsappPhoneE164 = (value: string) => {
  const nationalDigits = getBrazilNationalDigits(value);

  return nationalDigits ? `+55${nationalDigits}` : "";
};

export const whatsappPhoneSchema = z.object({
  phone: z.string().refine(isBrazilPhone, {
    message: "Informe um WhatsApp com DDD válido",
  }),
});

const phoneFields = [
  {
    name: "phone",
    field: "phone",
    label: "WhatsApp profissional",
    placeholder: "(00) 00000-0000",
    description: "Usaremos este número para gerar o link de contato por WhatsApp.",
    required: true,
    autoComplete: "tel",
    autoFocus: true,
  },
] satisfies Field<WhatsappPhoneForm>[];

export const usePhoneForm = (initialPhone?: string | null) => {
  const phone = toWhatsappPhoneInput(initialPhone);

  return useFormList<WhatsappPhoneForm>({
    fields: phoneFields,
    schema: whatsappPhoneSchema,
    defaultValues: {
      phone,
    },
    values: {
      phone,
    },
    resetOptions: {
      keepDirtyValues: true,
      keepErrors: true,
    },
  });
};
