/**
 * Converte uma VAPID public key (base64 URL-safe) em Uint8Array,
 * formato exigido por `pushManager.subscribe({ applicationServerKey })`.
 * Utilizado na inscrição do navegador para notificações push.
 */
export function urlToBase64(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(new ArrayBuffer(rawData.length));

  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  return outputArray;
}
