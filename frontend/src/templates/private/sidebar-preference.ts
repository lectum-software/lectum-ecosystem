export const DESKTOP_SIDEBAR_STORAGE_KEY_PREFIX = "lectum.desktopSidebar";

export const DESKTOP_SIDEBAR_STORAGE_EVENT = "lectum:desktop-sidebar-change";

const memoryPreferences = new Map<string, boolean>();

export const getDesktopSidebarStorageKey = (pathname: string) => {
  return `${DESKTOP_SIDEBAR_STORAGE_KEY_PREFIX}:${pathname}`;
};

export const readDesktopSidebarPreference = (pathname: string) => {
  if (typeof window === "undefined") return null;

  try {
    const storedPreference = window.localStorage.getItem(getDesktopSidebarStorageKey(pathname));

    if (storedPreference === "collapsed") return true;
    if (storedPreference === "expanded") return false;
  } catch {
    // Continua com a preferência em memória quando o storage está bloqueado.
  }

  return memoryPreferences.get(pathname) ?? null;
};

export const writeDesktopSidebarPreference = (pathname: string, collapsed: boolean) => {
  if (typeof window === "undefined") return;

  memoryPreferences.set(pathname, collapsed);

  try {
    window.localStorage.setItem(
      getDesktopSidebarStorageKey(pathname),
      collapsed ? "collapsed" : "expanded",
    );
  } catch {
    // A preferência em memória mantém o controle funcional nesta aba.
  }

  window.dispatchEvent(new Event(DESKTOP_SIDEBAR_STORAGE_EVENT));
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
