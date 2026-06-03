import type { FieldValues } from "react-hook-form";
import type { Field } from "./types";

export function getInitialValueForField<FormType extends FieldValues>(
  field: Field<FormType>,
): unknown {
  switch (field.field) {
    case "input":
    case "phone":
    case "cpf":
    case "cnpj":
    case "cep":
      return "";
    case "textarea":
      return undefined;
    case "numeric":
    case "money":
    case "percentage":
    case "select":
    case "calendar":
      return null;
    case "checkbox":
    case "switch":
      return false;
    default:
      return undefined;
  }
}

export function normalizeEmptyValue<FormType extends FieldValues>(
  field: Field<FormType>,
  value: unknown,
): unknown {
  if (value !== "") {
    return value;
  }

  switch (field.field) {
    case "textarea":
      return undefined;
    case "numeric":
    case "money":
    case "percentage":
    case "select":
    case "calendar":
      return null;
    default:
      return "";
  }
}
