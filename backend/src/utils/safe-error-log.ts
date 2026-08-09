export type SafeErrorLog = {
  name: string;
};

const SAFE_CLASSIFICATION_PATTERN = /^[A-Z][A-Za-z0-9]{0,63}$/;

export const toSafeErrorLog = (_error: unknown, fallback = "UnknownError"): SafeErrorLog => ({
  name: SAFE_CLASSIFICATION_PATTERN.test(fallback) ? fallback : "UnknownError",
});
