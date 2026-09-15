import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { sourceRoot } from "../../../../scripts/register-source-modules.mjs";

const { recoverySchema, useForm } = await import("./use-form.tsx");
const source = readFileSync(new URL("./logic.tsx", import.meta.url), "utf8");

function RecoveryFields({ pending }) {
  const { Form, formProps } = useForm();
  return createElement(Form, { ...formProps, onlyRead: pending });
}

test("schema real aceita o endereço de auditoria com alias sem alterar sua identidade", () => {
  const email = "audit+recovery@example.test";
  assert.deepEqual(recoverySchema.parse({ email }), { email });
});

test("schema real recusa reenvio sem endereço válido, com mensagem PT-BR", () => {
  for (const email of ["", "inválido", "audit@", "a@b@c.test"]) {
    const result = recoverySchema.safeParse({ email });
    assert.equal(result.success, false);
    assert.equal(result.error.issues[0].message, "Informe um e-mail válido");
  }
  assert.equal(recoverySchema.safeParse({ email: null }).success, false);
});

test("Form e controller reais permitem editar e reservam erro antes do envio", () => {
  const html = renderToStaticMarkup(createElement(RecoveryFields, { pending: false }));
  const field = html.match(/<input\b[^>]*name="email"[^>]*>/)?.[0];
  assert.ok(field);
  assert.match(field, /type="email"/);
  assert.match(field, /autoComplete="email"/i);
  assert.doesNotMatch(field, /disabled=|readOnly=/i);
  assert.match(html, /role="alert"/);
});

test("Form e controller reais bloqueiam alteração durante envio", () => {
  const html = renderToStaticMarkup(createElement(RecoveryFields, { pending: true }));
  const field = html.match(/<input\b[^>]*name="email"[^>]*>/)?.[0];
  assert.ok(field);
  assert.match(field, /disabled=""/);
  assert.match(field, /readOnly=""/i);
});

// Contratos de composição; não são simulação de mutation, servidor ou entrega de e-mail.
test("sucesso usa variáveis da mutation, nunca o campo mutável", () => {
  assert.match(source, /onSuccess: \(_result, variables\) =>/);
  assert.match(source, /setSentEmail\(variables\.email\)/);
  assert.doesNotMatch(source, /hook\.getValues/);
  const caller = readFileSync(new URL("api/callers/auth/index.tsx", sourceRoot), "utf8");
  assert.match(caller, /onSuccess\?: \(data: boolean, variables: api\.RecoveryPayload\) => void/);
  assert.match(caller, /onSuccess: callbacks\?\.recovery\?\.onSuccess/);
});

test("reenvio revalida somente o endereço confirmado e recusa envio pendente", () => {
  const handler = source.split("const handleResend =")[1].split("if (sentEmail)")[0];
  assert.match(handler, /if \(recovery\.isPending\) return/);
  assert.match(handler, /recoverySchema\.safeParse\(\{ email: sentEmail \}\)/);
  assert.match(handler, /if \(!submitted\.success\)/);
  assert.match(handler, /recovery\.mutate\(submitted\.data\)/);
  assert.match(source, /onlyRead=\{recovery\.isPending\}/);
});
