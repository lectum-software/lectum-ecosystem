import { z } from "zod";
import { COURTESY_GRANT_CONFIRMATION } from "./config";

const ISO_DATE_INPUT_WITH_FOUR_DIGIT_YEAR_REGEX = /^\d{4}-\d{2}-\d{2}$/;

const createCrpRegistrationDateSchema = (requiredMessage: string) =>
  z
    .string()
    .trim()
    .min(1, requiredMessage)
    .refine(
      (value) => !value || ISO_DATE_INPUT_WITH_FOUR_DIGIT_YEAR_REGEX.test(value),
      "Use ano com 4 dígitos.",
    );

export const courtesyDetailsSchema = z.object({
  cpf: z
    .string()
    .trim()
    .min(1, "Informe o CPF.")
    .max(14, "Use no maximo 14 caracteres.")
    .refine((value) => isValidCpf(value), "Informe um CPF valido."),
  crp: z.string().trim().min(1, "Informe o CRP.").max(40, "Use no maximo 40 caracteres."),
  crp_registration_date: createCrpRegistrationDateSchema("Informe a data inscrição CRP."),
  notes: z
    .string()
    .trim()
    .min(1, "Informe as notas internas.")
    .max(500, "Use no maximo 500 caracteres."),
  period_days: z.string().min(1, "Selecione o periodo."),
  regional_crp: z
    .string()
    .trim()
    .min(1, "Selecione a regional do CRP.")
    .max(120, "Use no maximo 120 caracteres."),
});

export const courtesyConfirmationSchema = z
  .object({
    confirmation: z.string(),
  })
  .superRefine((values, ctx) => {
    if (values.confirmation.trim().toUpperCase() !== COURTESY_GRANT_CONFIRMATION) {
      ctx.addIssue({
        code: "custom",
        message: `Digite ${COURTESY_GRANT_CONFIRMATION} para confirmar.`,
        path: ["confirmation"],
      });
    }
  });

export type CourtesyFormValues = z.infer<typeof courtesyDetailsSchema>;

export type CourtesyConfirmationFormValues = z.infer<typeof courtesyConfirmationSchema>;

export const onlyDigits = (value?: string | null) => String(value ?? "").replace(/\D/g, "");

const isValidCpf = (value: string) => {
  const cpf = onlyDigits(value);
  if (!cpf) return true;
  if (cpf.length !== 11) return false;
  if (/^(\d)\1+$/.test(cpf)) return false;

  const calcDigit = (base: string, factor: number) => {
    const sum = base
      .split("")
      .reduce((total, digit, index) => total + Number(digit) * (factor - index), 0);
    const rest = (sum * 10) % 11;
    return rest === 10 ? 0 : rest;
  };

  const digit1 = calcDigit(cpf.slice(0, 9), 10);
  const digit2 = calcDigit(cpf.slice(0, 10), 11);

  return digit1 === Number(cpf[9]) && digit2 === Number(cpf[10]);
};

const registryApproveBaseSchema = z.object({
  confirmation: z.string(),
  cpf: z
    .string()
    .min(1, "Informe o CPF.")
    .refine((value) => isValidCpf(value), "Informe um CPF válido."),
  crp: z.string().min(1, "Informe o número do CRP.").max(40, "Use no máximo 40 caracteres."),
  crp_registration_date: createCrpRegistrationDateSchema("Informe a data de inscrição no CRP."),
  regional_crp: z.string().min(1, "Selecione a regional do CRP."),
  situation_confirmed: z.string(),
});

export const registryApproveSchema = registryApproveBaseSchema.superRefine((values, ctx) => {
  if (values.confirmation.trim() !== "APROVAR CRP") {
    ctx.addIssue({
      code: "custom",
      message: "Digite APROVAR CRP para confirmar.",
      path: ["confirmation"],
    });
  }

  if (values.situation_confirmed !== "sim") {
    ctx.addIssue({
      code: "custom",
      message: "Confirme que a situação foi verificada.",
      path: ["situation_confirmed"],
    });
  }
});

const registryRejectBaseSchema = z.object({
  confirmation: z.string(),
  reason: z
    .string()
    .min(10, "Informe um motivo em PT-BR com pelo menos 10 caracteres.")
    .max(1000, "Use no máximo 1000 caracteres."),
});

export const registryRejectSchema = registryRejectBaseSchema.superRefine((values, ctx) => {
  if (values.confirmation.trim() !== "REJEITAR CRP") {
    ctx.addIssue({
      code: "custom",
      message: "Digite REJEITAR CRP para confirmar.",
      path: ["confirmation"],
    });
  }
});

