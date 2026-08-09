import {
  assertDisposableLocalDatabaseTarget,
  type LocalDatabaseEnvironment,
} from "@/utils/local-database-safety";

type SeedEnvironment = LocalDatabaseEnvironment & {
  LECTUM_CONFIRM_DB_RESET?: string;
};

export const assertSafeSeedTarget = (environment: SeedEnvironment = process.env) => {
  assertDisposableLocalDatabaseTarget(environment, "Seed");

  if (environment.LECTUM_CONFIRM_DB_RESET !== "1") {
    throw new Error("Seed bloqueado sem confirmação explícita para banco local.");
  }
};
