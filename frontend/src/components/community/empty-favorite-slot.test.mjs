import "../../../scripts/register-source-modules.mjs";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { registerHooks } from "node:module";
import test from "node:test";
import { configureStore } from "@reduxjs/toolkit";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Provider } from "react-redux";

const nextImageUrl = import.meta.resolve("next/image.js");
const imageBridge = `data:text/javascript,${encodeURIComponent(
  `import Image from ${JSON.stringify(nextImageUrl)}; export default Image.default ?? Image;`,
)}`;
registerHooks({
  resolve(specifier, context, nextResolve) {
    return nextResolve(
      specifier === "next/image"
        ? imageBridge
        : ["next/link", "next/navigation"].includes(specifier)
          ? `${specifier}.js`
          : specifier,
      context,
    );
  },
});
const { AuthorIdentityLine } = await import(
  "../../app/app/community/[slug]/components/feed-controls.tsx"
);
const { FeedFavoriteButton } = await import("./feed-favorite-button.tsx");
const { default: rootReducer } = await import("../../store/modules/rootReducers.ts");
const { default: keys } = await import("../../api/cache/keys.ts");
const { ProgressiveConversionContext, noopContext } = await import(
  "../conversion/progressive-conversion-state.ts"
);

const renderIdentity = ({ viewerId, ids, community = true }) => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  if (ids) client.setQueryData(keys.patient.favoriteIds(viewerId), ids);
  const store = configureStore({
    reducer: rootReducer,
    preloadedState: { user: viewerId ? { id: viewerId } : null },
  });
  const author = { id: "psi", name: "Ana Lima", role: "psicologo" };
  const html = renderToStaticMarkup(
    createElement(
      Provider,
      { store },
      createElement(
        QueryClientProvider,
        { client },
        createElement(
          ProgressiveConversionContext.Provider,
          { value: { ...noopContext, isAuthenticated: Boolean(viewerId) } },
          createElement(AuthorIdentityLine, {
            name: author.name,
            verified: true,
            action: createElement(FeedFavoriteButton, { author }),
            community: community
              ? { name: "Ansiedade em Equilibrio", slug: "ansiedade", category: "Ansiedade" }
              : undefined,
          }),
        ),
      ),
    ),
  );
  client.clear();
  return html;
};

test("own posts keep badge and community while their favorite slot is empty", () => {
  for (const ids of [undefined, [], ["psi"]]) {
    const html = renderIdentity({ viewerId: "psi", ids });
    assert.match(html, /Perfil verificado/);
    assert.match(
      html,
      /<span class="ml-1 flex h-0 w-\[66px\][^"]*"><\/span><a[^>]*data-original-post-community/,
    );
    assert.doesNotMatch(html, /favorite-toggle|Favoritar Ana Lima/);
  }
});

test("other profiles retain the label or heart; unresolved favorites have no button", () => {
  assert.match(renderIdentity({}), /aria-pressed="false"/);
  assert.match(renderIdentity({ viewerId: "viewer", ids: [] }), /aria-pressed="false"/);
  assert.match(renderIdentity({ viewerId: "viewer", ids: ["psi"] }), /aria-pressed="true"/);
  assert.doesNotMatch(renderIdentity({ viewerId: "viewer" }), /favorite-toggle/);
});

test("empty-slot CSS only collapses slots next to a community and restores its width", () => {
  const css = readFileSync(new URL("../../app/globals.css", import.meta.url), "utf8");
  assert.match(css, /span:empty:has\(\+ \[data-original-post-community\]\)\s*\{\s*display: none;/);
  assert.match(css, /span:empty \+ \[data-original-post-community\]\s*\{\s*max-width: 48%;/);
  assert.doesNotMatch(css, /(?:^|\n)span:empty\s*\{/);
  assert.doesNotMatch(
    renderIdentity({ viewerId: "psi", ids: [], community: false }),
    /data-original-post-community|lucide-chevron-right/,
  );
});
