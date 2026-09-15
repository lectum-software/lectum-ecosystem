"use client";

import { useFormList } from "@/hooks/form";
import {
  type LegalDraftForm,
  type LegalReviewForm,
  legalDraftSchema,
  legalReviewSchema,
} from "./modules/legal-policy";

export const useLegalDraftForm = (defaultValues: LegalDraftForm) =>
  useFormList<LegalDraftForm>({ defaultValues, fields: [], schema: legalDraftSchema });

export const useLegalReviewForm = () =>
  useFormList<LegalReviewForm>({
    defaultValues: { confirmations: [] },
    fields: [],
    schema: legalReviewSchema,
  });
