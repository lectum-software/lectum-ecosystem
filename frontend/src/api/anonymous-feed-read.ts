// Only these anonymous reads can run before device identification completes.
export const isAnonymousFeedRead = ({
  method,
  url,
  hasSession,
}: {
  method?: string;
  url?: string;
  hasSession: boolean;
}) => {
  if (hasSession || (method ?? "get").toLowerCase() !== "get") return false;
  const path = url?.split("?", 1)[0];
  return (
    path === "/api/private/community" ||
    path === "/api/private/community/feed/posts" ||
    /^\/api\/public\/video-assets\/[a-z0-9_-]{8,64}\/playback$/i.test(path ?? "")
  );
};
