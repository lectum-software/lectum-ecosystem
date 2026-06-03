"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMemo } from "react";
import { type DefaultValues, type FieldValues, type UseFormProps, useForm } from "react-hook-form";
import { Form } from "./form";
import { getInitialValueForField, normalizeEmptyValue } from "./initial";
import type { UseFormListProps, UseFormListReturn } from "./types";

export function useFormList<FormType extends FieldValues>({
  fields,
  schema,
  defaultValues,
  values,
  dependencies,
  onlyRead,
  resetOptions,
  mode = "onChange",
}: UseFormListProps<FormType>): UseFormListReturn<FormType> {
  const formResolver = useMemo(
    () => zodResolver(schema) as UseFormProps<FormType>["resolver"],
    [schema],
  );

  const initialDefaultValues = useMemo(() => {
    const fieldDefaults = fields.reduce<Record<string, unknown>>((acc, field) => {
      acc[field.name] = getInitialValueForField(field);
      return acc;
    }, {});

    return {
      ...fieldDefaults,
      ...defaultValues,
    } as DefaultValues<FormType>;
  }, [defaultValues, fields]);

  const initialValues = useMemo(() => {
    if (!values) {
      return undefined;
    }

    const mergedValues = {
      ...initialDefaultValues,
      ...values,
    } as Record<string, unknown>;

    return Object.fromEntries(
      Object.entries(mergedValues).map(([key, value]) => {
        const field = fields.find((item) => item.name === key);
        return [key, field ? normalizeEmptyValue(field, value) : value];
      }),
    ) as FormType;
  }, [fields, initialDefaultValues, values]);

  const hook = useForm<FormType>({
    resolver: formResolver,
    mode,
    defaultValues: initialDefaultValues,
    values: initialValues,
    resetOptions,
  });

  const isDirty = hook.formState.isDirty;
  const isError = Object.keys(hook.formState.errors).length > 0;

  return {
    formProps: {
      fields,
      dependencies,
      hook,
      onlyRead,
    },
    hook,
    Form,
    isDirty,
    isError,
  };
}

export type {
  ControllerComponent,
  ControllerFieldProps,
  Field,
  FieldOption,
  FieldType,
  FormProps,
  UseFormListProps,
  UseFormListReturn,
} from "./types";
