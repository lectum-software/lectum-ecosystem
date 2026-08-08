export const DESKTOP_SIDEBAR_STORAGE_KEY_PREFIX = "lectum.desktopSidebar";

export const DESKTOP_SIDEBAR_STORAGE_EVENT = "lectum:desktop-sidebar-change";

export const getDesktopSidebarStorageKey = (pathname: string) => {
  return `${DESKTOP_SIDEBAR_STORAGE_KEY_PREFIX}:${pathname}`;
};

export const readDesktopSidebarPreference = (pathname: string) => {
  if (typeof window === "undefined") return null;

  const storedPreference = window.localStorage.getItem(getDesktopSidebarStorageKey(pathname));

  if (storedPreference === "collapsed") return true;
  if (storedPreference === "expanded") return false;

  return null;
};

export const subscribeDesktopSidebarPreference = (onStoreChange: () => void) => {
  if (typeof window === "undefined") return () => undefined;

  const handleStoreChange = () => onStoreChange();

  window.addEventListener("storage", handleStoreChange);
  window.addEventListener(DESKTOP_SIDEBAR_STORAGE_EVENT, handleStoreChange);

  return () => {
    window.removeEventListener("storage", handleStoreChange);
    window.removeEventListener(DESKTOP_SIDEBAR_STORAGE_EVENT, handleStoreChange);
  };
};
