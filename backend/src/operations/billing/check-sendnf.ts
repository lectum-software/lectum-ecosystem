import { invoiceErrorCode } from "@/modules/billing/invoices/config";
import { SendNfAdapter } from "@/modules/billing/invoices/SendNfAdapter";

async function diagnostic<T>(operation: () => Promise<T>) {
  try {
    return { available: true, result: await operation() };
  } catch (error) {
    process.exitCode = 1;
    return { available: false, error: invoiceErrorCode(error) };
  }
}

async function main() {
  const mode = process.env.SENDNF_CHECK_MODE ?? "test";
  if (mode !== "test" && mode !== "live") throw new Error("Invalid mode");
  const adapter = new SendNfAdapter(
    process.env.SENDNF_API_KEY ?? "",
    process.env.SENDNF_COMPANY_ID ?? "",
    mode,
  );
  const identity = await adapter.verifyIdentity();
  const readiness = await adapter.readiness();
  const production = await diagnostic(() => adapter.productionStatus());
  const fiscal = await diagnostic(() => adapter.fiscalSettings());
  const allowed = new Set(["certificate", "certificate_valid", "service_trib_code", "nbs"]);
  console.log(
    JSON.stringify({
      ...identity,
      nfseReady: readiness.ready,
      governmentTestTransmission: readiness.governmentTestTransmission,
      production,
      ...(fiscal.result
        ? {
            serviceCode: fiscal.result.serviceCode,
            issRateHundredths: fiscal.result.issRate,
            emailEnabled: fiscal.result.emailEnabled,
            fiscalSettingsMatch:
              fiscal.result.serviceCode === process.env.SENDNF_SERVICE_CODE &&
              /^\d{1,3}$/.test(process.env.SENDNF_ISS_RATE ?? "") &&
              Number(process.env.SENDNF_ISS_RATE) <= 500 &&
              (fiscal.result.issRate === null ||
                fiscal.result.issRate === Number(process.env.SENDNF_ISS_RATE)) &&
              fiscal.result.emailEnabled,
          }
        : { fiscal }),
      missing: readiness.missing.map((key) => (allowed.has(key) ? key : "other_configuration")),
    }),
  );
}

main().catch(() => {
  console.error("Nao foi possivel validar a configuracao SendNF. Nenhuma nota foi emitida.");
  process.exitCode = 1;
});
