import assert from "node:assert/strict";
import test from "node:test";
import { favoriteNotificationRedirect } from "./redirect";

test("new and legacy favorite notifications have channel-specific destinations", () => {
  assert.equal(
    favoriteNotificationRedirect("novo_favorito", "in_app", "/psicologos/old"),
    "/app/profissional/estatisticas",
  );
  assert.equal(
    favoriteNotificationRedirect("novo_favorito", "push", "/psicologos/old"),
    "/app/notificacoes",
  );
  assert.equal(
    favoriteNotificationRedirect("nova_resposta", "push", "/comunidades/test"),
    "/comunidades/test",
  );
  assert.equal(favoriteNotificationRedirect(null, "in_app", null), null);
});
