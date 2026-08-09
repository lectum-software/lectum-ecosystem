export type BrowserStorageName = "localStorage" | "sessionStorage";

export const getBrowserStorage = (name: BrowserStorageName) => {
  if (typeof window === "undefined") return null;

  try {
    return window[name];
  } catch {
    return null;
  }
};

export const readStorageItem = (storage: Storage | null, key: string) => {
  if (!storage) return null;

  try {
    return storage.getItem(key);
  } catch {
    return null;
  }
};

export const writeStorageItem = (storage: Storage | null, key: string, value: string) => {
  if (!storage) return false;

  try {
    storage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
};

export const removeStorageItem = (storage: Storage | null, key: string) => {
  if (!storage) return false;

  try {
    storage.removeItem(key);
    return true;
  } catch {
    return false;
  }
};
