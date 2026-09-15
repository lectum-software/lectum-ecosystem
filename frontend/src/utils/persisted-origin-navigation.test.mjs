import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { registerHooks } from "node:module";
import test from "node:test";
import { fileURLToPath } from "node:url";

const sourceRoot = new URL("../", import.meta.url);

registerHooks({
  resolve(specifier, context, nextResolve) {
    const resolveCandidate = (candidates, baseUrl) => {
      for (const candidate of candidates) {
        const url = new URL(candidate, baseUrl);
        if (existsSync(fileURLToPath(url))) return { shortCircuit: true, url: url.href };
      }

      return null;
    };

    if (specifier.startsWith("@/")) {
      const path = specifier.slice(2);
      const resolved = resolveCandidate(
        [`${path}.ts`, `${path}.tsx`, `${path}/index.ts`, `${path}/index.tsx`],
        sourceRoot,
      );
      if (resolved) return resolved;
    }

    if (specifier.startsWith("./") || specifier.startsWith("../")) {
      const resolved = resolveCandidate(
        [`${specifier}.ts`, `${specifier}.tsx`, `${specifier}/index.ts`, `${specifier}/index.tsx`],
        context.parentURL,
      );
      if (resolved) return resolved;
    }

    return nextResolve(specifier, context);
  },
});

const {
  getRememberedCommunityFeedHref,
  isCommunityNavigationHref,
  rememberCommunityFeedScrollPosition,
} = await import("./community-feed-scroll-memory.ts");
const { recordAppNavigationPoint } = await import("./navigation-history.ts");
const { navigateBackToPersistedOrigin } = await import("./persisted-origin-navigation.ts");
const {
  getRememberedPsychologistsFeedHref,
  isPsychologistsFeedHref,
  readPsychologistsFeedReturnSnapshot,
  rememberPsychologistsFeedReturnPosition,
  resolvePsychologistsFeedReturnIndex,
  shouldRestorePsychologistsFeedReturnSnapshot,
} = await import("./psychologists-feed-return-memory.ts");
const {
  getPsychologistsFeedRestoreScrollTop,
  PSYCHOLOGISTS_FEED_INSTANT_RESTORE_ATTRIBUTE,
  restorePsychologistsFeedScrollInstantly,
} = await import("../app/app/psychologists/modules/feed-restore-scroll.ts");

class MemoryStorage {
  #items = new Map();

  getItem(key) {
    return this.#items.get(String(key)) ?? null;
  }

  removeItem(key) {
    this.#items.delete(String(key));
  }

  setItem(key, value) {
    this.#items.set(String(key), String(value));
  }
}

const withBrowserNavigation = async (callback) => {
  const previousWindow = globalThis.window;
  const sessionStorage = new MemoryStorage();

  globalThis.window = {
    history: {
      length: 1,
      state: { idx: 0 },
    },
    location: {
      hash: "",
      origin: "https://lectum.local",
      pathname: "/",
      search: "",
    },
    scrollY: 0,
    sessionStorage,
  };

  try {
    await callback({ sessionStorage });
  } finally {
    if (previousWindow === undefined) {
      delete globalThis.window;
    } else {
      globalThis.window = previousWindow;
    }
  }
};

const createRouterSpy = () => {
  const calls = [];

  return {
    calls,
    router: {
      back() {
        calls.push(["back"]);
      },
      push(href) {
        calls.push(["push", href]);
      },
      replace(href, options) {
        calls.push(["replace", href, options]);
      },
    },
  };
};

