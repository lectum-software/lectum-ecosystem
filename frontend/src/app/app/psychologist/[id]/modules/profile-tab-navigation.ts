import type { ProfileTabHistoryMode } from "./support";

/** These tabs are client queries; changing them must not wait for a server navigation. */
export const updateProfileSearchParams = (
  mutate: (params: URLSearchParams) => void,
  historyMode: ProfileTabHistoryMode = "replace",
) => {
  const url = new URL(window.location.href);
  mutate(url.searchParams);
  if (url.href === window.location.href) return;
  const href = `${url.pathname}${url.search}${url.hash}`;
  if (historyMode === "push") window.history.pushState(null, "", href);
  else window.history.replaceState(null, "", href);
};
