import { normalizeDeviceSessionId } from "./device-session";
import { billingReference } from "./observability";
import { createOutboundTransportObserver } from "./outbound-transport";

const observer = createOutboundTransportObserver(
  { origin: "https://api.mercadopago.com", path: "/preapproval/" },
  (report) => console.info("[BILLING] Transporte da tentativa observado.", report),
);

export const observeSubscriptionTransport = <T>(
  expected: {
    subscriptionId: string;
    deviceSessionId?: string;
    authenticatedPayerEmail?: string;
    payloadPayerEmail: string;
  },
  action: () => Promise<T>,
) =>
  observer.run(
    {
      attemptRef: billingReference("attempt", expected.subscriptionId),
      deviceSessionId: normalizeDeviceSessionId(expected.deviceSessionId),
      authenticatedPayerEmail: expected.authenticatedPayerEmail,
      payloadPayerEmail: expected.payloadPayerEmail,
    },
    action,
  );
