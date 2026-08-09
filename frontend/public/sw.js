// Service worker de push (TASK-29A). Recebe a notificação enviada pelo backend
// (web-push) e exibe; ao clicar, abre o deep-link em `data.redirect`.

const DEFAULT_NOTIFICATION_BODY = "Você recebeu uma nova notificação.";
const MAX_NOTIFICATION_TEXT_LENGTH = 240;
const MAX_REDIRECT_LENGTH = 2048;
const UNSAFE_NOTIFICATION_TEXT_PATTERNS = [
  /https?:\/\//i,
  /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i,
  /\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/,
  /(?:^|\D)(?:\+?55[\s.-]?)?(?:\(?\d{2}\)?[\s.-]?)?(?:9\d{4}|\d{4})[\s.-]?\d{4}(?=\D|$)/,
  /\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\b/,
  /\bbearer\s+[A-Za-z0-9._~+/=-]{12,}\b/i,
  /\b(?:sk|pk)_(?:live|test)_[A-Za-z0-9_-]{12,}\b/i,
  /\b(?:request failed|network error|internal server error|socket hang up)\b/i,
  /\b(?:axios|prisma|postgres(?:ql)?|sqlstate|stack trace|node_modules)\b/i,
  /\b(?:api[-_ ]?key|authorization|password|secret|senha|token)\s*[:=]\s*\S+/i,
];

const safeNotificationText = (value, fallback) => {
  if (typeof value !== "string") return fallback;

  const normalized = value.replace(/\s+/g, " ").trim();
  if (
    !normalized ||
    normalized.length > MAX_NOTIFICATION_TEXT_LENGTH ||
    UNSAFE_NOTIFICATION_TEXT_PATTERNS.some((pattern) => pattern.test(normalized))
  ) {
    return fallback;
  }

  return normalized;
};

const normalizeNotificationRedirect = (value) => {
  if (typeof value !== "string") return "/";

  const normalized = value.trim();
  const hasControlCharacter = Array.from(normalized).some((character) => {
    const code = character.charCodeAt(0);
    return code <= 31 || code === 127;
  });

  if (
    !normalized ||
    normalized.length > MAX_REDIRECT_LENGTH ||
    !normalized.startsWith("/") ||
    normalized.startsWith("//") ||
    normalized.includes("\\") ||
    hasControlCharacter
  ) {
    return "/";
  }

  try {
    const url = new URL(normalized, self.location.origin);
    if (url.origin !== self.location.origin) return "/";

    const decodedPath = decodeURIComponent(url.pathname);
    if (decodedPath.startsWith("//") || decodedPath.includes("\\")) return "/";

    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return "/";
  }
};

self.addEventListener("push", (event) => {
  if (!event.data) return;

  let payload = {};
  try {
    payload = event.data.json();
  } catch {
    payload = { notification: { title: "Lectum", body: DEFAULT_NOTIFICATION_BODY } };
  }

  const notification =
    payload && typeof payload === "object" && payload.notification ? payload.notification : {};
  const data = payload && typeof payload === "object" && payload.data ? payload.data : {};
  const redirect = normalizeNotificationRedirect(data.redirect);

  event.waitUntil(
    self.registration
      .showNotification(safeNotificationText(notification.title, "Lectum"), {
        body: safeNotificationText(notification.body, DEFAULT_NOTIFICATION_BODY),
        icon: "/icon.png",
        badge: "/icon.png",
        data: { redirect },
      })
      .catch(() => undefined),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const redirect = normalizeNotificationRedirect(event.notification.data?.redirect);

  event.waitUntil(
    (async () => {
      const clientList = await self.clients.matchAll({ type: "window", includeUncontrolled: true });

      for (const client of clientList) {
        if (!("focus" in client)) continue;

        if ("navigate" in client) {
          try {
            await client.navigate(redirect);
          } catch {
            // A aba ainda pode receber foco se a navegação tiver sido recusada.
          }
        }

        return client.focus();
      }

      if (self.clients.openWindow) return self.clients.openWindow(redirect);
      return undefined;
    })().catch(() => undefined),
  );
});
