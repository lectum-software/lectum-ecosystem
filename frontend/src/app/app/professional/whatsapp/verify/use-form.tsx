import { z } from "zod";
import { type Field, useFormList } from "@/hooks/form";
import {
  COUNTRY_CALLING_CODE_OPTIONS,
  DEFAULT_COUNTRY_CALLING_CODE,
  findCountryCallingCode,
} from "@/utils/country-calling-codes";

import {
  isNationalPhoneLengthValid,
  toWhatsappPhoneE164 as serializePhone,
  toWhatsappPhoneInput,
} from "@/utils/phone-number";

export type WhatsappPhoneForm = {
  countryCode: string;
  phone: string;
};

export { toWhatsappPhoneInput };

// Preserva o contrato legado de string vazia; o schema impede esse envio.
export const toWhatsappPhoneE164 = (value: string, countryCode = DEFAULT_COUNTRY_CALLING_CODE) =>
  serializePhone(value, countryCode) ?? "";

export const whatsappPhoneSchema = z
  .object({
    countryCode: z.string().min(1, "Selecione o país"),
    phone: z.string(),
  })
  .refine((data) => isNationalPhoneLengthValid(data.phone, data.countryCode), {
    message: "Informe um WhatsApp válido",
    path: ["phone"],
  });

const phoneFields = [
  {
    name: "phone",
    field: "phone",
    label: "WhatsApp profissional",
    placeholder: "(00) 00000-0000",
    countryCodeName: "countryCode",
    countryCodeOptions: COUNTRY_CALLING_CODE_OPTIONS.map((option) => ({
      ...option,
      label: `+${option.value}`,
      key: `${option.value}-${option.country}`,
    })),
    countryCodeClassName: "w-20 min-w-20 shrink-0 px-3 py-0.5 pr-8",
    required: true,
    autoComplete: "tel",
    autoFocus: true,
  },
] satisfies Field<WhatsappPhoneForm>[];

export const usePhoneForm = (initialPhone?: string | null) => {
  const countryCode = findCountryCallingCode(initialPhone);
  const phone = toWhatsappPhoneInput(initialPhone, countryCode);

  return useFormList<WhatsappPhoneForm>({
    fields: phoneFields,
    schema: whatsappPhoneSchema,
    defaultValues: {
      countryCode,
      phone,
    },
    values: {
      countryCode,
      phone,
    },
    resetOptions: {
      keepDirtyValues: true,
      keepErrors: true,
    },
  });
};
