export type SafeErrorLog = {
  name: string;
};

export const toSafeErrorLog = (error: unknown, fallback = "UnknownError"): SafeErrorLog => ({
  name:
    error instanceof Error && error.name.trim().length > 0 ? error.name.slice(0, 100) : fallback,
});
