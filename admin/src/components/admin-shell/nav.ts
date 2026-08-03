import {
  Bell,
  ChartNoAxesCombined,
  CircleDollarSign,
  LayoutGrid,
  MessageCircleMore,
  Settings,
  ShieldAlert,
  UserRound,
  UsersRound,
} from "lucide-react";

export const adminNavItems = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutGrid },
  { label: "Tráfego", href: "/trafego", icon: ChartNoAxesCombined },
  {
    label: "Moderação",
    href: "/moderacao",
    icon: ShieldAlert,
    badge: "moderation",
    children: [
      { label: "Visão geral", href: "/moderacao" },
      { label: "Denúncias", href: "/moderacao/denuncias", badge: "denuncias" },
      { label: "Compliance", href: "/moderacao/compliance", badge: "compliance" },
      { label: "Operacionais", href: "/moderacao/operacionais", badge: "operacionais" },
      {
        label: "Conteúdo sensível",
        href: "/moderacao/conteudo-sensivel",
        badge: "conteudoSensivel",
      },
    ],
  },
  {
    label: "Comunidades",
    href: "/comunidades",
    icon: MessageCircleMore,
    children: [
      { label: "Visão geral", href: "/comunidades" },
      { label: "Lista de Comunidades", href: "/comunidades/lista" },
    ],
  },
  {
    label: "Psicólogos",
    href: "/psicologos",
    icon: UsersRound,
    children: [
      { label: "Visão geral", href: "/psicologos" },
      { label: "Lista de Psicólogos", href: "/psicologos/lista" },
    ],
  },
  {
    label: "Pacientes",
    href: "/pacientes",
    icon: UserRound,
    children: [
      { label: "Visão geral", href: "/pacientes" },
      { label: "Lista de pacientes", href: "/pacientes/lista" },
    ],
  },
  {
    label: "Financeiro",
    href: "/financeiro",
    icon: CircleDollarSign,
    children: [
      { label: "Visão geral", href: "/financeiro" },
      { label: "Cobranças", href: "/financeiro/cobrancas" },
      { label: "Assinaturas", href: "/financeiro/assinaturas" },
    ],
  },
  { label: "Notificações", href: "/notificacoes", icon: Bell },
  {
    label: "Configurações",
    href: "/configuracoes",
    icon: Settings,
    children: [
      { label: "Filtros", href: "/configuracoes" },
      { label: "SEO / Metadados", href: "/configuracoes/seo-metadados" },
      { label: "Assinatura", href: "/configuracoes/assinatura" },
    ],
  },
] as const;
