import assert from "node:assert/strict";
import { before, describe, it } from "node:test";
import i18next from "@/main/server/i18n";
import { messages } from "./constants";

describe("notification push messages", () => {
  before(async () => {
    if (i18next.isInitialized) return;
    await new Promise<void>((resolve, reject) => {
      const startedAt = Date.now();
      const interval = setInterval(() => {
        if (i18next.isInitialized) {
          clearInterval(interval);
          resolve();
          return;
        }
        if (Date.now() - startedAt > 2_000) {
          clearInterval(interval);
          reject(new Error("i18n initialization timeout"));
        }
      }, 20);
    });
  });

  it("interpola o nome real do usuario na notificacao de nova avaliacao", () => {
    assert.equal(
      messages.nova_avaliacao({ name: "Túlio Rezende" }).body,
      "Túlio Rezende enviou uma nova avaliação. Clique para ver.",
    );
  });

  it("nao deixa placeholder bruto quando o nome nao esta disponivel", () => {
    const content = messages.nova_avaliacao({});

    assert.equal(content.body.includes("{{name}}"), false);
    assert.equal(content.body, "Um usuário enviou uma nova avaliação. Clique para ver.");
  });
});
