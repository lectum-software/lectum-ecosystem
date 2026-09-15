export const reportClientFailure = (_scope: string, _error: unknown) => {
  if (process.env.NODE_ENV === "production") return;

  void _scope;
  void _error;
  console.error("[CLIENT] Operação não concluída.", { failed: true });
};
