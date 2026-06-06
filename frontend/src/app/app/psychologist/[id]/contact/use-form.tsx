import { z } from "zod";
import { onlyDigits } from "@/components/controllers/utils";
import { type Field, useFormList } from "@/hooks/form";

export type WhatsAppContactForm = {
  patient_phone: string;
  consent_accepted: boolean;
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

export const toContactPhoneInput = (value?: string | null) => {
  return onlyDigits(value).slice(0, 13);
};

export const toContactPhoneE164 = (value: string) => {
  const nationalDigits = getBrazilNationalDigits(value);

  return nationalDigits ? `+55${nationalDigits}` : "";
};

export const whatsappContactSchema = z.object({
  patient_phone: z.string().refine(isBrazilPhone, {
    message: "Informe um WhatsApp com DDD válido",
  }),
  consent_accepted: z.boolean().refine((value) => value, {
    message: "Aceite a política de privacidade para continuar",
  }),
});

const fields = [
  {
    name: "patient_phone",
    field: "phone",
    label: "Seu WhatsApp",
    placeholder: "(00) 00000-0000",
    description: "Usaremos este número para registrar sua intenção de contato.",
    required: true,
    autoComplete: "tel",
    autoFocus: true,
  },
  {
    name: "consent_accepted",
    field: "checkbox",
    label:
      "Aceito que a Lectum registre esta intenção de contato e abra o WhatsApp com uma mensagem inicial para o profissional.",
    required: true,
    inputClassName: "mt-0.5 h-4 w-4",
  },
] satisfies Field<WhatsAppContactForm>[];

export const useForm = (initialPhone?: string | null) => {
  const phone = toContactPhoneInput(initialPhone);

  return useFormList<WhatsAppContactForm>({
    fields,
    schema: whatsappContactSchema,
    defaultValues: {
      patient_phone: phone,
      consent_accepted: false,
    },
    values: {
      patient_phone: phone,
      consent_accepted: false,
    },
    resetOptions: {
      keepDirtyValues: true,
      keepErrors: true,
    },
  });
};
