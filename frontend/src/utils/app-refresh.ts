export const LECTUM_APP_REFRESH_EVENT = "lectum:refresh-current-view";

export type LectumAppRefreshSource = "navigation" | "pull";

export type LectumAppRefreshEvent = CustomEvent<{
  source: LectumAppRefreshSource;
}>;

export const requestLectumAppRefresh = (source: LectumAppRefreshSource) => {
  if (typeof window === "undefined") return false;

  window.dispatchEvent(
    new CustomEvent(LECTUM_APP_REFRESH_EVENT, {
      detail: { source },
    }),
  );

  return true;
};
