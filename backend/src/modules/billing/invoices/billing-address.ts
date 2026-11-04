import { z } from "zod";
import { InvoiceError } from "./config";

// Internal snapshot; this is not the provider's address payload.
export const invoiceBillingAddressSchema = z.object({
  zip: z
    .string()
    .trim()
    .regex(/^\d{5}-?\d{3}$/)
    .transform((value) => value.replace("-", "")),
  street: z.string().trim().min(1).max(250),
  number: z.string().trim().min(1).max(30),
  complement: z.string().trim().max(250).nullish(),
  district: z.string().trim().min(1).max(150),
  city: z.string().trim().min(1).max(150),
  state: z.enum([
    "AC",
    "AL",
    "AP",
    "AM",
    "BA",
    "CE",
    "DF",
    "ES",
    "GO",
    "MA",
    "MT",
    "MS",
    "MG",
    "PA",
    "PB",
    "PR",
    "PE",
    "PI",
    "RJ",
    "RN",
    "RS",
    "RO",
    "RR",
    "SC",
    "SP",
    "SE",
    "TO",
  ]),
});

export function requireInvoiceBillingAddress(value: unknown) {
  const parsed = invoiceBillingAddressSchema.safeParse(value);
  if (!parsed.success) throw new InvoiceError("billing_address_incomplete", true);
  return parsed.data;
}

// SendNF resolves municipality/UF from ZIP; never invent an IBGE code.
export function toSendNfAddress(value: unknown) {
  const address = requireInvoiceBillingAddress(value);
  return {
    zip: address.zip,
    street: address.street,
    number: address.number,
    ...(address.complement ? { complement: address.complement } : {}),
    neighborhood: address.district,
  };
}
