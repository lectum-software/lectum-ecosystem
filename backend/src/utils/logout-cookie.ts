import type { Resolve } from "@/helpers/return";

/**
 * O cookie é a única credencial dos clientes atuais. Em falha de revogação ele
 * precisa permanecer disponível para que uma nova tentativa ainda seja útil.
 */
export const shouldClearLogoutCookie = (resolve: Pick<Resolve, "success">) =>
  resolve.success === true;
