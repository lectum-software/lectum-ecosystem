import { z } from "zod";
import { InvoiceError, type InvoiceMode, isInvoiceLiveRuntime } from "./config";
import { documentSchema, type InvoiceRequest, parseProvider, providerId } from "./contracts";
import { governmentTestTransmission } from "./government-test-transmission";

const ORIGIN = "https://api.sendnf.com";
const MAX_JSON_BYTES = 1024 * 1024;
const MAX_PDF_BYTES = 10 * 1024 * 1024;

async function boundedBody(response: Response, max: number) {
  if (Number(response.headers.get("content-length")) > max || !response.body) {
    await response.body?.cancel();
    throw new InvoiceError("provider_response_invalid");
  }
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > max) throw new InvoiceError("provider_response_invalid");
      chunks.push(value);
    }
    return Buffer.concat(chunks);
  } finally {
    await reader.cancel();
  }
}

export class SendNfAdapter {
  constructor(
    private readonly apiKey: string,
    readonly companyId: string,
    readonly mode: InvoiceMode = "test",
  ) {
    if (
      !new RegExp(`^nt_${mode}_[A-Za-z0-9_-]+$`).test(apiKey) ||
      !providerId.safeParse(companyId).success
    ) {
      throw new InvoiceError("configuration_invalid");
    }
  }

  private async request(path: string, body?: InvoiceRequest, idempotencyKey?: string) {
    try {
      const response = await fetch(`${ORIGIN}${path}`, {
        method: body ? "POST" : "GET",
        redirect: "error",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
          ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {}),
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: AbortSignal.timeout(15_000),
      });
      if (!response.ok) {
        await response.body?.cancel();
        throw new InvoiceError(
          `sendnf_http_${response.status}`,
          response.status === 429 || response.status >= 500,
        );
      }
      return response;
    } catch (error) {
      if (error instanceof InvoiceError) throw error;
      throw new InvoiceError("sendnf_unavailable", true);
    }
  }

  private async json(path: string, body?: InvoiceRequest, key?: string): Promise<unknown> {
    try {
      return JSON.parse(
        (await boundedBody(await this.request(path, body, key), MAX_JSON_BYTES)).toString("utf8"),
      );
    } catch (error) {
      if (error instanceof InvoiceError) throw error;
      throw new InvoiceError("provider_contract_invalid");
    }
  }

  async verifyIdentity() {
    const identity = parseProvider(
      z.object({ mode: z.literal(this.mode), company_id: z.literal(this.companyId) }),
      await this.json("/v1/me"),
    );
    return { mode: identity.mode, restricted: true };
  }

  async readiness() {
    const readiness = parseProvider(
      z.object({
        nfse: z.object({ ready: z.boolean(), missing: z.array(z.string()).default([]) }),
        government_test_transmission: z.unknown().optional(),
      }),
      await this.json(`/v1/companies/${this.companyId}/readiness`),
    );
    return {
      ...readiness.nfse,
      governmentTestTransmission: governmentTestTransmission(
        readiness.government_test_transmission,
      ),
    };
  }

  async productionStatus() {
    const status = parseProvider(
      z.object({
        platform_enabled: z.boolean(),
        plan: z.object({ allowed: z.boolean() }),
        companies: z.array(
          z.object({
            id: providerId,
            production: z.union([
              z.boolean(),
              z.object({ ready: z.boolean(), missing: z.array(z.string()) }),
            ]),
            live_enabled_at: z.string().min(1).nullable(),
            state: z.string(),
            nfse_ready: z.boolean(),
          }),
        ),
      }),
      await this.json("/v1/go-live"),
    );
    const companies = status.companies.filter((company) => company.id === this.companyId);
    return {
      live:
        status.platform_enabled &&
        status.plan.allowed &&
        companies.length === 1 &&
        Boolean(companies[0].live_enabled_at) &&
        (typeof companies[0].production === "boolean"
          ? companies[0].production
          : // SendNF can explicitly activate a new company while its test-note checklist stays pending.
            companies[0].production.missing.every((item) => item === "no_test_note") &&
            (companies[0].production.ready ||
              companies[0].production.missing.includes("no_test_note"))) &&
        companies[0].state === "live" &&
        companies[0].nfse_ready,
    };
  }

  async fiscalSettings() {
    const company = parseProvider(
      z.object({
        id: z.literal(this.companyId),
        default_service_code: z.string(),
        default_iss_rate: z.number().int().nullable(),
        send_to_taker: z.boolean(),
      }),
      await this.json(`/v1/companies/${this.companyId}`),
    );
    return {
      serviceCode: company.default_service_code,
      issRate: company.default_iss_rate,
      emailEnabled: company.send_to_taker,
    };
  }

  async preview(request: InvoiceRequest) {
    if (request.company_id !== this.companyId) throw new InvoiceError("company_mismatch");
    const result = parseProvider(
      z.object({
        ok: z.boolean(),
        validated: z.union([z.boolean(), z.literal("schema")]),
        totals: z.object({ total: z.number().int() }),
      }),
      await this.json("/v1/nfse/preview", request),
    );
    if (
      !result.ok ||
      result.validated === false ||
      result.totals.total !== request.items[0].unit_amount
    )
      throw new InvoiceError("fiscal_preview_invalid");
  }

  async create(request: InvoiceRequest, expectedServiceCode?: string) {
    if (request.company_id !== this.companyId) throw new InvoiceError("company_mismatch");
    if (this.mode === "live") {
      if (!isInvoiceLiveRuntime()) throw new InvoiceError("live_runtime_required");
      if (!(await this.productionStatus()).live) throw new InvoiceError("company_not_live", true);
      const settings = await this.fiscalSettings();
      if (
        !expectedServiceCode ||
        settings.serviceCode !== expectedServiceCode ||
        request.iss_rate === undefined ||
        (settings.issRate !== null && settings.issRate !== request.iss_rate) ||
        !settings.emailEnabled
      )
        throw new InvoiceError("fiscal_settings_mismatch", true);
      await this.preview(request);
    }
    const document = parseProvider(
      documentSchema,
      await this.json("/v1/nfse", request, request.reference),
    );
    if (document.mode !== this.mode) throw new InvoiceError("document_mismatch");
    return document;
  }

  async getDocument(id: string) {
    const safeId = parseProvider(providerId, id);
    const document = parseProvider(documentSchema, await this.json(`/v1/documents/${safeId}`));
    if (document.id !== id || document.mode !== this.mode)
      throw new InvoiceError("document_mismatch");
    return document;
  }

  async pdf(id: string) {
    const response = await this.request(`/v1/documents/${parseProvider(providerId, id)}/pdf`);
    if (!response.headers.get("content-type")?.toLowerCase().startsWith("application/pdf")) {
      await response.body?.cancel();
      throw new InvoiceError("provider_response_invalid");
    }
    const pdf = await boundedBody(response, MAX_PDF_BYTES);
    if (pdf.subarray(0, 5).toString() !== "%PDF-")
      throw new InvoiceError("provider_response_invalid");
    return pdf;
  }
}
