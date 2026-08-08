export const reportClientFailure = (scope: string, error: unknown) => {
  if (process.env.NODE_ENV === "production") return;

  console.error(`[CLIENT] ${scope}`, {
    name: error instanceof Error ? error.name : "UnknownClientError",
  });
};
