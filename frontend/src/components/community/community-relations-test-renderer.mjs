import { configureStore } from "@reduxjs/toolkit";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Provider } from "react-redux";
import keys from "../../api/cache/keys.ts";
import rootReducer from "../../store/modules/rootReducers.ts";
import {
  noopContext,
  ProgressiveConversionContext,
} from "../conversion/progressive-conversion-state.ts";

export const renderRelations = ({ userId, authenticated = Boolean(userId), ids, children }) => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  if (ids) client.setQueryData(keys.patient.favoriteIds(userId), ids);
  const store = configureStore({
    reducer: rootReducer,
    preloadedState: { user: userId ? { id: userId } : null },
  });
  const html = renderToStaticMarkup(
    createElement(
      Provider,
      { store },
      createElement(
        QueryClientProvider,
        { client },
        createElement(
          ProgressiveConversionContext.Provider,
          { value: { ...noopContext, isAuthenticated: authenticated } },
          children,
        ),
      ),
    ),
  );
  client.clear();
  return html;
};
