import { getApiErrorCode, getApiErrorHttpStatus, getSafeApiErrorMessage } from "@/api/errors";

type BillingMutation = "checkout" | "payment-method";

const BILLING_FAILURE_MESSAGES: Record<BillingMutation, string> = {
  checkout:
    "Não foi possível concluir a assinatura agora. Verifique o status da assinatura e se houve cobrança antes de tentar novamente.",
  "payment-method":
    "Não foi possível concluir a atualização do cartão agora. Verifique o cartão cadastrado, o status da assinatura e se houve cobrança antes de tentar novamente.",
};

// Somente códigos públicos de domínio, nunca diagnósticos, hints ou texto do provedor.
const BILLING_PUBLIC_ERROR_MESSAGES: Record<string, string> = {
  billing_checkout_email_required: "E-mail da conta não encontrado para iniciar a assinatura.",
  billing_checkout_credit_card_only: "Use um cartão de crédito para assinar o Plano Profissional.",
  billing_courtesy_renewal_required:
    "A cortesia profissional ativa precisa ter data de expiração para cadastrar o cartão de cobrança futura.",
  billing_gateway_card_authorization:
    "O banco recusou a cobrança. Autorize a compra com o banco ou use outro cartão.",
  billing_gateway_card_data: "Revise os dados do cartão e tente novamente.",
  billing_gateway_card_declined:
    "Não foi possível aprovar este cartão. Revise os dados ou tente outro cartão.",
  billing_gateway_card_disabled:
    "Este cartão não está habilitado para esta cobrança. Use outro cartão.",
  billing_gateway_card_duplicate:
    "Já existe uma tentativa recente com estes dados. Aguarde alguns minutos ou use outro cartão.",
  billing_gateway_card_expiration: "Confira a validade do cartão e tente novamente.",
  billing_gateway_card_insufficient_amount:
    "O cartão foi recusado por limite ou saldo insuficiente. Tente outro cartão.",
  billing_gateway_card_limit:
    "O cartão ultrapassou o limite permitido para esta cobrança. Use outro cartão.",
  billing_gateway_card_max_attempts:
    "Muitas tentativas foram recusadas para este cartão. Aguarde alguns minutos ou use outro cartão.",
  billing_gateway_card_number: "Confira o número do cartão e tente novamente.",
  billing_gateway_card_security_code: "Confira o código de segurança do cartão e tente novamente.",
  billing_gateway_card_type:
    "Este cartão não pode ser usado para esta assinatura. Use outro cartão de crédito.",
  billing_gateway_payment_pending:
    "Seu pagamento está em análise. Atualize o status em alguns instantes.",
  billing_payment_method_credit_card_only:
    "Use um cartão de crédito para atualizar o método de pagamento.",
  billing_payment_method_subscription_required:
    "É preciso ter uma assinatura profissional ativa com método de pagamento cadastrado para alterar o cartão.",
};

export const getBillingMutationErrorMessage = (error: unknown, operation: BillingMutation) => {
  const fallback = BILLING_FAILURE_MESSAGES[operation];
  const status = getApiErrorHttpStatus(error);
  const code = getApiErrorCode(error);

  // Sem resposta/timeout, não é possível afirmar o resultado financeiro. Os
  // códigos genéricos também não permitem atribuir a falha à rede ou ao cartão.
  if (!status || status === 408 || status >= 500) {
    return fallback;
  }

  if (status === 401 || status === 403 || status === 404 || status === 429) {
    return getSafeApiErrorMessage({ status }, fallback);
  }

  return code && Object.hasOwn(BILLING_PUBLIC_ERROR_MESSAGES, code)
    ? BILLING_PUBLIC_ERROR_MESSAGES[code]
    : fallback;
};
