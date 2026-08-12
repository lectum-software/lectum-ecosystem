import { CalendarController } from "@/components/controllers/calendar";
import { CepController } from "@/components/controllers/cep";
import { CheckboxController } from "@/components/controllers/checkbox";
import { CnpjController } from "@/components/controllers/cnpj";
import { ContenteditableController } from "@/components/controllers/contenteditable";
import { CpfController } from "@/components/controllers/cpf";
import { InputController } from "@/components/controllers/input";
import { MoneyController } from "@/components/controllers/money";
import { NumericController } from "@/components/controllers/numeric";
import { OtpController } from "@/components/controllers/otp";
import { PercentageController } from "@/components/controllers/percentage";
import { PhoneController } from "@/components/controllers/phone";
import { SelectController } from "@/components/controllers/select";
import { SwitchController } from "@/components/controllers/switch";
import { TextareaController } from "@/components/controllers/textarea";
import type { ControllerComponent, FieldType } from "@/hooks/form";

export const components = {
  input: InputController,
  textarea: TextareaController,
  contenteditable: ContenteditableController,
  checkbox: CheckboxController,
  select: SelectController,
  switch: SwitchController,
  phone: PhoneController,
  cpf: CpfController,
  cnpj: CnpjController,
  cep: CepController,
  otp: OtpController,
  money: MoneyController,
  numeric: NumericController,
  percentage: PercentageController,
  calendar: CalendarController,
} satisfies Record<FieldType, ControllerComponent>;

export type Components = typeof components;

export { CalendarController } from "@/components/controllers/calendar";
export { CepController } from "@/components/controllers/cep";
export { CheckboxController } from "@/components/controllers/checkbox";
export { CnpjController } from "@/components/controllers/cnpj";
export { Container } from "@/components/controllers/container";
export { ContenteditableController } from "@/components/controllers/contenteditable";
export { CpfController } from "@/components/controllers/cpf";
export { InputController } from "@/components/controllers/input";
export { MoneyController } from "@/components/controllers/money";
export { NumericController } from "@/components/controllers/numeric";
export { OtpController } from "@/components/controllers/otp";
export { PercentageController } from "@/components/controllers/percentage";
export { PhoneController } from "@/components/controllers/phone";
export { SelectController } from "@/components/controllers/select";
export { SwitchController } from "@/components/controllers/switch";
export { TextareaController } from "@/components/controllers/textarea";
