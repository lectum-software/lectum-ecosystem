import {
  Bell,
  ChartNoAxesCombined,
  CircleDollarSign,
  Gauge,
  LayoutGrid,
  MessageCircleMore,
  Settings,
  UsersRound,
} from "lucide-react";

export const adminNavItems = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutGrid },
  { label: "Tráfego", href: "/trafego", icon: ChartNoAxesCombined },
  { label: "Comunidades", href: "/comunidades", icon: MessageCircleMore },
  { label: "Psicólogos", href: "/psicologos", icon: UsersRound },
  { label: "Pacientes", href: "/pacientes", icon: Gauge },
  { label: "Financeiro", href: "/financeiro", icon: CircleDollarSign },
  { label: "Notificações", href: "/notificacoes", icon: Bell },
  { label: "Configurações", href: "/configuracoes", icon: Settings },
] as const;
