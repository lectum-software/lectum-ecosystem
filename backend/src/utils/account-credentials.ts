// Links de recuperação pertencem ao conjunto de credenciais que os originou.
// Uma troca de senha/e-mail não pode manter um link capaz de desfazer a troca.
export const withInvalidatedRecovery = <T extends { email?: unknown; password?: unknown }>(
  data: T,
) => {
  if (data.email === undefined && data.password === undefined) return data;
  return { ...data, recovery_code: null, recovery_date: null };
};
