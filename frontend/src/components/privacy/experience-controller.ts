export type ExperienceSdk = { start: () => void; stop: () => void };

// A scope identifies an authorization locally; it is never sent to the SDK.
export function createExperienceController(options: {
  scope: () => string | null;
  load: () => Promise<ExperienceSdk>;
}) {
  let sdk: ExperienceSdk | null = null;
  let loading: Promise<void> | null = null;
  let activeScope: string | null = null;
  let disposed = false;
  let failed = false;
  let generation = 0;

  function stop() {
    generation++;
    if (activeScope !== null) {
      activeScope = null;
      sdk?.stop();
    }
  }

  function sync(): Promise<void> {
    const scope = options.scope();
    if (disposed || failed || !scope) {
      stop();
      return Promise.resolve();
    }
    if (activeScope === scope) return Promise.resolve();
    if (activeScope !== null) stop();
    if (loading) return loading;
    const request = ++generation;
    loading = (async () => {
      try {
        sdk = await (sdk ?? options.load());
        // Consent, account and route can change while the library is downloading.
        if (disposed || request !== generation || options.scope() !== scope) return;
        activeScope = scope;
        sdk.start();
      } catch {
        failed = true;
        stop();
      } finally {
        loading = null;
      }
    })();
    return loading;
  }

  return {
    sync,
    stop,
    dispose() {
      disposed = true;
      stop();
    },
  };
}
