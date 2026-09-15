import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { zodResolver } from "@hookform/resolvers/zod";
import { createFormControl } from "react-hook-form";
import ts from "typescript";

import "../../../../../../scripts/register-source-modules.mjs";

const profileForm = await import("./use-form.tsx");
const { freeProfileSchema, getDefaultValues, toWhatsappPhoneE164 } = profileForm;

const localForm = (values = {}) =>
  createFormControl({
    defaultValues: { ...getDefaultValues(), ...values },
    resolver: zodResolver(freeProfileSchema),
  });

test("WhatsApp nacional preserva prefixo igual ao DDI", () => {
  for (const [countryCode, national] of [
    ["55", `55${"9".repeat(9)}`],
    ["55", `11${"9".repeat(9)}`],
    ["44", `44${"9".repeat(8)}`],
    ["1", `1${"9".repeat(9)}`],
  ]) {
    assert.equal(toWhatsappPhoneE164(national, countryCode), `+${countryCode}${national}`);
  }
  assert.equal(toWhatsappPhoneE164("(55) 99999-9999", "55"), "+5555999999999");
  assert.equal(toWhatsappPhoneE164("", "55"), null);
});

test("hidratação internacional retira apenas o DDI e não trunca o contato", () => {
  assert.equal(typeof profileForm.toWhatsappPhoneInput, "function");
  for (const [countryCode, national] of [
    ["55", `55${"9".repeat(9)}`],
    ["44", `44${"9".repeat(8)}`],
    ["1", `1${"9".repeat(9)}`],
  ]) {
    const international = `+${countryCode}${national}`;
    const input = profileForm.toWhatsappPhoneInput(international, countryCode);
    assert.equal(input, national);
    assert.equal(toWhatsappPhoneE164(input, countryCode), international);
    // Compatibilidade com representação internacional legada sem o sinal +.
    assert.equal(profileForm.toWhatsappPhoneInput(international.slice(1), countryCode), national);
  }
  assert.equal(profileForm.toWhatsappPhoneInput(null), "");
  assert.equal(profileForm.toWhatsappPhoneInput(`+55${"9".repeat(16)}`), "9".repeat(16));
});

test("RHF valida tamanho real com DDD igual ao DDI e mantém entrada rejeitada", async () => {
  for (const [countryCode, national, accepted] of [
    ["55", `55${"9".repeat(9)}`, true],
    ["55", `55${"9".repeat(11)}`, true],
    ["55", `55${"9".repeat(12)}`, false],
    ["1", "9".repeat(6), false],
    ["1", "9".repeat(7), true],
  ]) {
    const form = localForm({ countryCode, whatsapp: national });
    form.register("whatsapp");
    assert.equal(await form.trigger("whatsapp"), accepted);
    assert.equal(form.getValues("whatsapp"), national);
    if (!accepted)
      assert.equal(form.getFieldState("whatsapp").error.message, "Informe um WhatsApp válido");
  }
});

const textLimits = [
  ["professional_first_name", 80],
  ["professional_last_name", 120],
  ["gender", 40],
  ["bio", 2000],
  ["address_street", 160],
  ["address_number", 40],
  ["address_complement", 80],
  ["address_district", 120],
  ["address_zip", 20],
  ["address_city", 120],
  ["address_state", 2],
];
for (const [field, limit] of textLimits) {
  test(`limite de ${field} é inclusivo e tem mensagem PT-BR`, () => {
    const schema = freeProfileSchema.shape[field];
    assert.equal(schema.safeParse("a".repeat(limit)).success, true);
    const parsed = schema.safeParse("a".repeat(limit + 1));
    assert.equal(parsed.success, false);
    const issue = parsed.error.issues.find((item) => item.code === "too_big");
    assert.ok(issue);
    assert.match(issue.message, /máximo|até/u);
    assert.doesNotMatch(issue.message, /Too big|expected|string|undefined/iu);
  });
}

test("limites das formações são inclusivos e traduzidos", () => {
  const shape = freeProfileSchema.shape.academic_formations.element.shape;
  for (const [field, limit] of [
    ["title", 160],
    ["institution", 160],
    ["graduation_year", 20],
  ]) {
    assert.equal(shape[field].safeParse("a".repeat(limit)).success, true);
    const parsed = shape[field].safeParse("a".repeat(limit + 1));
    assert.equal(parsed.success, false);
    assert.match(parsed.error.issues[0].message, /máximo|até/u);
  }
});

test("resolver RHF entrega erro de limite PT-BR ao campo correto", async () => {
  const form = localForm({ bio: "a".repeat(2001) });
  form.register("bio");
  assert.equal(await form.trigger("bio"), false);
  assert.equal(
    form.getFieldState("bio").error.message,
    "A apresentação deve ter no máximo 2000 caracteres",
  );
  assert.equal(form.getValues("bio").length, 2001);
});

test("nome composto normalizado respeita 160 caracteres e erro vai ao sobrenome", async () => {
  for (const [first, last, accepted] of [
    ["a".repeat(80), "b".repeat(79), true],
    ["a".repeat(80), "b".repeat(80), false],
    ["a".repeat(80), "b".repeat(120), false],
    // Títulos/espaços são tratados pelo mesmo normalizador usado no payload.
    [`Dr. ${"a".repeat(76)}`, "b".repeat(80), true],
    [" a  a ", " b ", true],
  ]) {
    const form = localForm({ professional_first_name: first, professional_last_name: last });
    form.register("professional_last_name");
    assert.equal(await form.trigger("professional_last_name"), accepted);
    if (!accepted) {
      assert.equal(
        form.getFieldState("professional_last_name").error.message,
        "Nome e sobrenome devem ter juntos no máximo 160 caracteres",
      );
    }
  }
});

test("formulário vazio continua incompleto; testes não preenchem identidade nem publicam", () => {
  const values = getDefaultValues();
  assert.equal(values.cpf, "");
  assert.equal(values.crp_number, "");
  assert.equal(freeProfileSchema.safeParse(values).success, false);
});

test("pickers mantêm os mesmos inputs/handlers, ocultos como nos controles de mídia existentes", () => {
  const inputs = [];
  for (const relative of [
    "components/profile-images-preview.tsx",
    "views/professional-profile-setup.tsx",
  ]) {
    const source = readFileSync(new URL(relative, import.meta.url), "utf8");
    const ast = ts.createSourceFile(
      relative,
      source,
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TSX,
    );
    const visit = (node) => {
      if (ts.isJsxSelfClosingElement(node) && node.tagName.getText(ast) === "input") {
        const attributes = Object.fromEntries(
          node.attributes.properties.map((property) => {
            assert.ok(ts.isJsxAttribute(property));
            return [property.name.getText(ast), property.initializer?.getText(ast)];
          }),
        );
        if (attributes.type === '"file"') {
          assert.equal(attributes.className, '"hidden"');
          assert.equal(attributes["aria-hidden"], undefined);
          inputs.push([attributes.ref, attributes.onChange, attributes.accept]);
        }
      }
      ts.forEachChild(node, visit);
    };
    visit(ast);
  }
  assert.deepEqual(inputs, [
    ["{coverImageInputRef}", "{handleCoverImageChange}", '"image/jpeg,image/png,image/webp"'],
    ["{avatarInputRef}", "{handleAvatarChange}", '"image/png,image/jpeg,image/webp"'],
    ["{videoInputRef}", "{handleVideoChange}", '"video/mp4,video/webm,video/quicktime"'],
    ["{videoCoverInputRef}", "{handleVideoCoverChange}", '"image/jpeg,image/png,image/webp"'],
  ]);
});
