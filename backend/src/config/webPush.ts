import webPush from "web-push";

export const vapidKeys = {
  email: process.env.VAPID_EMAIL!,
  publicKey: process.env.VAPID_PUBLIC_KEY!,
  privateKey: process.env.VAPID_PRIVATE_KEY!,
};

const vapidSubject = `mailto:${process.env.VAPID_EMAIL}`;

webPush.setVapidDetails(vapidSubject, vapidKeys.publicKey, vapidKeys.privateKey);

export default webPush;
