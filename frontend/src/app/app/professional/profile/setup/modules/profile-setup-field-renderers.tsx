import type { Control, FieldPath } from "react-hook-form";
import { components } from "@/components/controllers";
import type { Field } from "@/hooks/form";
import type { AcademicFormationForm, FreeProfileForm } from "../use-form";

export const renderProfileSetupField = ({
  control,
  fields,
  name,
  override = {},
}: {
  control: Control<FreeProfileForm>;
  fields: Field<FreeProfileForm>[];
  name: keyof FreeProfileForm;
  override?: Partial<Field<FreeProfileForm>>;
}) => {
  const field = fields.find((item) => item.name === name);
  if (!field) return null;

  const Component = components[field.field];
  if (!Component) return null;

  return (
    <div data-profile-field={String(name)} key={String(name)}>
      <Component control={control} {...field} {...override} />
    </div>
  );
};

export const renderProfileSetupAcademicField = ({
  control,
  index,
  label,
  name,
  placeholder,
}: {
  control: Control<FreeProfileForm>;
  index: number;
  label: string;
  name: keyof AcademicFormationForm;
  placeholder: string;
}) => {
  const Component = components.input;

  return (
    <Component
      control={control}
      field="input"
      label={label}
      name={`academic_formations.${index}.${name}` as FieldPath<FreeProfileForm>}
      placeholder={placeholder}
    />
  );
};
