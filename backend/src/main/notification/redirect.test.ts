import assert from "node:assert/strict";
import test from "node:test";
import { professionalAnalyticsNotificationRedirect } from "./redirect";

for (const key of ["novo_favorito", "clique_whatsapp"]) {
  test(`${key} opens notifications from push and analytics from in-app`, () => {
    for (const fallback of ["/app/profissional/estatisticas", "/psicologos/old", null, undefined]) {
      assert.equal(
        professionalAnalyticsNotificationRedirect(key, "push", fallback),
        "/app/notificacoes",
      );
      assert.equal(
        professionalAnalyticsNotificationRedirect(key, "in_app", fallback),
        "/app/profissional/estatisticas",
      );
    }
  });
}

test("other notifications preserve their destinations in both channels", () => {
  for (const channel of ["push", "in_app"] as const) {
    for (const key of ["nova_resposta", "visualizacao_perfil", "weekly_whatsapp_report", null]) {
      for (const fallback of [
        "/comunidades/test",
        "/app/notificacoes?whatsapp_week=report",
        null,
        undefined,
      ]) {
        assert.equal(professionalAnalyticsNotificationRedirect(key, channel, fallback), fallback);
      }
    }
  }
});