const registrySaveBaseSchema = z.object({
  confirmation: z.string(),
});

export const registrySaveSchema = registrySaveBaseSchema.superRefine((values, ctx) => {
  if (values.confirmation.trim() !== "SALVAR REGISTRO") {
    ctx.addIssue({
      code: "custom",
      message: "Digite SALVAR REGISTRO para confirmar.",
      path: ["confirmation"],
    });
  }
});

export const registryIdentitySchema = z.object({
  crp: z.string().min(1, "Informe o número do CRP.").max(40, "Use no máximo 40 caracteres."),
  crp_registration_date: createCrpRegistrationDateSchema("Informe a data de inscrição no CRP."),
  regional_crp: z.string().min(1, "Selecione a regional do CRP."),
});

export type RegistryApproveFormValues = z.infer<typeof registryApproveBaseSchema>;

export type RegistryIdentityFormValues = z.infer<typeof registryIdentitySchema>;

export type RegistryRejectFormValues = z.infer<typeof registryRejectBaseSchema>;

export type RegistrySaveFormValues = z.infer<typeof registrySaveBaseSchema>;

export const profilePersonalDataBaseSchema = z.object({
  address_city: z.string().max(120, "Use no máximo 120 caracteres.").optional(),
  address_complement: z.string().max(120, "Use no máximo 120 caracteres.").optional(),
  address_district: z.string().max(120, "Use no máximo 120 caracteres.").optional(),
  address_number: z.string().max(40, "Use no máximo 40 caracteres.").optional(),
  address_state: z.string().max(2, "Use a UF com 2 letras.").optional(),
  address_street: z.string().max(160, "Use no máximo 160 caracteres.").optional(),
  address_zip: z.string().max(12, "Use no máximo 12 caracteres.").optional(),
  birthdate: z.string().optional(),
  confirm_cpf_change: z.string().optional(),
  cpf: z
    .string()
    .optional()
    .refine((value) => !value || isValidCpf(value), "Informe um CPF válido."),
  gender: z.string().max(80, "Use no máximo 80 caracteres.").optional(),
  race_color: z.string().max(80, "Use no máximo 80 caracteres.").optional(),
  reason: z
    .string()
    .trim()
    .min(10, "Informe o motivo interno com pelo menos 10 caracteres.")
    .max(500, "Use no máximo 500 caracteres."),
  religion: z.string().max(80, "Use no máximo 80 caracteres.").optional(),
  whatsapp: z.string().max(24, "Use no máximo 24 caracteres.").optional(),
});

export type ProfilePersonalDataFormValues = z.infer<typeof profilePersonalDataBaseSchema>;

export const profileProfessionalDataSchema = z.object({
  approach_ids: z.array(z.string()),
  language: z.string().max(80, "Use no máximo 80 caracteres.").optional(),
  modality: z.string().optional(),
  reason: z
    .string()
    .trim()
    .min(10, "Informe o motivo interno com pelo menos 10 caracteres.")
    .max(500, "Use no máximo 500 caracteres."),
  service_ids: z.array(z.string()),
  specialty_ids: z.array(z.string()),
  target_audience: z.array(z.string()),
});

export type ProfileProfessionalDataFormValues = z.infer<typeof profileProfessionalDataSchema>;

export const accountReasonSchema = z.object({
  reason: z
    .string()
    .min(10, "Informe o motivo interno com pelo menos 10 caracteres.")
    .max(500, "Use no maximo 500 caracteres."),
});

export const accountChangeEmailSchema = accountReasonSchema
  .extend({
    confirmation: z.string(),
    email: z.string().email("Informe um e-mail valido."),
  })
  .superRefine((values, ctx) => {
    if (values.confirmation.trim().toUpperCase() !== "ALTERAR EMAIL") {
      ctx.addIssue({
        code: "custom",
        message: "Digite ALTERAR EMAIL para confirmar.",
        path: ["confirmation"],
      });
    }
  });

export const accountTemporaryPasswordSchema = accountReasonSchema
  .extend({
    confirmation: z.string(),
    password: z
      .string()
      .min(10, "Use pelo menos 10 caracteres.")
      .max(128, "Use no maximo 128 caracteres."),
    password_confirm: z.string(),
  })
  .superRefine((values, ctx) => {
    if (values.confirmation.trim().toUpperCase() !== "ALTERAR SENHA") {
      ctx.addIssue({
        code: "custom",
        message: "Digite ALTERAR SENHA para confirmar.",
        path: ["confirmation"],
      });
    }

    if (values.password !== values.password_confirm) {
      ctx.addIssue({
        code: "custom",
        message: "As senhas precisam ser iguais.",
        path: ["password_confirm"],
      });
    }
  });

