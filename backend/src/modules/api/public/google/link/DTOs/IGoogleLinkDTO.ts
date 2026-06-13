import type { user } from "@/interfaces/objects";

export type GoogleLinkIntentResponse = {
  url: string;
};

export interface IGoogleLinkDTO {
  auth: user;
  device?: string;
  headers?: Record<string, unknown>;
}
