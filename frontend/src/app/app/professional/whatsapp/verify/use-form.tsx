import { z } from "zod";
import { onlyDigits } from "@/components/controllers/utils";
import { type Field, useFormList } from "@/hooks/form";
import {
  COUNTRY_CALLING_CODE_OPTIONS,
  DEFAULT_COUNTRY_CALLING_CODE,
  findCountryCallingCode,
} from "@/utils/country-calling-codes";

export type WhatsappPhoneForm = {
  countryCode: string;
  phone: string;
};

const getNationalDigits = (value?: string | null, countryCode = DEFAULT_COUNTRY_CALLING_CODE) => {
  const digits = onlyDigits(value);

  if (digits.startsWith(countryCode) && digits.length > countryCode.length) {
    return digits.slice(countryCode.length);
  }

  return digits;
};

const isPhoneLengthValid = (value: string, countryCode: string) => {
  const nationalDigits = getNationalDigits(value, countryCode);
  const totalLength = (countryCode + nationalDigits).length;

  return nationalDigits.length >= 6 && totalLength <= 15;
};

export const toWhatsappPhoneInput = (
  value?: string | null,
  countryCode = DEFAULT_COUNTRY_CALLING_CODE,
) => getNationalDigits(value, countryCode).slice(0, 15);

export const toWhatsappPhoneE164 = (value: string, countryCode = DEFAULT_COUNTRY_CALLING_CODE) => {
  const nationalDigits = getNationalDigits(value, countryCode);

  return nationalDigits ? `+${countryCode}${nationalDigits}` : "";
};

export const whatsappPhoneSchema = z
  .object({
    countryCode: z.string().min(1, "Selecione o país"),
    phone: z.string(),
  })
  .refine((data) => isPhoneLengthValid(data.phone, data.countryCode), {
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
