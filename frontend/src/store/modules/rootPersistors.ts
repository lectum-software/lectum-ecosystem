import createWebStorage from "redux-persist/lib/storage/createWebStorage";
import type { PersistConfig } from "redux-persist/lib/types";
import type { RootReducerState } from "./rootReducers";

const createNoopStorage = () => {
  return {
    getItem() {
      return Promise.resolve(null);
    },
    setItem(_key: string, value: string) {
      return Promise.resolve(value);
    },
    removeItem() {
      return Promise.resolve();
    },
  };
};

const storage = typeof window !== "undefined" ? createWebStorage("local") : createNoopStorage();

export const persistConfig: PersistConfig<RootReducerState> = {
  key: "lectum",
  storage,
  whitelist: ["user"],
};
