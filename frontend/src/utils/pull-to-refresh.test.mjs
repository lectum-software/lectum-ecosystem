import assert from "node:assert/strict";
import test from "node:test";

const {
  getPullToRefreshSnapshot,
  isPullToRefreshRouteEnabled,
  PULL_TO_REFRESH_MAX_DISTANCE_PX,
  PULL_TO_REFRESH_TRIGGER_PX,
  shouldIgnorePullToRefreshTarget,
} = await import("./pull-to-refresh.ts");

test("calcula progresso ate o ponto de soltar para atualizar", () => {
  assert.deepEqual(getPullToRefreshSnapshot(0), {
    progress: 0,
    status: "pulling",
    translateY: 10,
  });

  assert.equal(getPullToRefreshSnapshot(PULL_TO_REFRESH_TRIGGER_PX - 1).status, "pulling");
  assert.equal(getPullToRefreshSnapshot(PULL_TO_REFRESH_TRIGGER_PX).status, "ready");
  assert.equal(getPullToRefreshSnapshot(PULL_TO_REFRESH_MAX_DISTANCE_PX + 20).progress, 1);
});

test("habilita pull-to-refresh em rotas de leitura e descoberta", () => {
  for (const pathname of [
    "/",
    "/psicologos",
    "/psicologos/profissional-1",
    "/comunidades",
    "/comunidades/ansiedade",
    "/comunidades/ansiedade/publicacao/post-1",
    "/app/notificacoes",
    "/app/favoritos",
    "/app/publicacoes/minhas",
    "https://lectum.local/psicologos?search=sono",
  ]) {
    assert.equal(isPullToRefreshRouteEnabled(pathname), true, pathname);
  }
});

test("desabilita pull-to-refresh em rotas de formulario e configuracao", () => {
  for (const pathname of [
    "/auth/login",
    "/auth/register",
    "/version",
    "/app/configuracoes/conta",
    "/app/settings/notifications",
    "/app/perfil/editar",
    "/app/profile/edit",
    "/app/profissional/assinatura/planos",
    "/app/profissional/cfp",
    "/app/profissional/whatsapp/verificar",
    "/app/professional/cfp",
    "/app/profissional/perfil/configurar",
    "/app/comunidades/feed/publicacao/nova",
    "/app/community/feed/post/new",
    "/app/comunidades/sugerir",
    "/psychologist/cfp",
  ]) {
    assert.equal(isPullToRefreshRouteEnabled(pathname), false, pathname);
  }
});

test("permite arrasto convencional em cards clicaveis e protege campos", () => {
  const previousElement = globalThis.Element;

  class FakeElement {
    constructor(matchClosest) {
      this.matchClosest = matchClosest;
    }

    closest(selector) {
      return this.matchClosest(selector) ? this : null;
    }
  }

  Object.defineProperty(globalThis, "Element", {
    configurable: true,
    value: FakeElement,
    writable: true,
  });

  try {
    const buttonCard = new FakeElement((selector) => selector.split(",").includes("button"));
    const inputField = new FakeElement((selector) => selector.includes("input"));

    assert.equal(shouldIgnorePullToRefreshTarget(buttonCard), false);
    assert.equal(shouldIgnorePullToRefreshTarget(inputField), true);
  } finally {
    if (previousElement === undefined) {
      delete globalThis.Element;
    } else {
      Object.defineProperty(globalThis, "Element", {
        configurable: true,
        value: previousElement,
        writable: true,
      });
    }
  }
});
