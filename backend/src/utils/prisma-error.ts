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
