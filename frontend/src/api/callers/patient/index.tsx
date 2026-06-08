"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import keys from "@/api/cache/keys";
import type {
  PatientPrivateProfile,
  PatientRelationListResponse,
  PatientRelationQuery,
  patient_profile,
} from "@/api/generator/types";
import type {
  DirectoryPsychologistProfile,
  DirectoryPsychologistsResponse,
} from "@/api/generator/types/directory";
import * as api from "@/api/req/patient";

export interface UsePatientProps {
  enableProfile?: boolean;
  enableFavorites?: boolean;
  enableFollows?: boolean;
  favoritesQuery?: PatientRelationQuery;
  followsQuery?: PatientRelationQuery;
  callbacks?: {
    profile?: {
      onSuccess?: (data: patient_profile) => void;
      onError?: (error: unknown) => void;
    };
    completeOnboarding?: {
      onSuccess?: (data: patient_profile) => void;
      onError?: (error: unknown) => void;
    };
    updateProfile?: {
      onSuccess?: (data: PatientPrivateProfile) => void;
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
    followPsychologist?: {
      onSuccess?: (data: api.FollowPsychologistResponse) => void;
      onError?: (error: unknown) => void;
    };
    unfollowPsychologist?: {
      onSuccess?: (data: api.FollowPsychologistResponse) => void;
      onError?: (error: unknown) => void;
    };
  };
}

type RelationPatch = Partial<
  Pick<DirectoryPsychologistsResponse["data"][number], "favorited" | "followed">
>;
type QuerySnapshot = ReturnType<ReturnType<typeof useQueryClient>["getQueriesData"]>;

type MutationSnapshot = {
  directory: QuerySnapshot;
  directoryProfiles: QuerySnapshot;
  favorites: QuerySnapshot;
  follows: QuerySnapshot;
};

const updateDirectoryRelation = (
  queryClient: ReturnType<typeof useQueryClient>,
  psychologistId: string,
  patch: RelationPatch,
) => {
  queryClient.setQueriesData<DirectoryPsychologistsResponse>(
    { queryKey: keys.directory.psychologistsRoot() },
    (old) => {
      if (!old) return old;

      return {
        ...old,
        data: old.data.map((psychologist) =>
          psychologist.id === psychologistId ? { ...psychologist, ...patch } : psychologist,
        ),
      };
    },
  );
};

const updateRelationLists = (
  queryClient: ReturnType<typeof useQueryClient>,
  psychologistId: string,
  patch: RelationPatch,
) => {
  for (const queryKey of [keys.patient.favoritesRoot(), keys.patient.followsRoot()]) {
    queryClient.setQueriesData<PatientRelationListResponse>({ queryKey }, (old) => {
      if (!old) return old;

      return {
        ...old,
        data: old.data.map((psychologist) =>
          psychologist.id === psychologistId ? { ...psychologist, ...patch } : psychologist,
        ),
      };
    });
  }
};

const updateDirectoryProfileRelation = (
  queryClient: ReturnType<typeof useQueryClient>,
  psychologistId: string,
  patch: RelationPatch,
) => {
  queryClient.setQueryData<DirectoryPsychologistProfile>(
    keys.directory.psychologist(psychologistId),
    (old) => (old ? { ...old, ...patch } : old),
  );
};

const removeFromRelationList = (
  queryClient: ReturnType<typeof useQueryClient>,
  queryKey: string[],
  psychologistId: string,
) => {
  queryClient.setQueriesData<PatientRelationListResponse>({ queryKey }, (old) => {
    if (!old) return old;

    const data = old.data.filter((psychologist) => psychologist.id !== psychologistId);
    const removed = data.length !== old.data.length;
    const count = removed ? Math.max(0, old.count - 1) : old.count;

    return {
      ...old,
      data,
      count,
      pages: count === 0 ? 0 : old.pages,
    };
  });
};

const getSnapshot = (queryClient: ReturnType<typeof useQueryClient>): MutationSnapshot => ({
  directory: queryClient.getQueriesData({ queryKey: keys.directory.psychologistsRoot() }),
  directoryProfiles: queryClient.getQueriesData({
    predicate: (query) => query.queryKey[0] === "directory_psychologist",
  }),
  favorites: queryClient.getQueriesData({ queryKey: keys.patient.favoritesRoot() }),
  follows: queryClient.getQueriesData({ queryKey: keys.patient.followsRoot() }),
});

const restoreSnapshot = (
  queryClient: ReturnType<typeof useQueryClient>,
  snapshot?: MutationSnapshot,
) => {
  if (!snapshot) return;

  for (const [queryKey, data] of [
    ...snapshot.directory,
    ...snapshot.directoryProfiles,
    ...snapshot.favorites,
    ...snapshot.follows,
  ]) {
    queryClient.setQueryData(queryKey, data);
  }
};

const invalidateRelationQueries = (queryClient: ReturnType<typeof useQueryClient>) => {
  queryClient.invalidateQueries({ queryKey: keys.directory.psychologistsRoot() });
  queryClient.invalidateQueries({
    predicate: (query) => query.queryKey[0] === "directory_psychologist",
  });
  queryClient.invalidateQueries({ queryKey: keys.patient.favoritesRoot() });
  queryClient.invalidateQueries({ queryKey: keys.patient.followsRoot() });
};

export const usePatient = ({
  callbacks,
  enableFavorites = false,
  enableFollows = false,
  enableProfile = true,
  favoritesQuery = {},
  followsQuery = {},
}: UsePatientProps = {}) => {
  const queryClient = useQueryClient();
  const profileKey = keys.patient.profile();
  const favoritesKey = keys.patient.favorites(favoritesQuery);
  const followsKey = keys.patient.follows(followsQuery);

  const profile = useQuery({
    queryKey: profileKey,
    queryFn: () => api.getPatientProfile(),
    enabled: enableProfile,
    refetchOnWindowFocus: false,
    retry: false,
  });

  const favorites = useQuery({
    queryKey: favoritesKey,
    queryFn: () => api.getFavoritePsychologists(favoritesQuery),
    enabled: enableFavorites,
    refetchOnWindowFocus: false,
    retry: false,
  });

  const follows = useQuery({
    queryKey: followsKey,
    queryFn: () => api.getFollowedPsychologists(followsQuery),
    enabled: enableFollows,
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

  const updateProfile = useMutation({
    mutationFn: (body: api.UpdatePatientProfilePayload) => api.updatePatientProfile(body),
    onSuccess: (data) => {
      queryClient.setQueryData(profileKey, data.profile);
      queryClient.invalidateQueries({ queryKey: profileKey });
      callbacks?.updateProfile?.onSuccess?.(data);
    },
    onError: callbacks?.updateProfile?.onError,
  });

  const favoritePsychologist = useMutation({
    mutationFn: (id: string) => api.favoritePsychologist(id),
    onMutate: async (id) => {
      await Promise.all([
        queryClient.cancelQueries({ queryKey: keys.directory.psychologistsRoot() }),
        queryClient.cancelQueries({ queryKey: keys.patient.favoritesRoot() }),
        queryClient.cancelQueries({ queryKey: keys.patient.followsRoot() }),
      ]);
      const snapshot = getSnapshot(queryClient);
      updateDirectoryRelation(queryClient, id, { favorited: true });
      updateDirectoryProfileRelation(queryClient, id, { favorited: true });
      updateRelationLists(queryClient, id, { favorited: true });
      return snapshot;
    },
    onSuccess: (data) => {
      callbacks?.favoritePsychologist?.onSuccess?.(data);
    },
    onError: (error, _id, snapshot) => {
      restoreSnapshot(queryClient, snapshot);
      callbacks?.favoritePsychologist?.onError?.(error);
    },
    onSettled: () => invalidateRelationQueries(queryClient),
  });

  const unfavoritePsychologist = useMutation({
    mutationFn: (id: string) => api.unfavoritePsychologist(id),
    onMutate: async (id) => {
      await Promise.all([
        queryClient.cancelQueries({ queryKey: keys.directory.psychologistsRoot() }),
        queryClient.cancelQueries({ queryKey: keys.patient.favoritesRoot() }),
        queryClient.cancelQueries({ queryKey: keys.patient.followsRoot() }),
      ]);
      const snapshot = getSnapshot(queryClient);
      updateDirectoryRelation(queryClient, id, { favorited: false });
      updateDirectoryProfileRelation(queryClient, id, { favorited: false });
      updateRelationLists(queryClient, id, { favorited: false });
      removeFromRelationList(queryClient, keys.patient.favoritesRoot(), id);
      return snapshot;
    },
    onSuccess: (data) => {
      callbacks?.unfavoritePsychologist?.onSuccess?.(data);
    },
    onError: (error, _id, snapshot) => {
      restoreSnapshot(queryClient, snapshot);
      callbacks?.unfavoritePsychologist?.onError?.(error);
    },
    onSettled: () => invalidateRelationQueries(queryClient),
  });

  const followPsychologist = useMutation({
    mutationFn: (id: string) => api.followPsychologist(id),
    onMutate: async (id) => {
      await Promise.all([
        queryClient.cancelQueries({ queryKey: keys.directory.psychologistsRoot() }),
        queryClient.cancelQueries({ queryKey: keys.patient.favoritesRoot() }),
        queryClient.cancelQueries({ queryKey: keys.patient.followsRoot() }),
      ]);
      const snapshot = getSnapshot(queryClient);
      updateDirectoryRelation(queryClient, id, { followed: true });
      updateDirectoryProfileRelation(queryClient, id, { followed: true });
      updateRelationLists(queryClient, id, { followed: true });
      return snapshot;
    },
    onSuccess: (data) => {
      callbacks?.followPsychologist?.onSuccess?.(data);
    },
    onError: (error, _id, snapshot) => {
      restoreSnapshot(queryClient, snapshot);
      callbacks?.followPsychologist?.onError?.(error);
    },
    onSettled: () => invalidateRelationQueries(queryClient),
  });

  const unfollowPsychologist = useMutation({
    mutationFn: (id: string) => api.unfollowPsychologist(id),
    onMutate: async (id) => {
      await Promise.all([
        queryClient.cancelQueries({ queryKey: keys.directory.psychologistsRoot() }),
        queryClient.cancelQueries({ queryKey: keys.patient.favoritesRoot() }),
        queryClient.cancelQueries({ queryKey: keys.patient.followsRoot() }),
      ]);
      const snapshot = getSnapshot(queryClient);
      updateDirectoryRelation(queryClient, id, { followed: false });
      updateDirectoryProfileRelation(queryClient, id, { followed: false });
      updateRelationLists(queryClient, id, { followed: false });
      removeFromRelationList(queryClient, keys.patient.followsRoot(), id);
      return snapshot;
    },
    onSuccess: (data) => {
      callbacks?.unfollowPsychologist?.onSuccess?.(data);
    },
    onError: (error, _id, snapshot) => {
      restoreSnapshot(queryClient, snapshot);
      callbacks?.unfollowPsychologist?.onError?.(error);
    },
    onSettled: () => invalidateRelationQueries(queryClient),
  });

  return {
    profile,
    favorites,
    follows,
    completeOnboarding,
    updateProfile,
    favoritePsychologist,
    unfavoritePsychologist,
    followPsychologist,
    unfollowPsychologist,
  };
};