export const accountRevokeSessionsSchema = accountReasonSchema
  .extend({
    confirmation: z.string(),
  })
  .superRefine((values, ctx) => {
    if (values.confirmation.trim().toUpperCase() !== "ENCERRAR SESSOES") {
      ctx.addIssue({
        code: "custom",
        message: "Digite ENCERRAR SESSOES para confirmar.",
        path: ["confirmation"],
      });
    }
  });

const SUSPENSION_DURATION_VALUES = ["1", "7", "15", "30", "60", "90"] as const;

export const SUSPENSION_DURATION_OPTIONS = [
  { label: "1 dia", value: "1" },
  { label: "7 dias", value: "7" },
  { label: "15 dias", value: "15" },
  { label: "30 dias", value: "30" },
  { label: "60 dias", value: "60" },
  { label: "90 dias", value: "90" },
];

const createAccountStatusActionSchema = (
  confirmationText: string,
  requireSuspensionDuration = false,
) =>
  accountReasonSchema
    .extend({
      confirmation: z.string(),
      suspension_duration_days: requireSuspensionDuration
        ? z.enum(SUSPENSION_DURATION_VALUES, {
            message: "Selecione o prazo da suspensão.",
          })
        : z.string().optional(),
    })
    .superRefine((values, ctx) => {
      if (values.confirmation.trim().toUpperCase() !== confirmationText) {
        ctx.addIssue({
          code: "custom",
          message: `Digite ${confirmationText} para confirmar.`,
          path: ["confirmation"],
        });
      }
    });

export const accountSuspendSchema = createAccountStatusActionSchema("SUSPENDER CONTA", true);

export const accountDeactivateSchema = createAccountStatusActionSchema("DESATIVAR CONTA");

export const accountDeleteSchema = createAccountStatusActionSchema("EXCLUIR CONTA");

export type AccountReasonFormValues = z.infer<typeof accountReasonSchema>;

export type AccountChangeEmailFormValues = z.infer<typeof accountChangeEmailSchema>;

export type AccountTemporaryPasswordFormValues = z.infer<typeof accountTemporaryPasswordSchema>;

export type AccountRevokeSessionsFormValues = z.infer<typeof accountRevokeSessionsSchema>;

export type AccountStatusActionFormValues = z.infer<typeof accountSuspendSchema>;

export const REPORT_DISMISS_CONFIRMATION = "DENUNCIA IMPROCEDENTE";

export const REPORT_UPHOLD_CONFIRMATION = "DENUNCIA PROCEDENTE";

export const REPORT_REVIEW_CONFIRMATION = "REVISAR DECISAO";

export const reportDismissSchema = accountReasonSchema
  .extend({
    confirmation: z.string(),
  })
  .superRefine((values, ctx) => {
    if (values.confirmation.trim().toUpperCase() !== REPORT_DISMISS_CONFIRMATION) {
      ctx.addIssue({
        code: "custom",
        message: `Digite ${REPORT_DISMISS_CONFIRMATION} para confirmar.`,
        path: ["confirmation"],
      });
    }
  });

export const reportUpholdSchema = accountReasonSchema
  .extend({
    confirmation: z.string(),
    measure: z.enum(["none", "remove_content"], {
      message: "Selecione a medida de moderação.",
    }),
  })
  .superRefine((values, ctx) => {
    if (values.confirmation.trim().toUpperCase() !== REPORT_UPHOLD_CONFIRMATION) {
      ctx.addIssue({
        code: "custom",
        message: `Digite ${REPORT_UPHOLD_CONFIRMATION} para confirmar.`,
        path: ["confirmation"],
      });
    }
  });

export const reportReviewSchema = accountReasonSchema
  .extend({
    confirmation: z.string(),
    resolution: z.enum(["dismissed", "pending", "upheld"], {
      message: "Selecione o novo status.",
    }),
  })
  .superRefine((values, ctx) => {
    if (values.confirmation.trim().toUpperCase() !== REPORT_REVIEW_CONFIRMATION) {
      ctx.addIssue({
        code: "custom",
        message: `Digite ${REPORT_REVIEW_CONFIRMATION} para confirmar.`,
        path: ["confirmation"],
      });
    }
  });

export type ReportDismissFormValues = z.infer<typeof reportDismissSchema>;

export type ReportReviewFormValues = z.infer<typeof reportReviewSchema>;

export type ReportUpholdFormValues = z.infer<typeof reportUpholdSchema>;
