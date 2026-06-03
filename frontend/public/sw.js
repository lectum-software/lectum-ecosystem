// Service worker de push (TASK-29A). Recebe a notificação enviada pelo backend
// (web-push) e exibe; ao clicar, abre o deep-link em `data.redirect`.

self.addEventListener("push", (event) => {
  if (!event.data) return;

  let payload = {};
  try {
    payload = event.data.json();
  } catch {
    payload = { notification: { title: "Lectum", body: event.data.text() } };
  }

  const notification = payload.notification || {};
  const data = payload.data || {};

  // Mesmas opções do sample (comprovadamente funcional): sem tag/requireInteraction,
  // para não coalescer banners no macOS em testes repetidos.
  event.waitUntil(
    self.registration.showNotification(notification.title || "Lectum", {
      body: notification.body || "",
      icon: /*notification.icon ||*/ "/icon.png",
      badge: /*notification.badge ||*/ "/icon.png",
      data,
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const redirect = event.notification.data?.redirect || "/";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ("focus" in client) {
          client.navigate(redirect);
          return client.focus();
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(redirect);
      return undefined;
    }),
  );
});
