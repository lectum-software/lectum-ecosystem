import { parsePrivacyChoice } from "../privacy/policy";
import { loadLocalPixelSdk } from "./meta-pixel-loader";
import { type ProfessionalPixelEvent, prepareProfessionalPixelCommands } from "./meta-pixel-policy";

type Context = {
  sandbox: boolean;
  authorizedTest: boolean;
  metadataReviewed: boolean;
  origin: string;
  pathname: string;
  search: string;
  hash: string;
  role: string;
  consent: string | null;
};

type Event = { eventName: ProfessionalPixelEvent; eventId: string; actionConfirmed: boolean };
type Command = readonly unknown[];

// No global SDK installation. A separately reviewed isolated caller owns the port.
export function createPixelTestSession(options: {
  context: () => Context;
  load?: () => Promise<(command: Command) => void>;
  now?: () => number;
}) {
  const attempted = new Set<string>();
  let disabled = false;
  let initializing: Promise<void> | undefined;
  let dispatch: ((command: Command) => void) | undefined;
  const now = options.now ?? Date.now;
  const pixelId = "1606598847399888";

  function allowed() {
    const c = options.context();
    const consent = parsePrivacyChoice(c.consent, now());
    return (
      !disabled &&
      c.sandbox === true &&
      c.authorizedTest === true &&
      c.metadataReviewed === true &&
      c.role === "professional" &&
      /^https?:\/\/(localhost|127\.0\.0\.1)(:\d{1,5})?$/.test(c.origin) &&
      c.pathname === "/app/profissional/assinatura/pagamento" &&
      c.search === "" &&
      c.hash === "" &&
      consent?.campaigns === true &&
      consent.authorizeTransfer === true &&
      !consent.pendingRevocation
    );
  }

  function stop() {
    disabled = true;
    try {
      dispatch?.(["consent", "revoke"]);
    } catch {
      /* No retry after an SDK error. */
    }
  }

  async function send(event: Event) {
    const commands = prepareProfessionalPixelCommands({ pixelId, ...event });
    if (!allowed() || event.actionConfirmed !== true || !commands)
      return { state: "blocked" as const };
    const key = `${event.eventName}:${event.eventId}`;
    if (attempted.has(key)) return { state: "duplicate" as const };
    attempted.add(key);
    try {
      initializing ??= (async () => {
        dispatch = await (options.load ? options.load() : loadLocalPixelSdk(allowed));
        // Consent or navigation may change while the SDK is loading.
        if (!allowed()) {
          stop();
          return;
        }
        dispatch(["consent", "grant"]);
        dispatch(commands[0]);
        dispatch(commands[1]);
      })();
      await initializing;
      if (!allowed() || !dispatch) {
        stop();
        return { state: "blocked" as const };
      }
      dispatch(commands[2]);
      // SDK dispatch does not establish Meta receipt, attribution or eligibility.
      return { state: "dispatched" as const };
    } catch {
      stop();
      return { state: "unknown" as const };
    }
  }

  return { send, stop };
}
