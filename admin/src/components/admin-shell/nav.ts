import {
  Bell,
  ChartNoAxesCombined,
  CircleDollarSign,
  Gauge,
  LayoutGrid,
  MessageCircleMore,
  Settings,
  ShieldAlert,
  UsersRound,
} from "lucide-react";

export const adminNavItems = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutGrid },
  { label: "Tráfego", href: "/trafego", icon: ChartNoAxesCombined },
  {
    label: "Comunidades",
    href: "/comunidades",
    icon: MessageCircleMore,
    children: [
      { label: "Visão geral", href: "/comunidades" },
      { label: "Lista de Comunidades", href: "/comunidades/lista" },
    ],
  },
  { label: "Moderação", href: "/moderacao", icon: ShieldAlert, badge: "moderation" },
  {
    label: "Psicólogos",
    href: "/psicologos",
    icon: UsersRound,
    children: [
      { label: "Visão geral", href: "/psicologos" },
      { label: "Lista de Psicólogos", href: "/psicologos/lista" },
    ],
  },
  { label: "Pacientes", href: "/pacientes", icon: Gauge },
  { label: "Financeiro", href: "/financeiro", icon: CircleDollarSign },
  { label: "Notificações", href: "/notificacoes", icon: Bell },
  { label: "Configurações", href: "/configuracoes", icon: Settings },
] as const;
