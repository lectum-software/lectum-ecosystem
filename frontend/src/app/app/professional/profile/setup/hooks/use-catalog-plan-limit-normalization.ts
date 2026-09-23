"use client";

import { useEffect } from "react";
import type { UseFormSetValue } from "react-hook-form";
import type { FreeProfessionalProfile } from "@/api/generator/types/free-profile";
import { normalizeCatalogSelectionForPlanLimit } from "../modules/profile-setup-support";
import type { FreeProfileForm } from "../use-form";

type CatalogPlanLimitNormalizationParams = {
  profile?: FreeProfessionalProfile | null;
  selectedApproaches: string[];
  selectedServices: string[];
  selectedSpecialties: string[];
  setValue: UseFormSetValue<FreeProfileForm>;
};

export const useCatalogPlanLimitNormalization = ({
  profile,
  selectedApproaches,
  selectedServices,
  selectedSpecialties,
  setValue,
}: CatalogPlanLimitNormalizationParams) => {
  const serverApproaches = profile?.selected.approaches;
  const serverServices = profile?.selected.services;
  const serverSpecialties = profile?.selected.specialties;

  useEffect(() => {
    const applyPlanLimit = (
      name: "specialty_ids" | "service_ids" | "approach_ids",
      current: string[],
      limit: number | undefined,
      server: string[] | undefined,
    ) => {
      const normalized = normalizeCatalogSelectionForPlanLimit({ current, limit, server });
      if (normalized === current) return;
      setValue(name, normalized, { shouldDirty: false, shouldValidate: true });
    };

    applyPlanLimit(
      "specialty_ids",
      selectedSpecialties,
      profile?.plan.specialty_limit,
      serverSpecialties?.map((item) => item.id),
    );
    applyPlanLimit(
      "service_ids",
      selectedServices,
      profile?.plan.service_limit,
      serverServices?.map((item) => item.id),
    );
    applyPlanLimit(
      "approach_ids",
      selectedApproaches,
      profile?.plan.approach_limit,
      serverApproaches?.map((item) => item.id),
    );
  }, [
    profile?.plan.approach_limit,
    profile?.plan.service_limit,
    profile?.plan.specialty_limit,
    selectedApproaches,
    selectedServices,
    selectedSpecialties,
    serverApproaches,
    serverServices,
    serverSpecialties,
    setValue,
  ]);
};
