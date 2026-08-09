import {
  getBrowserStorage,
  readStorageItem,
  removeStorageItem,
  writeStorageItem,
} from "@/utils/browser-storage";

export type ActivePromptOwner = "notification-permission" | "pwa-install";

const ACTIVE_PROMPT_KEY = "lectum.activePrompt";
let activePromptInMemory: ActivePromptOwner | null = null;

export const reserveActivePrompt = (owner: ActivePromptOwner) => {
  if (activePromptInMemory && activePromptInMemory !== owner) return false;

  const storage = getBrowserStorage("sessionStorage");
  const persistedOwner = readStorageItem(storage, ACTIVE_PROMPT_KEY);
  // A memoria e a fonte de verdade durante a vida da pagina. Se ela reiniciou,
  // um owner mantido pelo sessionStorage veio de um documento anterior (reload)
  // e nao representa mais um prompt visivel.
  if (!activePromptInMemory && persistedOwner) {
    removeStorageItem(storage, ACTIVE_PROMPT_KEY);
  }

  if (activePromptInMemory && persistedOwner && persistedOwner !== owner) return false;

  activePromptInMemory = owner;
  writeStorageItem(storage, ACTIVE_PROMPT_KEY, owner);
  return true;
};

export const releaseActivePrompt = (owner: ActivePromptOwner) => {
  if (activePromptInMemory === owner) activePromptInMemory = null;

  const storage = getBrowserStorage("sessionStorage");
  if (readStorageItem(storage, ACTIVE_PROMPT_KEY) === owner) {
    removeStorageItem(storage, ACTIVE_PROMPT_KEY);
  }
};
