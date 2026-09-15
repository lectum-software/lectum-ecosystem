// Este estado deve vir da sessão recarregada do banco, nunca de flags do cliente.
type AccountState = { confirmed?: boolean | null; need_reset?: boolean | null };

export const getPendingAccountRequirement = (account: AccountState | null | undefined) => {
  if (account?.need_reset === true) return "password_reset_required";
  if (account?.confirmed !== true) return "email_confirmation_required";
  return null;
};
