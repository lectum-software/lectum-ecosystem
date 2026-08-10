import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { sanitizePublicProvenanceSource, sanitizePublicResponseData } from "./public-response";

describe("sanitizePublicResponseData", () => {
  it("troca nomes de tabelas, colunas e composições por proveniência leiga", () => {
    assert.deepEqual(
      sanitizePublicResponseData({
        account: { source: "user_token+admin_activity_log" },
        billing: { source: "professional_subscription+payment_event" },
        metric: { source: "page_view_event.duration_seconds" },
        mixed: { source: "user+page_view_event+community_post" },
      }),
      {
        account: { source: "contas" },
        billing: { source: "pagamentos" },
        metric: { source: "engajamento" },
        mixed: { source: "plataforma" },
      },
    );
  });

  it("troca marcadores técnicos simples por categorias leigas", () => {
    assert.deepEqual(
      sanitizePublicResponseData({
        admin: { source: "admin_panel" },
        google: { source: "google_registration" },
        patient: { source: "patient_registration" },
        psychologist: { source: "psychologist_registration" },
        visitor: { source: "visitor_id" },
      }),
      {
        admin: { source: "plataforma" },
        google: { source: "contas" },
        patient: { source: "contas" },
        psychologist: { source: "contas" },
        visitor: { source: "engajamento" },
      },
    );
  });

  it("preserva fontes de domínio usadas pelos clientes", () => {
    for (const source of [
      "admin_grant",
      "automatic",
      "free_signup",
      "ip",
      "manual",
      "manual_admin",
      "mercadopago",
      "organic",
      "search_result",
    ]) {
      assert.equal(sanitizePublicProvenanceSource(source), source);
    }
  });

  it("não altera campos source relacionados, como traffic_source", () => {
    assert.deepEqual(
      sanitizePublicResponseData({ source: "page_view_event", traffic_source: "organic" }),
      { source: "engajamento", traffic_source: "organic" },
    );
  });
  it("preserva aliases reaproveitados quando eles nao sao ciclos", () => {
    const subscription = {
      id: "subscription-id",
      plan: {
        name: "Plano Profissional",
        slug: "profissional",
      },
      source: "admin_grant",
      status: "ativa",
    };

    assert.deepEqual(sanitizePublicResponseData({ current: subscription, subscription }), {
      current: subscription,
      subscription,
    });
  });
});
