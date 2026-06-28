import type { IncomingHttpHeaders } from "node:http";

export interface IWebhookDTO {
  body: unknown;
  headers: IncomingHttpHeaders;
}
