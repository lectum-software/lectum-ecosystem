"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import keys from "@/api/cache/keys";
import type { patient_profile } from "@/api/generator/types";
import type { DirectoryPsychologistsResponse } from "@/api/generator/types/directory";
import * as api from "@/api/req/patient";

export interface UsePatientProps {
  enableProfile?: boolean;
  callbacks?: {
    profile?: {
      onSuccess?: (data: patient_profile) => void;
      onError?: (error: unknown) => void;
    };
    completeOnboarding?: {
      onSuccess?: (data: patient_profile) => void;
      onError?: (error: unknown) => void;
    };
    favoritePsychologist?: {
      onSuccess?: (data: api.FavoritePsychologistResponse) => void;
      onError?: (error: unknown) => void;
    };
    unfavoritePsychologist?: {
      onSuccess?: (data: api.FavoritePsychologistResponse) => void;
      onError?: (error: unknown) => void;
    };
  };
}

const updateDirectoryFavorite = (
  queryClient: ReturnType<typeof useQueryClient>,
  psychologistId: string,
  favorited: boolean,
) => {
  queryClient.setQueriesData<DirectoryPsychologistsResponse>(
    { queryKey: keys.directory.psychologistsRoot() },
    (old) => {
      if (!old) return old;

      return {
        ...old,
        data: old.data.map((psychologist) =>
          psychologist.id === psychologistId ? { ...psychologist, favorited } : psychologist,
        ),
      };
    },
  );
};

export const usePatient = ({ callbacks, enableProfile = true }: UsePatientProps = {}) => {
  const queryClient = useQueryClient();
  const profileKey = keys.patient.profile();

  const profile = useQuery({
    queryKey: profileKey,
    queryFn: () => api.getPatientProfile(),
    enabled: enableProfile,
    refetchOnWindowFocus: false,
    retry: false,
  });

  const completeOnboarding = useMutation({
    mutationFn: (body: api.CompletePatientOnboardingPayload) => api.completePatientOnboarding(body),
    onSuccess: (data) => {
      queryClient.setQueryData(profileKey, data);
      queryClient.invalidateQueries({ queryKey: profileKey });
      callbacks?.completeOnboarding?.onSuccess?.(data);
    },
    onError: callbacks?.completeOnboarding?.onError,
  });

  const favoritePsychologist = useMutation({
    mutationFn: (id: string) => api.favoritePsychologist(id),
    onSuccess: (data) => {
      updateDirectoryFavorite(queryClient, data.psychologist_id, true);
      queryClient.invalidateQueries({ queryKey: keys.directory.psychologistsRoot() });
      callbacks?.favoritePsychologist?.onSuccess?.(data);
    },
    onError: callbacks?.favoritePsychologist?.onError,
  });

  const unfavoritePsychologist = useMutation({
    mutationFn: (id: string) => api.unfavoritePsychologist(id),
    onSuccess: (data) => {
      updateDirectoryFavorite(queryClient, data.psychologist_id, false);
      queryClient.invalidateQueries({ queryKey: keys.directory.psychologistsRoot() });
      callbacks?.unfavoritePsychologist?.onSuccess?.(data);
    },
    onError: callbacks?.unfavoritePsychologist?.onError,
  });

  return {
    profile,
    completeOnboarding,
    favoritePsychologist,
    unfavoritePsychologist,
  };
};
