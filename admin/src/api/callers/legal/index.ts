"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { adminLegalKeys } from "@/api/cache/keys";
import {
  createAdminLegalDraft,
  duplicateAdminLegalDocument,
  getAdminLegalAcceptances,
  getAdminLegalDocument,
  getAdminLegalDocuments,
  publishAdminLegalDocument,
  updateAdminLegalDraft,
} from "@/api/req/legal";
import type {
  AdminLegalDocument,
  AdminLegalPublishInput,
  AdminLegalUpdateInput,
} from "@/api/req/legal/types";

export const useAdminLegalDocuments = (page: number) =>
  useQuery({
    queryKey: adminLegalKeys.list(page),
    queryFn: ({ signal }) => getAdminLegalDocuments(page, signal),
  });

export const useAdminLegalDocument = (id: string) =>
  useQuery({
    queryKey: adminLegalKeys.detail(id),
    queryFn: ({ signal }) => getAdminLegalDocument(id, signal),
  });

export const useAdminLegalAcceptances = (id: string, page: number) =>
  useQuery({
    queryKey: adminLegalKeys.acceptances(id, page),
    queryFn: ({ signal }) => getAdminLegalAcceptances(id, page, signal),
    gcTime: 0,
  });

const useLegalDocumentSaved = () => {
  const queryClient = useQueryClient();
  return (document: AdminLegalDocument) => {
    queryClient.setQueryData(adminLegalKeys.detail(document.id), document);
    return queryClient.invalidateQueries({ queryKey: adminLegalKeys.all });
  };
};

export const useAdminLegalCreate = () =>
  useMutation({
    mutationFn: createAdminLegalDraft,
    onSuccess: useLegalDocumentSaved(),
    retry: false,
  });

export const useAdminLegalUpdate = () =>
  useMutation({
    mutationFn: ({ id, input }: { id: string; input: AdminLegalUpdateInput }) =>
      updateAdminLegalDraft(id, input),
    onSuccess: useLegalDocumentSaved(),
    retry: false,
  });

export const useAdminLegalDuplicate = () =>
  useMutation({
    mutationFn: duplicateAdminLegalDocument,
    onSuccess: useLegalDocumentSaved(),
    retry: false,
  });

export const useAdminLegalPublish = () =>
  useMutation({
    mutationFn: ({ id, input }: { id: string; input: AdminLegalPublishInput }) =>
      publishAdminLegalDocument(id, input),
    onSuccess: useLegalDocumentSaved(),
    retry: false,
  });
