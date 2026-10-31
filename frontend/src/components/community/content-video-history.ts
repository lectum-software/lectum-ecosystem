import type { ContentVideoRequest } from "./content-video-context";

const key = "lectumContentVideo";
const locationKey = () => `${window.location.pathname}${window.location.search}`;

export const saveContentVideoHistory = (
  request: ContentVideoRequest,
  scope: string,
  userId: string,
) => {
  try {
    window.history.replaceState(
      {
        ...window.history.state,
        [key]: { request, scope, userId, location: locationKey() },
      },
      "",
    );
  } catch {
    /* Navigation remains available if the browser cannot persist history. */
  }
};

export const readContentVideoHistory = (
  scope: string,
  userId: string,
): ContentVideoRequest | null => {
  const saved = window.history.state?.[key];
  if (
    !saved ||
    saved.scope !== scope ||
    saved.userId !== userId ||
    saved.location !== locationKey()
  )
    return null;
  const request = saved.request;
  if (
    !request ||
    typeof request.initial?.postId !== "string" ||
    !request.initial.postId ||
    !Number.isFinite(request.initialTime) ||
    request.initialTime < 0
  )
    return null;
  return request;
};

export const clearContentVideoHistory = () => {
  if (!window.history.state?.[key]) return;
  const state = { ...window.history.state };
  delete state[key];
  try {
    window.history.replaceState(state, "");
  } catch {
    /* No persistent storage is required. */
  }
};
