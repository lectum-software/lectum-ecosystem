"use client";

import { Activity, Flag, UserRoundCheck, Users, WalletCards } from "lucide-react";
import type { AdminDashboardSummary } from "@/api/req/dashboard";
import { LineChart } from "../components/chart-period";

import { EmptyState, MetricCard } from "../components/common";
import { WhatsAppDistributionCard } from "../components/distribution";
import {
  ChartCard,
  ChartLegend,
  DashboardOverviewPanel,
  PendingReportsCard,
} from "../components/reports-overview";
import { hasPeriodRecords } from "../modules/dashboard-support";

export const DashboardContent = ({
  periodControls,
  periodDescription,
  summary,
}: {
  periodControls: React.ReactNode;
  periodDescription: string;
  summary: AdminDashboardSummary;
}) => {
  const noRecords = !hasPeriodRecords(summary);
  const communitySeries = [
    {
      color: "var(--admin-primary)",
      label: "Posts de pacientes",
      points: summary.community_activity.patient_posts,
    },
    {
      color: "var(--admin-success)",
      label: "Posts de psicólogos",
      points: summary.community_activity.psychologist_posts,
    },
    {
      color: "var(--admin-warning)",
      label: "Comentários de pacientes",
      points: summary.community_activity.patient_comments,
    },
    {
      color: "var(--admin-danger)",
      label: "Respostas de psicólogos",
      points: summary.community_activity.psychologist_replies,
    },
  ];

  return (
    <div className="space-y-6">
      {noRecords ? <EmptyState period={summary.period} /> : null}

      <DashboardOverviewPanel periodControls={periodControls} periodDescription={periodDescription}>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <MetricCard icon={Activity} metric={summary.cards.sessions} tone="blue" />
          <MetricCard icon={WalletCards} metric={summary.cards.revenue} tone="pink" />
          <MetricCard icon={Users} metric={summary.cards.patients} tone="green" />
          <MetricCard icon={UserRoundCheck} metric={summary.cards.psychologists} tone="purple" />
          <MetricCard icon={Flag} metric={summary.cards.pending_reports} tone="orange" />
        </div>
      </DashboardOverviewPanel>

      <WhatsAppDistributionCard
        distribution={summary.whatsapp_click_distribution}
        periodDescription={periodDescription}
      />

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(20rem,28rem)]">
        <div className="space-y-5">
          <ChartCard
            description={periodDescription}
            icon={Activity}
            title="Atividade nas comunidades"
          >
            <ChartLegend items={communitySeries} />
            <LineChart series={communitySeries} />
          </ChartCard>
        </div>

        <PendingReportsCard
          reports={summary.pending_reports.items}
          total={summary.pending_reports.total}
        />
      </div>
    </div>
  );
};
