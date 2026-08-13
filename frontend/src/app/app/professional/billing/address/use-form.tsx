"use client";

import { z } from "zod";
import type { BillingAddressPayload } from "@/api/generator/types/billing";
import { type Field, useFormList } from "@/hooks/form";
import { CITY_OPTIONS_BY_STATE } from "../../profile/setup/brazil-cities";
import { STATE_OPTIONS } from "../../profile/setup/options";

export type BillingAddressForm = {
  zip: string;
  street: string;
  number: string;
  complement: string;
  district: string;
  city: string;
  state: string;
};

export const billingAddressSchema = z.object({
  zip: z.string().refine((value) => /^\d{8}$/.test(value), "Informe um CEP válido"),
  street: z.string().trim().min(2, "Informe o logradouro").max(160, "Logradouro muito longo"),
  number: z.string().trim().min(1, "Informe o número").max(30, "Número muito longo"),
  complement: z.string().trim().max(120, "Complemento muito longo"),
  district: z.string().trim().min(2, "Informe o bairro").max(120, "Bairro muito longo"),
  city: z.string().trim().min(2, "Informe a cidade").max(120, "Cidade muito longa"),
  state: z.string().trim().length(2, "Selecione o estado"),
});

export const billingAddressFields = [
  {
    name: "zip",
    field: "cep",
    label: "CEP",
    placeholder: "00000-000",
    required: true,
    autoComplete: "postal-code",
    className: "md:col-span-1",
  },
  {
    name: "street",
    field: "input",
    label: "Logradouro",
    placeholder: "Ex.: Rua das Flores",
    required: true,
    autoComplete: "address-line1",
    className: "md:col-span-2",
  },
  {
    name: "number",
    field: "input",
    label: "Número",
    placeholder: "123",
    required: true,
    autoComplete: "address-line2",
    className: "md:col-span-1",
  },
  {
    name: "district",
    field: "input",
    label: "Bairro",
    placeholder: "Ex.: Centro",
    required: true,
    autoComplete: "address-level3",
    className: "md:col-span-1",
  },
  {
    name: "complement",
    field: "input",
    label: "Complemento",
    placeholder: "Apto, sala ou referência",
    autoComplete: "address-line3",
    className: "md:col-span-1",
  },
  {
    name: "state",
    field: "select",
    label: "Estado",
    placeholder: "Selecione o estado",
    options: STATE_OPTIONS,
    required: true,
    useCustomSelect: true,
    searchable: true,
    searchMode: "dropdown",
    className: "md:col-span-1",
  },
  {
    name: "city",
    field: "select",
    label: "Cidade",
    required: true,
    autoComplete: "address-level2",
    optionsByField: {
      name: "state",
      options: CITY_OPTIONS_BY_STATE,
      emptyLabel: "Selecione o estado primeiro",
    },
    emptyLabel: "Selecione a cidade",
    searchable: true,
    searchMode: "dropdown",
    searchPlaceholder: "Buscar cidade",
    emptySearchLabel: "Nenhuma cidade encontrada para este estado.",
    className: "md:col-span-1",
  },
] satisfies Field<BillingAddressForm>[];

export const billingAddressDefaultValues: BillingAddressForm = {
  zip: "",
  street: "",
  number: "",
  complement: "",
  district: "",
  city: "",
  state: "",
};

export const toBillingAddressPayload = (values: BillingAddressForm): BillingAddressPayload => ({
  zip: values.zip,
  street: values.street.trim(),
  number: values.number.trim(),
  complement: values.complement.trim() || null,
  district: values.district.trim(),
  city: values.city.trim(),
  state: values.state,
});

export const useBillingAddressForm = () =>
  useFormList<BillingAddressForm>({
    fields: billingAddressFields,
    schema: billingAddressSchema,
    defaultValues: billingAddressDefaultValues,
  });
