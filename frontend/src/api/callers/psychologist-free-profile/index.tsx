"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import keys from "@/api/cache/keys";
import type {
  FreeProfessionalProfile,
  FreeProfessionalProfileAvatarRemoval,
  FreeProfessionalProfileAvatarUpload,
  FreeProfessionalProfilePayload,
} from "@/api/generator/types/free-profile";
import * as api from "@/api/req/psychologist-free-profile";

export interface UsePsychologistFreeProfileProps {
  callbacks?: {
    update?: {
      onSuccess?: (data: FreeProfessionalProfile) => void;
      onError?: (error: unknown) => void;
    };
    avatar?: {
      onSuccess?: (data: FreeProfessionalProfileAvatarUpload) => void;
      onError?: (error: unknown) => void;
    };
    deleteAvatar?: {
      onSuccess?: (data: FreeProfessionalProfileAvatarRemoval) => void;
      onError?: (error: unknown) => void;
    };
  };
}

export const usePsychologistFreeProfile = ({ callbacks }: UsePsychologistFreeProfileProps = {}) => {
  const queryClient = useQueryClient();

  const profile = useQuery({
    queryKey: keys.psychologistFreeProfile.root(),
    queryFn: () => api.getPsychologistFreeProfile(),
    refetchOnWindowFocus: false,
    retry: false,
  });

  const update = useMutation({
    mutationFn: (body: FreeProfessionalProfilePayload) => api.updatePsychologistFreeProfile(body),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: keys.psychologistFreeProfile.root() });
      queryClient.invalidateQueries({ predicate: (query) => query.queryKey[0] === "auth_hydrate" });
      callbacks?.update?.onSuccess?.(data);
    },
    onError: callbacks?.update?.onError,
  });

  const uploadAvatar = useMutation({
    mutationFn: (file: File) => api.uploadPsychologistFreeProfileAvatar(file),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: keys.psychologistFreeProfile.root() });
      queryClient.invalidateQueries({ predicate: (query) => query.queryKey[0] === "auth_hydrate" });
      callbacks?.avatar?.onSuccess?.(data);
    },
    onError: callbacks?.avatar?.onError,
  });

  const deleteAvatar = useMutation({
    mutationFn: () => api.deletePsychologistFreeProfileAvatar(),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: keys.psychologistFreeProfile.root() });
      queryClient.invalidateQueries({ predicate: (query) => query.queryKey[0] === "auth_hydrate" });
      callbacks?.deleteAvatar?.onSuccess?.(data);
    },
    onError: callbacks?.deleteAvatar?.onError,
  });

  return { profile, update, uploadAvatar, deleteAvatar };
};
