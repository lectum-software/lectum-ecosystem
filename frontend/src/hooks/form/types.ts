import type { ReactNode } from "react";
import type { Control, FieldPath, FieldValues, UseFormProps, UseFormReturn } from "react-hook-form";
import type { z } from "zod";

export type FieldType =
  | "input"
  | "textarea"
  | "checkbox"
  | "select"
  | "switch"
  | "phone"
  | "cpf"
  | "cnpj"
  | "cep"
  | "otp"
  | "money"
  | "numeric"
  | "percentage"
  | "calendar";

export type FieldOption = {
  label: string;
  value: string | number | boolean;
  disabled?: boolean;
};

export type Field<FormType extends FieldValues> = {
  name: FieldPath<FormType>;
  field: FieldType;
  label?: string;
  placeholder?: string;
  prefix?: string;
  description?: string;
  tooltip?: string;
  required?: boolean;
  hide?: boolean;
  disabled?: boolean;
  readOnly?: boolean;
  loading?: boolean;
  className?: string;
  inputClassName?: string;
  id?: string;
  type?: React.HTMLInputTypeAttribute;
  autoComplete?: string;
  autoFocus?: boolean;
  tabIndex?: number;
  rows?: number;
  min?: number;
  max?: number;
  length?: number;
  step?: number;
  int?: boolean;
  positive?: boolean;
  currency?: string;
  options?: FieldOption[];
  emptyLabel?: string;
  onChangeCallback?: (value: unknown) => void;
};

export type ControllerFieldProps<FormType extends FieldValues> = Field<FormType> & {
  control: Control<FormType>;
  read?: string;
};

export type ControllerComponent = <FormType extends FieldValues>(
  props: ControllerFieldProps<FormType>,
) => ReactNode;

export type UseFormListProps<FormType extends FieldValues> = {
  fields: Field<FormType>[];
  schema: z.ZodType<FormType, FormType>;
  defaultValues?: Partial<FormType>;
  values?: Partial<FormType>;
  onlyRead?: boolean;
  dependencies?: unknown;
  resetOptions?: UseFormProps<FormType>["resetOptions"];
  mode?: UseFormProps<FormType>["mode"];
};

export type FormProps<FormType extends FieldValues> = React.ComponentPropsWithoutRef<"form"> & {
  fields: Field<FormType>[];
  hook: UseFormReturn<FormType>;
  onlyRead?: boolean;
};

export type UseFormListReturn<FormType extends FieldValues> = {
  formProps: {
    fields: Field<FormType>[];
    dependencies?: unknown;
    hook: UseFormReturn<FormType>;
    onlyRead?: boolean;
  };
  hook: UseFormReturn<FormType>;
  Form: (props: FormProps<FormType>) => ReactNode;
  isDirty: boolean;
  isError: boolean;
};
