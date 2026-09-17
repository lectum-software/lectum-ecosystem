const CONFIRMATION_PATTERN = /^--confirm=(homolog|production)$/;

export type ObservabilityCheckEnvironment = "homolog" | "production";

export const parseObservabilityCheckEnvironment = (
  argumentsList: readonly string[],
): ObservabilityCheckEnvironment | undefined => {
  if (argumentsList.length !== 1) return undefined;

  return argumentsList[0]?.match(CONFIRMATION_PATTERN)?.[1] as
    | ObservabilityCheckEnvironment
    | undefined;
};
