import { z } from "zod";

export const legalDocumentIdSchema = z.string().regex(/^[a-zA-Z0-9_-]{1,200}$/);

export const fullPublishedDocSchema = z.object({
  id: legalDocumentIdSchema,
  kind: z.enum(["terms", "privacy"]),
  version: z.number().int().positive(),
  title: z.string().refine((value) => value.trim().length > 0),
  body: z.string().refine((value) => value.trim().length > 0),
  change_summary: z.string(),
  content_hash: z.string().min(1),
  published_at: z.iso.datetime({ offset: true }),
});

export const currentLegalSchema = z.object({
  configured: z.boolean(),
  documents: z.array(fullPublishedDocSchema),
});

export const legalStatusSchema = currentLegalSchema.extend({
  pending_document_ids: z.array(legalDocumentIdSchema),
  acceptances: z.array(
    z.object({ document_id: legalDocumentIdSchema, accepted_at: z.iso.datetime({ offset: true }) }),
  ),
});

export type FullPublishedDoc = z.infer<typeof fullPublishedDocSchema>;
export type LegalKind = FullPublishedDoc["kind"];
export type CurrentLegal = z.infer<typeof currentLegalSchema>;
export type LegalStatus = z.infer<typeof legalStatusSchema>;
export type AcceptLegalPayload = {
  document_ids: string[];
  terms_accepted: true;
  privacy_acknowledged: true;
  adult_confirmed: true;
};