test("retorna perfil indisponivel para o feed comunitario persistido", async () => {
  const fixedNow = Date.parse("2026-08-29T12:00:00.000Z");
  const previousNow = Date.now;
  Date.now = () => fixedNow;

  try {
    await withBrowserNavigation(() => {
      window.location.pathname = "/comunidades/relacionamentos-com-proposito";
      window.location.search = "?aba=recentes";
      window.location.hash = "#post";
      window.scrollY = 720;

      rememberCommunityFeedScrollPosition("post-1");
      assert.equal(
        getRememberedCommunityFeedHref(),
        "/comunidades/relacionamentos-com-proposito?aba=recentes#post",
      );
      assert.equal(isCommunityNavigationHref("/comunidades/feed/publicacao/post-1"), true);
      assert.equal(isCommunityNavigationHref("/app/community/feed/post/post-1"), true);
      assert.equal(isCommunityNavigationHref("/psicologos"), false);

      recordAppNavigationPoint("/comunidades/relacionamentos-com-proposito");
      recordAppNavigationPoint("/comunidades/relacionamentos-com-proposito/publicacao/post-1");
      window.location.pathname = "/psicologos/profissional-indisponivel";
      window.location.search = "";
      window.location.hash = "";
      recordAppNavigationPoint("/psicologos/profissional-indisponivel");

      const { calls, router } = createRouterSpy();

      navigateBackToPersistedOrigin(router, "/psicologos");

      assert.deepEqual(calls, [
        [
          "replace",
          "/comunidades/relacionamentos-com-proposito?aba=recentes#post",
          { scroll: false },
        ],
      ]);
    });
  } finally {
    Date.now = previousNow;
  }
});

test("ignora feed persistido quando a origem imediata do perfil indisponivel nao e comunidade", async () => {
  const fixedNow = Date.parse("2026-08-29T12:00:00.000Z");
  const previousNow = Date.now;
  Date.now = () => fixedNow;

  try {
    await withBrowserNavigation(() => {
      window.history.length = 2;
      window.history.state = { idx: 1 };
      window.location.pathname = "/comunidades/relacionamentos-com-proposito";
      window.scrollY = 360;
      rememberCommunityFeedScrollPosition("post-2");

      recordAppNavigationPoint("/comunidades/relacionamentos-com-proposito");
      recordAppNavigationPoint("/psicologos");
      window.location.pathname = "/psicologos/profissional-indisponivel";
      recordAppNavigationPoint("/psicologos/profissional-indisponivel");

      const { calls, router } = createRouterSpy();

      navigateBackToPersistedOrigin(router, "/psicologos");

      assert.deepEqual(calls, [["back"]]);
    });
  } finally {
    Date.now = previousNow;
  }
});

test("preserva o slide ativo do feed de psicologos ao abrir perfil e voltar", async () => {
  const fixedNow = Date.parse("2026-09-04T12:00:00.000Z");
  const previousNow = Date.now;
  Date.now = () => fixedNow;

  try {
    await withBrowserNavigation(() => {
      window.location.pathname = "/psicologos";
      window.location.search = "?search=Rafaela";
      window.location.hash = "";

      assert.equal(
        rememberPsychologistsFeedReturnPosition({
          activeIndex: 4,
          feedLoopCycleCount: 3,
          psychologistId: "psi-b",
          scrollTop: 1680,
        }),
        true,
      );

      const snapshot = readPsychologistsFeedReturnSnapshot();

      assert.equal(snapshot?.sourceHref, "/psicologos?search=Rafaela");
      assert.equal(getRememberedPsychologistsFeedHref("psi-b"), "/psicologos?search=Rafaela");
      assert.equal(shouldRestorePsychologistsFeedReturnSnapshot(snapshot), true);
      assert.equal(
        resolvePsychologistsFeedReturnIndex(snapshot, ["psi-a", "psi-b", "psi-c"], 9),
        4,
      );
    });
  } finally {
    Date.now = previousNow;
  }
});

