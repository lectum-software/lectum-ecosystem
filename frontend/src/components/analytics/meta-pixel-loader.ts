type PixelFunction = ((...args: unknown[]) => void) & {
  callMethod?: (...args: unknown[]) => void;
  queue: unknown[][];
  push?: PixelFunction;
  loaded: boolean;
  version: string;
  disablePushState: boolean;
};
type PixelWindow = Window & { fbq?: PixelFunction; _fbq?: PixelFunction };

export const PIXEL_SDK_URL = "https://connect.facebook.net/en_US/fbevents.js";

// Diagnostic-only. No import-time effects, production hosts or existing SDK reuse.
export function loadLocalPixelSdk(authorized: () => boolean) {
  return new Promise<(command: readonly unknown[]) => void>((resolve, reject) => {
    if (typeof window === "undefined" || typeof document === "undefined") {
      reject(new Error("pixel_browser_required"));
      return;
    }
    const host = window as PixelWindow;
    function permitted() {
      return (
        authorized() &&
        ["127.0.0.1", "localhost"].includes(location.hostname) &&
        ["http:", "https:"].includes(location.protocol) &&
        location.pathname === "/app/profissional/assinatura/pagamento" &&
        !location.search &&
        !location.hash &&
        !document.referrer
      );
    }
    if (!permitted() || host.fbq || host._fbq) {
      reject(new Error("pixel_context_not_isolated"));
      return;
    }
    const fbq: PixelFunction = Object.assign(
      (...args: unknown[]) => {
        if (fbq.callMethod) fbq.callMethod(...args);
        else fbq.queue.push(args);
      },
      { queue: [] as unknown[][], loaded: true, version: "2.0", disablePushState: true },
    );
    fbq.push = fbq;
    host.fbq = host._fbq = fbq;
    fbq("consent", "revoke");
    const script = document.createElement("script");
    script.async = true;
    script.referrerPolicy = "no-referrer";
    script.src = PIXEL_SDK_URL;
    let settled = false;
    let closed = false;
    const revoke = () => {
      closed = true;
      try {
        fbq("consent", "revoke");
      } catch {
        /* Never retry failed tracking. */
      }
    };
    const fail = () => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      script.onload = script.onerror = null;
      revoke();
      script.remove();
      reject(new Error("pixel_sdk_unavailable"));
    };
    const timer = setTimeout(fail, 15000);
    script.onerror = fail;
    script.onload = () => {
      if (!permitted() || typeof fbq.callMethod !== "function") {
        fail();
        return;
      }
      settled = true;
      clearTimeout(timer);
      script.onload = script.onerror = null;
      window.addEventListener("pagehide", revoke, { once: true });
      resolve((command) => {
        if (command[0] === "consent" && command[1] === "revoke") {
          revoke();
          return;
        }
        if (closed || !permitted()) {
          revoke();
          throw new Error("pixel_context_revoked");
        }
        fbq(...command);
      });
    };
    document.head.appendChild(script);
  });
}
