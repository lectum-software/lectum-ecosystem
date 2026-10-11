import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");
test("aviso permanece exclusivo do paciente, sem item de privacidade no menu", () => {
  const profile = read("./logic.tsx");
  assert.match(profile, /user.role === "paciente" \? <PatientPrivacyNotice/);
  assert.ok(
    profile.indexOf("<PatientPrivacyNotice") < profile.indexOf("<Section rows={communityRows}"),
  );
  assert.doesNotMatch(profile, /label: "Privacidade"|privacyOpen|patient-privacy-dialog-title/);
  assert.doesNotMatch(profile, /<Modal|<PatientPrivacyExplanation/);
  assert.match(read("./patient-privacy.tsx"), /href="\/politica-de-privacidade"/);
});
test("aviso informa visibilidade sem prometer anonimato de publicacoes", () => {
  const notice = read("./patient-privacy.tsx");
  assert.match(notice, /Seu perfil não é público/);
  assert.match(notice, /Somente psicólogos têm um perfil público/);
  assert.match(notice, /publicar anonimamente/);
  assert.match(notice, /requirePersistedTips: true/);
  assert.match(notice, /has_seen_patient_privacy_notice === true/);
  assert.match(notice, /disabled=\{updateOnboardingTips.isPending\}/);
  assert.match(notice, /Não foi possível salvar sua confirmação/);
  assert.doesNotMatch(notice, /localStorage|sessionStorage/);
});
test("aceite exige servidor e contrato ausente nao produz falso sucesso", () => {
  const caller = read("../../../api/callers/account/index.tsx");
  const strict = caller.slice(
    caller.indexOf("if (requirePersistedTips)"),
    caller.indexOf("if (!hasAuthenticatedUser) {"),
  );
  assert.match(strict, /await api.updateOnboardingTips/);
  assert.match(strict, /response.has_seen_patient_privacy_notice !== true/);
  assert.match(strict, /throw new Error/);
  assert.doesNotMatch(strict, /resolveLocalOnboardingTips|catch/);
});