test("restauracao do feed de psicologos posiciona o container sem animacao suave", () => {
  const previousWindow = globalThis.window;
  const callbacks = new Map();
  let nextFrameId = 1;
  const attributes = new Map();
  const requestedSelectors = [];
  const container = {
    clientHeight: 720,
    scrollLeft: 18,
    scrollTop: 0,
    style: {
      scrollBehavior: "smooth",
      scrollSnapType: "y mandatory",
    },
    getAttribute(name) {
      return attributes.get(name) ?? null;
    },
    querySelector(selector) {
      requestedSelectors.push(selector);
      return selector.includes('"4"') ? { offsetTop: 2880 } : null;
    },
    removeAttribute(name) {
      attributes.delete(name);
    },
    setAttribute(name, value) {
      attributes.set(name, String(value));
    },
  };

  globalThis.window = {
    cancelAnimationFrame(id) {
      callbacks.delete(id);
    },
    requestAnimationFrame(callback) {
      const id = nextFrameId;
      nextFrameId += 1;
      callbacks.set(id, callback);
      return id;
    },
  };

  try {
    const cleanup = restorePsychologistsFeedScrollInstantly(container, 4, 1440);

    assert.deepEqual(requestedSelectors, ['[data-psychologists-slide-index="4"]']);
    assert.equal(container.scrollTop, 2880);
    assert.equal(container.scrollLeft, 0);
    assert.equal(container.style.scrollBehavior, "auto");
    assert.equal(container.style.scrollSnapType, "none");
    assert.equal(attributes.get(PSYCHOLOGISTS_FEED_INSTANT_RESTORE_ATTRIBUTE), "true");

    cleanup();

    assert.equal(container.style.scrollBehavior, "smooth");
    assert.equal(container.style.scrollSnapType, "y mandatory");
    assert.equal(attributes.get(PSYCHOLOGISTS_FEED_INSTANT_RESTORE_ATTRIBUTE), undefined);
  } finally {
    if (previousWindow === undefined) {
      delete globalThis.window;
    } else {
      globalThis.window = previousWindow;
    }
  }
});

test("restauracao do feed de psicologos usa fallback quando slide nao existe", () => {
  assert.equal(
    getPsychologistsFeedRestoreScrollTop(
      {
        clientHeight: 620,
        querySelector() {
          return null;
        },
      },
      3,
      1240,
    ),
    1240,
  );

  assert.equal(
    getPsychologistsFeedRestoreScrollTop(
      {
        clientHeight: 620,
        querySelector() {
          return null;
        },
      },
      3,
    ),
    1860,
  );
});

test("restaura por id quando a ordem renderizada dos psicologos mudou", async () => {
  const fixedNow = Date.parse("2026-09-04T12:00:00.000Z");
  const previousNow = Date.now;
  Date.now = () => fixedNow;

  try {
    await withBrowserNavigation(() => {
      window.location.pathname = "/app/psychologists";
      window.location.search = "";
      window.location.hash = "";

      rememberPsychologistsFeedReturnPosition({
        activeIndex: 5,
        feedLoopCycleCount: 3,
        psychologistId: "psi-c",
        scrollTop: 2400,
      });

      const snapshot = readPsychologistsFeedReturnSnapshot();

      assert.equal(isPsychologistsFeedHref("/app/psychologists"), true);
      assert.equal(isPsychologistsFeedHref("/psicologos/psi-c"), false);
      assert.equal(resolvePsychologistsFeedReturnIndex(snapshot, ["psi-a", "psi-c"], 4), 1);
    });
  } finally {
    Date.now = previousNow;
  }
});

test("ignora snapshot antigo ou de outra query do feed de psicologos", async () => {
  const fixedNow = Date.parse("2026-09-04T12:00:00.000Z");
  const previousNow = Date.now;
  Date.now = () => fixedNow;

  try {
    await withBrowserNavigation(({ sessionStorage }) => {
      window.location.pathname = "/psicologos";
      window.location.search = "?search=Rafaela";

      rememberPsychologistsFeedReturnPosition({
        activeIndex: 2,
        feedLoopCycleCount: 3,
        psychologistId: "psi-c",
        scrollTop: 820,
      });

      const snapshot = readPsychologistsFeedReturnSnapshot();
      window.location.search = "?search=Ana";

      assert.equal(shouldRestorePsychologistsFeedReturnSnapshot(snapshot), false);

      Date.now = () => fixedNow + 31 * 60 * 1000;

      assert.equal(readPsychologistsFeedReturnSnapshot(), null);
      assert.equal(sessionStorage.getItem("lectum.psychologists.feedReturn.v1"), null);
    });
  } finally {
    Date.now = previousNow;
  }
});
