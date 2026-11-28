import { type PixelReceipt, pixelCommand } from "./meta-pixel-events";

type PixelFunction = ((...args: unknown[]) => void) & {
  callMethod?: (...args: unknown[]) => void;
  queue: unknown[][];
  push?: PixelFunction;
  loaded: boolean;
  version: string;
  disablePushState: boolean;
};
type PixelWindow = Window & { fbq?: PixelFunction; _fbq?: PixelFunction };
let sdk: Promise<PixelFunction> | null = null;
let configuredId: string | null = null;
let ownedPixel: PixelFunction | null = null;
const sent = new Set<string>();

export function revokeProductionPixel() {
  ownedPixel?.("consent", "revoke");
}

function loadSdk(pixelId: string) {
  if (sdk) return configuredId === pixelId ? sdk : Promise.reject(new Error("pixel_mismatch"));
  const host = window as PixelWindow;
  if (host.fbq || host._fbq) return Promise.reject(new Error("pixel_already_owned"));
  configuredId = pixelId;
  const fbq: PixelFunction = Object.assign(
    (...args: unknown[]) => {
      if (fbq.callMethod) fbq.callMethod(...args);
      else fbq.queue.push(args);
    },
    { queue: [] as unknown[][], loaded: true, version: "2.0", disablePushState: true },
  );
  fbq.push = fbq;
  host.fbq = host._fbq = ownedPixel = fbq;
  fbq("consent", "revoke");
  fbq("set", "autoConfig", false, pixelId);
  fbq("init", pixelId);
  sdk = new Promise<PixelFunction>((resolve, reject) => {
    const script = document.createElement("script");
    script.async = true;
    script.referrerPolicy = "no-referrer";
    script.src = "https://connect.facebook.net/en_US/fbevents.js";
    const fail = () => {
      clearTimeout(timer);
      script.onload = script.onerror = null;
      script.remove();
      revokeProductionPixel();
      reject(new Error("pixel_unavailable"));
    };
    const timer = setTimeout(fail, 15000);
    script.onerror = fail;
    script.onload = () => {
      if (!fbq.callMethod) {
        fail();
        return;
      }
      clearTimeout(timer);
      script.onload = script.onerror = null;
      resolve(fbq);
    };
    document.head.appendChild(script);
  });
  return sdk;
}

export async function sendPixelReceipt(
  pixelId: string,
  receipt: PixelReceipt,
  authorized: () => boolean,
) {
  const command = pixelCommand(pixelId, receipt);
  const key = `${pixelId}:${receipt.eventName}:${receipt.eventId}`;
  if (!command || !authorized() || sent.has(key)) return;
  try {
    if (sessionStorage.getItem(`lectum.pixel.${key}`)) return;
  } catch {
    /* In-memory deduplication still applies when storage is unavailable. */
  }
  const fbq = await loadSdk(pixelId);
  if (!authorized()) {
    revokeProductionPixel();
    return;
  }
  if (sent.has(key)) return;
  sent.add(key);
  fbq("consent", "grant");
  fbq(...command);
  try {
    sessionStorage.setItem(`lectum.pixel.${key}`, "1");
  } catch {
    /* Optional storage. */
  }
}
