import { onlyDigits } from "@/components/controllers/utils";
import { DEFAULT_COUNTRY_CALLING_CODE } from "./country-calling-codes";

// A API armazena o número internacional. Apenas a hidratação retira o DDI.
export const toWhatsappPhoneInput = (
  value?: string | null,
  countryCode = DEFAULT_COUNTRY_CALLING_CODE,
) => {
  const digits = onlyDigits(value);
  return digits.startsWith(countryCode) && digits.length > countryCode.length
    ? digits.slice(countryCode.length)
    : digits;
};

// O campo já é nacional: um prefixo igual ao DDI também faz parte do contato.
export const toWhatsappPhoneE164 = (value: string, countryCode = DEFAULT_COUNTRY_CALLING_CODE) => {
  const nationalDigits = onlyDigits(value);
  return nationalDigits ? `+${countryCode}${nationalDigits}` : null;
};

export const isNationalPhoneLengthValid = (value: string, countryCode: string) => {
  const nationalDigits = onlyDigits(value);
  const totalLength = (countryCode + nationalDigits).length;
  return nationalDigits.length >= 6 && totalLength >= 8 && totalLength <= 15;
};
