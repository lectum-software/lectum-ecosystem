type CheckoutConsent = {
  granted: boolean;
  collection_available: boolean;
  revision: number;
  document_version: string | null;
  expires_at: string | null;
};

export async function captureOptionalCheckout(input: {
  enabled: boolean;
  operationId: string;
  documentVersion: string;
  hasConsent: () => boolean;
  status: (signal: AbortSignal) => Promise<CheckoutConsent>;
  capture: (
    body: { operationId: string; revision: number; documentVersion: string },
    signal: AbortSignal,
  ) => Promise<unknown>;
  timeoutMs?: number;
}) {
  if (!input.enabled) return;
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const work = async () => {
    try {
      if (!input.hasConsent()) return;
      const status = await input.status(controller.signal);
      if (
        controller.signal.aborted ||
        !input.hasConsent() ||
        !status.granted ||
        !status.collection_available ||
        status.revision < 1 ||
        status.document_version !== input.documentVersion ||
        !status.expires_at ||
        !(Date.parse(status.expires_at) > Date.now())
      )
        return;
      await input.capture(
        {
          operationId: input.operationId,
          revision: status.revision,
          documentVersion: status.document_version,
        },
        controller.signal,
      );
    } catch {
      // Measurement failure never becomes a checkout error, toast or sign-out.
    }
  };
  try {
    await Promise.race([
      work(),
      new Promise<void>((resolve) => {
        timer = setTimeout(() => {
          controller.abort();
          resolve();
        }, input.timeoutMs ?? 1000);
      }),
    ]);
  } finally {
    clearTimeout(timer);
    controller.abort();
  }
}
