export class ShareRenderQueueFullError extends Error {
  constructor() {
    super("SHARE_RENDER_QUEUE_FULL");
    this.name = "ShareRenderQueueFullError";
  }
}

type Waiter = {
  reject: (error: Error) => void;
  resolve: () => void;
};

const abortedError = () => {
  const error = new Error("SHARE_RENDER_ABORTED");
  error.name = "AbortError";
  return error;
};

export class ShareRenderConcurrencyGate {
  private active = 0;

  private readonly waiters: Waiter[] = [];

  constructor(
    private readonly concurrency: number,
    private readonly queueSize: number,
  ) {}

  async acquire(signal?: AbortSignal) {
    if (signal?.aborted) throw abortedError();

    if (this.active < this.concurrency) {
      this.active += 1;
      return;
    }

    if (this.waiters.length >= this.queueSize) {
      throw new ShareRenderQueueFullError();
    }

    await new Promise<void>((resolve, reject) => {
      let handleAbort = () => undefined;
      const waiter: Waiter = {
        reject,
        resolve: () => {
          signal?.removeEventListener("abort", handleAbort);
          resolve();
        },
      };
      handleAbort = () => {
        const index = this.waiters.indexOf(waiter);
        if (index >= 0) this.waiters.splice(index, 1);
        reject(abortedError());
      };

      signal?.addEventListener("abort", handleAbort, { once: true });
      this.waiters.push(waiter);
    });
  }

  release() {
    const next = this.waiters.shift();
    if (next) {
      next.resolve();
      return;
    }

    this.active = Math.max(0, this.active - 1);
  }
}

export const createShareRenderConcurrencyGate = (concurrency: number, queueSize: number) =>
  new ShareRenderConcurrencyGate(concurrency, queueSize);
