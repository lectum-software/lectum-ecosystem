export type InitialProductionBootstrapEnvironment = {
  BASE?: string;
  NODE_ENV?: string;
};

const PRODUCTION_API_ORIGIN = "https://api.lectum.com.br";

export const assertInitialProductionBootstrapTarget = (
  environment: InitialProductionBootstrapEnvironment = process.env,
) => {
  if (environment.NODE_ENV?.trim().toLowerCase() !== "production") {
    throw new Error("Bootstrap inicial bloqueado fora de produção.");
  }

  let origin: string;
  try {
    origin = new URL(environment.BASE ?? "").origin;
  } catch {
    throw new Error("Bootstrap inicial bloqueado para destino não confirmado.");
  }

  if (origin !== PRODUCTION_API_ORIGIN) {
    throw new Error("Bootstrap inicial bloqueado para destino não confirmado.");
  }
};

export const assertInitialProductionBootstrapFlags = ({
  confirm,
  passwordSource,
}: {
  confirm?: string;
  passwordSource: "argument" | "environment" | "stdin";
}) => {
  if (confirm !== "production") {
    throw new Error("Confirmação explícita de produção obrigatória.");
  }

  if (passwordSource !== "stdin") {
    throw new Error("Bootstrap inicial exige senha por stdin.");
  }
};
