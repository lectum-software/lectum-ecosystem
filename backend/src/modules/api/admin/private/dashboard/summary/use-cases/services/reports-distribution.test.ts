import assert from "node:assert/strict";
import test from "node:test";
import { buildPendingReports, deriveReportSeverity } from "./reports-distribution";

for (const reason of ["self_harm", "abuse"]) {
  for (const target_type of ["post", "reply"]) {
    test(`BA02: ${reason}/${target_type} recebe severidade alta`, () => {
      assert.equal(deriveReportSeverity({ reason, target_type }), "alta");
    });
  }
}

test("BA02: razão canônica aceita caixa/espaços, sem inferência por substring", () => {
  assert.equal(deriveReportSeverity({ reason: " SELF_HARM ", target_type: "post" }), "alta");
  assert.equal(deriveReportSeverity({ reason: " Abuse ", target_type: "reply" }), "alta");
  for (const reason of [
    "not_self_harm",
    "not_abuse",
    "self_harm_other",
    "constructor",
    "__proto__",
  ]) {
    assert.equal(deriveReportSeverity({ reason, target_type: "post" }), "baixa");
  }
});

test("BA02: razões e alvos legados preservam o fallback existente", () => {
  for (const reason of ["Risco", "AMEAÇA", "abuso", "violência", "ódio", "automutilação"]) {
    for (const target_type of ["post", "reply"]) {
      assert.equal(deriveReportSeverity({ reason, target_type }), "alta");
    }
  }
  for (const reason of ["spam", "assédio", "desrespeito", "desinformação"]) {
    assert.equal(deriveReportSeverity({ reason, target_type: "post" }), "media");
  }
  for (const reason of ["privacy", "other", "", "motivo antigo não catalogado"]) {
    assert.equal(deriveReportSeverity({ reason, target_type: "post" }), "baixa");
    assert.equal(deriveReportSeverity({ reason, target_type: "reply" }), "media");
  }
});

test("BA02: consumidor real ordena por gravidade e data sem mudar total, limite ou DTO", () => {
  const report = (
    id: string,
    reason: string,
    day: number,
  ): Parameters<typeof buildPendingReports>[0][number] => ({
    createdAt: new Date(Date.UTC(2026, 8, day)),
    description: null,
    id,
    post: { community: { name: "Comunidade" }, content: "Conteúdo", title: id },
    reason,
    reply: null,
    reporter: { role: "paciente" },
    status: "pendente",
    target_id: id,
    target_type: "post",
  });
  const input = [
    report("outro", "other", 6),
    report("spam", "spam", 5),
    report("risco", "self_harm", 1),
    report("abuso", "abuse", 2),
    report("legado", "violência", 3),
    report("privacidade", "privacy", 4),
  ];
  const result = buildPendingReports(input, 23);
  assert.deepEqual(
    result.items.map((item) => item.id),
    ["legado", "abuso", "risco", "spam", "outro"],
  );
  assert.equal(result.total, 23);
  assert.equal(result.source, "post_report");
  assert.equal(result.items[1].reason, "abuse");
  assert.equal(result.items[1].status, "pendente");
  assert.equal(input[0].id, "outro");
});
