import { configureStore } from "@reduxjs/toolkit";

import { authPersistenceMiddleware } from "./middleware/auth-persistence";
import rootReducer from "./modules/rootReducers";

const store = configureStore({
  reducer: rootReducer,
  middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(authPersistenceMiddleware),
});

export { store };
export type RootState = ReturnType<typeof rootReducer>;
export type AppDispatch = typeof store.dispatch;
