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
