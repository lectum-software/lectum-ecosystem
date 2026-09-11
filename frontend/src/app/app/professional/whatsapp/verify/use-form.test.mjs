import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import "../../../../../../scripts/register-source-modules.mjs";

const phoneForm = await import("./use-form.tsx");
const profileForm = await import("../../profile/setup/use-form.tsx");

test("as duas telas preservam DDD igual ao DDI sem enviar contato", () => {
  for (const [countryCode, phone] of [
    ["55", `55${"9".repeat(9)}`],
    ["55", `11${"9".repeat(9)}`],
    ["44", `44${"9".repeat(8)}`],
    ["1", `1${"9".repeat(9)}`],
  ]) {
    assert.equal(phoneForm.toWhatsappPhoneE164(phone, countryCode), `+${countryCode}${phone}`);
    assert.equal(
      phoneForm.toWhatsappPhoneE164(phone, countryCode),
      profileForm.toWhatsappPhoneE164(phone, countryCode),
    );
  }
});

test("hidratação compartilhada retira DDI uma vez e não trunca entrada inválida", () => {
  assert.equal(phoneForm.toWhatsappPhoneInput, profileForm.toWhatsappPhoneInput);
  const phone = `55${"9".repeat(9)}`;
  for (const prefix of ["+55", "55"]) {
    const national = phoneForm.toWhatsappPhoneInput(`${prefix}${phone}`, "55");
    assert.equal(national, phone);
    assert.equal(phoneForm.toWhatsappPhoneE164(national), `+55${phone}`);
  }
  assert.equal(phoneForm.toWhatsappPhoneInput(`+55${"9".repeat(16)}`), "9".repeat(16));
});

test("schema real mede contato nacional sem ocultar excesso por remoção do prefixo", () => {
  for (const [countryCode, phone, accepted] of [
    ["55", `55${"9".repeat(11)}`, true],
    ["55", `55${"9".repeat(12)}`, false],
    ["1", "9".repeat(6), false],
    ["1", "9".repeat(7), true],
  ]) {
    const parsed = phoneForm.whatsappPhoneSchema.safeParse({ countryCode, phone });
    assert.equal(parsed.success, accepted);
    if (parsed.success) assert.equal(parsed.data.phone, phone);
    else assert.equal(parsed.error.issues[0].message, "Informe um WhatsApp válido");
  }
});

test("conversão mantém contratos de vazio e máscara sem certificar titularidade", () => {
  assert.equal(phoneForm.toWhatsappPhoneE164(""), "");
  assert.equal(profileForm.toWhatsappPhoneE164(""), null);
  assert.equal(phoneForm.toWhatsappPhoneInput(null), "");
  assert.equal(phoneForm.toWhatsappPhoneE164("(55) 99999-9999"), "+5555999999999");
});

function Fields() {
  const { Form, formProps } = phoneForm.usePhoneForm(`+5555${"9".repeat(9)}`);
  return createElement(Form, formProps);
}

test("RHF/Form/controller reais mostram o DDD preservado na hidratação", () => {
  const html = renderToStaticMarkup(createElement(Fields));
  assert.match(html, /name="phone"[^>]*value="\(55\) 99999-9999"/);
  assert.match(html, /name="countryCode"/);
  assert.match(html, /role="alert"/);
});
