import { z } from "zod";
import { callEndpoint } from "@/api/generator";
import { handleReq } from "@/api/handle";
import type { AttributionTransport, Campaigns } from "@/components/privacy/campaign-attribution";

async function request(route: string, body: object) {
  return handleReq<unknown>({ ...callEndpoint({ route, method: "POST", body }), hideError: true });
}
export const attributionTransport: AttributionTransport = {
  capture: async (body) =>
    z
      .object({ enabled: z.boolean(), expires_at: z.string().nullable().optional() })
      .parse(await request("/api/public/marketing/attribution/capture", body)),
  revoke: (token) => request("/api/public/marketing/attribution/revoke", { token }),
};
export const touchAccountAttribution = (expected_revision: number, campaigns: Campaigns) =>
  request("/api/private/marketing/consent/touch", { expected_revision, campaigns });
