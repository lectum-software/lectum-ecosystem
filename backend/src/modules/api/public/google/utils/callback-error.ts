export const GOOGLE_AUTH_FALLBACK_MESSAGE =
  "Não foi possível concluir a autenticação com o Google.";

export const GOOGLE_ACCOUNT_NOT_REGISTERED_MESSAGE =
  "Não localizamos cadastro para este e-mail. Crie uma conta ou use outra conta do Google.";

type GoogleCallbackFailureLike = {
  code?: string | null;
  success?: boolean;
};

const googleAccountNotRegisteredCodes = new Set(["account_not_registered"]);

export const resolveGoogleCallbackFailureMessage = (user?: GoogleCallbackFailureLike | null) => {
  if (googleAccountNotRegisteredCodes.has(String(user?.code ?? ""))) {
    return GOOGLE_ACCOUNT_NOT_REGISTERED_MESSAGE;
  }

  return GOOGLE_AUTH_FALLBACK_MESSAGE;
};
