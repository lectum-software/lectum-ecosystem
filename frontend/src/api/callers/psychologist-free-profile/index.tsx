"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import keys from "@/api/cache/keys";
import type {
  FreeProfessionalProfile,
  FreeProfessionalProfileAvatarRemoval,
  FreeProfessionalProfileAvatarUpload,
  FreeProfessionalProfileCoverImageRemoval,
  FreeProfessionalProfileCoverImageUpload,
  FreeProfessionalProfilePayload,
  FreeProfessionalProfileVideoCoverUpload,
  FreeProfessionalProfileVideoRemoval,
  FreeProfessionalProfileVideoUpload,
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
    coverImage?: {
      onSuccess?: (data: FreeProfessionalProfileCoverImageUpload) => void;
      onError?: (error: unknown) => void;
    };
    deleteCoverImage?: {
      onSuccess?: (data: FreeProfessionalProfileCoverImageRemoval) => void;
      onError?: (error: unknown) => void;
    };
    video?: {
      onSuccess?: (data: FreeProfessionalProfileVideoUpload) => void;
      onError?: (error: unknown) => void;
    };
    videoCover?: {
      onSuccess?: (data: FreeProfessionalProfileVideoCoverUpload) => void;
      onError?: (error: unknown) => void;
    };
    deleteVideo?: {
      onSuccess?: (data: FreeProfessionalProfileVideoRemoval) => void;
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
      queryClient.invalidateQueries({ queryKey: keys.directory.psychologistsRoot() });
      queryClient.invalidateQueries({ queryKey: keys.directory.psychologistRoot(data.user.id) });
      callbacks?.update?.onSuccess?.(data);
    },
    onError: callbacks?.update?.onError,
  });

  const uploadAvatar = useMutation({
    mutationFn: (file: File) => api.uploadPsychologistFreeProfileAvatar(file),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: keys.psychologistFreeProfile.root() });
      queryClient.invalidateQueries({ predicate: (query) => query.queryKey[0] === "auth_hydrate" });
      queryClient.invalidateQueries({ queryKey: keys.directory.psychologistsRoot() });
      if (data.profile?.user.id) {
        queryClient.invalidateQueries({
          queryKey: keys.directory.psychologistRoot(data.profile.user.id),
        });
      }
      callbacks?.avatar?.onSuccess?.(data);
    },
    onError: callbacks?.avatar?.onError,
  });

  const deleteAvatar = useMutation({
    mutationFn: () => api.deletePsychologistFreeProfileAvatar(),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: keys.psychologistFreeProfile.root() });
      queryClient.invalidateQueries({ predicate: (query) => query.queryKey[0] === "auth_hydrate" });
      queryClient.invalidateQueries({ queryKey: keys.directory.psychologistsRoot() });
      if (data.profile?.user.id) {
        queryClient.invalidateQueries({
          queryKey: keys.directory.psychologistRoot(data.profile.user.id),
        });
      }
      callbacks?.deleteAvatar?.onSuccess?.(data);
    },
    onError: callbacks?.deleteAvatar?.onError,
  });

  const uploadCoverImage = useMutation({
    mutationFn: (file: File) => api.uploadPsychologistFreeProfileCoverImage(file),
    onSuccess: (data) => {
      if (data.profile) {
        queryClient.setQueryData(keys.psychologistFreeProfile.root(), data.profile);
      }
      queryClient.invalidateQueries({ queryKey: keys.psychologistFreeProfile.root() });
      queryClient.invalidateQueries({ queryKey: keys.directory.psychologistsRoot() });
      if (data.profile?.user.id) {
        queryClient.invalidateQueries({
          queryKey: keys.directory.psychologistRoot(data.profile.user.id),
        });
      }
      callbacks?.coverImage?.onSuccess?.(data);
    },
    onError: callbacks?.coverImage?.onError,
  });

  const deleteCoverImage = useMutation({
    mutationFn: () => api.deletePsychologistFreeProfileCoverImage(),
    onSuccess: (data) => {
      if (data.profile) {
        queryClient.setQueryData(keys.psychologistFreeProfile.root(), data.profile);
      }
      queryClient.invalidateQueries({ queryKey: keys.psychologistFreeProfile.root() });
      queryClient.invalidateQueries({ queryKey: keys.directory.psychologistsRoot() });
      if (data.profile?.user.id) {
        queryClient.invalidateQueries({
          queryKey: keys.directory.psychologistRoot(data.profile.user.id),
        });
      }
      callbacks?.deleteCoverImage?.onSuccess?.(data);
    },
    onError: callbacks?.deleteCoverImage?.onError,
  });

  const uploadVideo = useMutation({
    mutationFn: (file: File) => api.uploadPsychologistFreeProfileVideo(file),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: keys.psychologistFreeProfile.root() });
      queryClient.invalidateQueries({ predicate: (query) => query.queryKey[0] === "auth_hydrate" });
      queryClient.invalidateQueries({ queryKey: keys.directory.psychologistsRoot() });
      if (data.profile?.user.id) {
        queryClient.invalidateQueries({
          queryKey: keys.directory.psychologistRoot(data.profile.user.id),
        });
      }
      callbacks?.video?.onSuccess?.(data);
    },
    onError: callbacks?.video?.onError,
  });

  const uploadVideoCover = useMutation({
    mutationFn: (file: File) => api.uploadPsychologistFreeProfileVideoCover(file),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: keys.psychologistFreeProfile.root() });
      queryClient.invalidateQueries({ predicate: (query) => query.queryKey[0] === "auth_hydrate" });
      queryClient.invalidateQueries({ queryKey: keys.directory.psychologistsRoot() });
      if (data.profile?.user.id) {
        queryClient.invalidateQueries({
          queryKey: keys.directory.psychologistRoot(data.profile.user.id),
        });
      }
      callbacks?.videoCover?.onSuccess?.(data);
    },
    onError: callbacks?.videoCover?.onError,
  });

  const deleteVideo = useMutation({
    mutationFn: () => api.deletePsychologistFreeProfileVideo(),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: keys.psychologistFreeProfile.root() });
      queryClient.invalidateQueries({ predicate: (query) => query.queryKey[0] === "auth_hydrate" });
      queryClient.invalidateQueries({ queryKey: keys.directory.psychologistsRoot() });
      if (data.profile?.user.id) {
        queryClient.invalidateQueries({
          queryKey: keys.directory.psychologistRoot(data.profile.user.id),
        });
      }
      callbacks?.deleteVideo?.onSuccess?.(data);
    },
    onError: callbacks?.deleteVideo?.onError,
  });

  return {
    profile,
    update,
    uploadAvatar,
    deleteAvatar,
    uploadCoverImage,
    deleteCoverImage,
    uploadVideo,
    uploadVideoCover,
    deleteVideo,
  };
};
