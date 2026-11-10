export const getPrismaErrorCode = (error: unknown) => {
  if (!error || typeof error !== "object" || !("code" in error)) return null;

  const code = (error as { code?: unknown }).code;
  return typeof code === "string" ? code : null;
};

export const isPrismaErrorCode = (error: unknown, codes: string | readonly string[]) => {
  const expectedCodes = typeof codes === "string" ? [codes] : codes;
  const code = getPrismaErrorCode(error);

  return Boolean(code && expectedCodes.includes(code));
};

const isAdapterSerializationConflict = (error: unknown) => {
  if (!error || typeof error !== "object" || !("name" in error) || !("cause" in error)) {
    return false;
  }

  // adapter-pg can expose a serialization failure at commit without wrapping it as P2034.
  const cause = error.cause;
  return Boolean(
    error.name === "DriverAdapterError" &&
      cause &&
      typeof cause === "object" &&
      "kind" in cause &&
      cause.kind === "TransactionWriteConflict" &&
      "originalCode" in cause &&
      cause.originalCode === "40001",
  );
};

export const isSerializableRetryableError = (error: unknown) => {
  if (isPrismaErrorCode(error, ["P2002", "P2034"])) return true;
  // Retry only an explicit serialization SQLSTATE, never arbitrary raw-query messages.
  if (isPrismaErrorCode(error, "P2010") && error && typeof error === "object" && "meta" in error) {
    const meta = error.meta;
    if (meta && typeof meta === "object") {
      if ("code" in meta && meta.code === "40001") return true;
      if ("driverAdapterError" in meta && isAdapterSerializationConflict(meta.driverAdapterError))
        return true;
    }
  }
  return isAdapterSerializationConflict(error);
};
