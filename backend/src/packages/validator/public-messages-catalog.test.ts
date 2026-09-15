import assert from "node:assert/strict";
import { before, test } from "node:test";
import { createInstance } from "i18next";
import translation from "../../../locales/pt/translation.json";
import zodMessages from "../../../locales/pt/zod.json";
import { sanitizePublicErrorMessage } from "../../utils/public-error";
import { setI18n } from "./i18n";
import { custom } from "./schema/_internal/handlers/custom";
import { z } from "./schema/_internal/validations/zod";

// Intencionalmente separado da suíte HTTP: somente tradutor, catálogos e folhas puras.
const i18n = createInstance();

before(async () => {
  await i18n.init({
    lng: "pt",
    fallbackLng: "pt",
    resources: { pt: { translation, zod: zodMessages } },
    interpolation: { escapeValue: false },
  });
  setI18n(i18n, "pt");
});

const firstMessage = (schema: z.ZodType, value: unknown) => {
  const result = schema.safeParse(value);
  assert.equal(result.success, false);
  if (result.success) throw new Error("VALIDATION_EXPECTED_FAILURE");
  return result.error.issues[0]?.message;
};

test("condição mutual interpola os campos e a conjunção pelo handler existente", () => {
  const message = custom(
    "invalid_type_mutual_condition",
    { names: "E-mail", last: "Telefone" },
    "and",
  );
  assert.equal(message, "Os campos E-mail e Telefone devem ser preenchidos ao mesmo tempo");
  assert.doesNotMatch(message ?? "", /[{}]/);
});

// Número/data exact são chaves de compatibilidade: tradução real, sem fabricar issues Zod.
for (const [direction, expected] of [
  ["too_small", "Número deve ser igual a 12"],
  ["too_big", "Número deve ser igual a 30"],
] as const) {
  test(`igualdade numérica ${direction} não descreve comprimento de texto`, () => {
    const message = i18n.getFixedT("pt", "zod")(`errors.${direction}.number.exact`, {
      minimum: 12,
      maximum: 30,
    });
    assert.equal(message, expected);
    assert.doesNotMatch(message, /caract|[{}]/);
  });
}

for (const [direction, mode, expected] of [
  ["too_small", "exact", "Data deve ser igual a 15/01/2030"],
  ["too_small", "inclusive", "Data deve ser igual ou posterior a 15/01/2030"],
  ["too_small", "not_inclusive", "Data deve ser posterior a 15/01/2030"],
  ["too_big", "exact", "Data deve ser igual a 20/02/2030"],
  ["too_big", "inclusive", "Data deve ser igual ou anterior a 20/02/2030"],
  ["too_big", "not_inclusive", "Data deve ser anterior a 20/02/2030"],
] as const) {
  test(`data ${direction}/${mode} traduz o limite correspondente em português`, () => {
    const message = i18n.getFixedT("pt", "zod")(`errors.${direction}.date.${mode}`, {
      minimum: new Date(2030, 0, 15, 12),
      maximum: new Date(2030, 1, 20, 12),
    });
    assert.equal(message, expected);
    assert.doesNotMatch(message, /[{}]/);
  });
}

test("Zod real preserva limites numéricos inclusivos e exclusivos", () => {
  const cases = [
    [z.number().min(12), 11, "Número deve ser maior ou igual a 12", true],
    [z.number().gt(12), 12, "Número deve ser maior que 12", false],
    [z.number().max(12), 13, "Número deve ser menor ou igual a 12", true],
    [z.number().lt(12), 12, "Número deve ser menor que 12", false],
  ] as const;

  for (const [schema, invalid, expected, acceptsBoundary] of cases) {
    assert.equal(firstMessage(schema, invalid), expected);
    assert.equal(schema.safeParse(12).success, acceptsBoundary);
  }
});

test("Zod real formata datas mínima e máxima sem perder a inclusão do limite", () => {
  const boundary = new Date(2030, 0, 15, 12);
  const minimum = z.date().min(boundary);
  const maximum = z.date().max(boundary);

  assert.equal(
    firstMessage(minimum, new Date(2030, 0, 14, 12)),
    "Data deve ser igual ou posterior a 15/01/2030",
  );
  assert.equal(
    firstMessage(maximum, new Date(2030, 0, 16, 12)),
    "Data deve ser igual ou anterior a 15/01/2030",
  );
  assert.equal(minimum.safeParse(boundary).success, true);
  assert.equal(maximum.safeParse(boundary).success, true);
});

const unavailableMessages = [
  ["billing_gateway_config_error", "Serviço de pagamento indisponível no momento."],
  [
    "admin_subscription_cancel_gateway_config_error",
    "Não foi possível cancelar a assinatura agora. Tente novamente em instantes.",
  ],
  [
    "admin_auth_config_error",
    "Acesso administrativo indisponível no momento. Tente novamente em instantes.",
  ],
  [
    "admin_notification_email_provider_unavailable",
    "Envio de e-mail indisponível no momento. Não é possível selecionar E-mail agora.",
  ],
  ["admin_notification_invalid_channel", "Selecione um canal de notificação válido."],
  [
    "admin_notification_scheduler_unavailable",
    "O agendamento automático está indisponível no momento. Não é possível agendar campanhas agora.",
  ],
] as const;

for (const [key, expected] of unavailableMessages) {
  test(`mensagem ${key} mantém orientação após o normalizador público real`, () => {
    const message = i18n.getFixedT("pt", "translation")(`error.${key}`);
    assert.equal(message, expected);
    assert.equal(sanitizePublicErrorMessage(message), expected);
    assert.doesNotMatch(message, /gateway|configura|SMTP|scheduler|in_app|\bpush\b/iu);
  });
}

for (const [key, expected] of [
  [
    "admin_psychologist_account_deleted",
    "Conta do psicólogo excluída, com registro preservado, anonimização e auditoria administrativa.",
  ],
  [
    "admin_patient_account_deleted",
    "Conta do paciente excluída, com registro preservado, anonimização e auditoria administrativa.",
  ],
  ["admin_settings_catalog_deleted", "Catálogo excluído, com registro preservado."],
] as const) {
  test(`sucesso ${key} não promete exclusão física nem expõe termo de implementação`, () => {
    const message = i18n.getFixedT("pt", "translation")(`message.${key}`);
    assert.equal(message, expected);
    assert.doesNotMatch(message, /soft.?delete/iu);
  });
}
