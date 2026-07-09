"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import type { ReactNode } from "react";
import {
  type DefaultValues,
  type FieldPath,
  type FieldValues,
  FormProvider,
  type Resolver,
  type SubmitHandler,
  type UseFormReturn,
  useForm as useHookForm,
} from "react-hook-form";
import type { z } from "zod";

export type Field<TFormValues extends FieldValues> = {
  name: FieldPath<TFormValues>;
  field: "input";
  label: string;
  placeholder?: string;
  type?: string;
  autoComplete?: string;
  required?: boolean;
};

type UseFormListProps<TFormValues extends FieldValues> = {
  fields: Field<TFormValues>[];
  schema: z.ZodType<TFormValues, TFormValues>;
  defaultValues: DefaultValues<TFormValues>;
};

export type UseFormListReturn<TFormValues extends FieldValues> = UseFormReturn<TFormValues> & {
  fields: Field<TFormValues>[];
};

export const useFormList = <TFormValues extends FieldValues>({
  defaultValues,
  fields,
  schema,
}: UseFormListProps<TFormValues>): UseFormListReturn<TFormValues> => {
  const methods = useHookForm<TFormValues>({
    defaultValues,
    mode: "onSubmit",
    resolver: zodResolver(schema) as Resolver<TFormValues>,
  });

  return {
    ...methods,
    fields,
  };
};

type FormProps<TFormValues extends FieldValues> = {
  form: UseFormListReturn<TFormValues>;
  onSubmit: SubmitHandler<TFormValues>;
  children: ReactNode;
  className?: string;
};

export const Form = <TFormValues extends FieldValues>({
  children,
  className,
  form,
  onSubmit,
}: FormProps<TFormValues>) => {
  return (
    <FormProvider {...form}>
      <form className={className} noValidate onSubmit={form.handleSubmit(onSubmit)}>
        {children}
      </form>
    </FormProvider>
  );
};
