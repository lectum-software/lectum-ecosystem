import type { ExperienceSdk } from "./experience-controller";

type Clarity = ((...args: unknown[]) => void) & { v?: string };
type ClarityWindow = Window & { clarity?: Clarity };

// Pinned to the actual project library validated in TASK-354. Do not load the
// hosted tag: it starts capture immediately and also performs a cookie-sync call.
const LIBRARY = "https://scripts.clarity.ms/0.8.80-beta/clarity.js";

export function loadExperienceSdk(): Promise<ExperienceSdk> {
  return new Promise((resolve, reject) => {
    const host = window as ClarityWindow;
    if (host.clarity) {
      reject(new Error("experience_sdk_already_owned"));
      return;
    }
    const script = document.createElement("script");
    script.src = LIBRARY;
    script.async = true;
    script.referrerPolicy = "no-referrer";
    const timer = window.setTimeout(fail, 15_000);
    function fail() {
      window.clearTimeout(timer);
      script.remove();
      reject(new Error("experience_sdk_unavailable"));
    }
    script.onerror = fail;
    script.onload = () => {
      window.clearTimeout(timer);
      const clarity = host.clarity;
      if (typeof clarity !== "function" || !clarity.v) {
        fail();
        return;
      }
      let previousMask: string | null = null;
      let started = false;
      resolve({
        start() {
          if (started) return;
          previousMask = document.body.getAttribute("data-clarity-mask");
          document.body.setAttribute("data-clarity-mask", "true");
          started = true;
          clarity("start", {
            projectId: "zc89m5ggga",
            upload: "https://b.clarity.ms/collect",
            content: false,
            track: false,
            cookies: [],
          });
          clarity("consentv2", { analytics_Storage: "denied", ad_Storage: "denied" });
        },
        stop() {
          if (!started) return;
          clarity("stop");
          started = false;
          if (previousMask === null) document.body.removeAttribute("data-clarity-mask");
          else document.body.setAttribute("data-clarity-mask", previousMask);
        },
      });
    };
    document.head.appendChild(script);
  });
}
