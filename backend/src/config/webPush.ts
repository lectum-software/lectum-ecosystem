import webPush from "web-push";

export const vapidKeys = {
  email: process.env.VAPID_EMAIL || "",
  publicKey: process.env.VAPID_PUBLIC_KEY || "",
  privateKey: process.env.VAPID_PRIVATE_KEY || "",
};

export const isWebPushConfigured = () =>
  Boolean(vapidKeys.email && vapidKeys.publicKey && vapidKeys.privateKey);

if (isWebPushConfigured()) {
  webPush.setVapidDetails(`mailto:${vapidKeys.email}`, vapidKeys.publicKey, vapidKeys.privateKey);
}

export default webPush;
