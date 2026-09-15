"use client";
import type { AdminPatientDetail } from "@/api/req/patients";
import { ActivitiesTab } from "../components/activities";

import { Header } from "../components/common";

import { GeneralTab, ProfileRegistrationTab } from "../components/profile-summary";
import { ReportsTab } from "../components/reports";
import type { PatientDetailTab } from "../modules/detail-config";
import { AccountTab } from "./account-tab";
import { PublicationsTab } from "./publications-tab";
import { StatisticsTab } from "./statistics-tab";

export const DetailContent = ({
  detail,
  id,
  tab,
}: {
  detail: AdminPatientDetail;
  id: string;
  tab: PatientDetailTab;
}) => (
  <div className="space-y-6">
    <Header detail={detail} id={id} tab={tab} />
    {tab === "perfil" ? (
      <ProfileRegistrationTab detail={detail} />
    ) : tab === "estatisticas" ? (
      <StatisticsTab detail={detail} id={id} />
    ) : tab === "publicacoes" ? (
      <PublicationsTab detail={detail} />
    ) : tab === "denuncias" ? (
      <ReportsTab id={id} />
    ) : tab === "atividades" ? (
      <ActivitiesTab id={id} />
    ) : tab === "conta" ? (
      <AccountTab id={id} />
    ) : (
      <GeneralTab detail={detail} id={id} />
    )}
  </div>
);
