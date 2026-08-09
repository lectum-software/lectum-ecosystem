import webPush from "web-push";
import { normalizeVapidSubject } from "@/utils/vapid-subject";

export const vapidKeys = {
  email: normalizeVapidSubject(process.env.VAPID_EMAIL),
  publicKey: process.env.VAPID_PUBLIC_KEY?.trim() || "",
  privateKey: process.env.VAPID_PRIVATE_KEY?.trim() || "",
};

let webPushConfigured = false;

if (vapidKeys.email && vapidKeys.publicKey && vapidKeys.privateKey) {
  try {
    webPush.setVapidDetails(vapidKeys.email, vapidKeys.publicKey, vapidKeys.privateKey);
    webPushConfigured = true;
  } catch {
    console.warn("[WEB NOTIFICATION] Configuração inválida; canal push desabilitado.");
  }
}

export const isWebPushConfigured = () => webPushConfigured;

export default webPush;
