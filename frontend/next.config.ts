import type { NextConfig } from "next";

type RemotePattern = NonNullable<NonNullable<NextConfig["images"]>["remotePatterns"]>[number];

const remotePatterns: RemotePattern[] = [
  {
    protocol: "https",
    hostname: "lh3.googleusercontent.com",
  },
  {
    protocol: "http",
    hostname: "localhost",
  },
  {
    protocol: "http",
    hostname: "127.0.0.1",
  },
];
const allowedDevOrigins = new Set<string>();

const isLocalHostname = (hostname: string) =>
  hostname === "localhost" || hostname === "127.0.0.1" || hostname === "0.0.0.0";

const addAllowedDevOrigin = (value?: string | null) => {
  if (!value) return;

  try {
    const url = new URL(value.includes("://") ? value : `https://${value}`);
    if (url.protocol !== "http:" && url.protocol !== "https:") return;
    if (isLocalHostname(url.hostname)) return;

    allowedDevOrigins.add(url.host);
  } catch {
    // Ignora entradas inválidas: Next deve receber apenas hosts explícitos.
  }
};

const addRemotePattern = (value?: string | null) => {
  if (!value) return;

  try {
    const url = new URL(value.includes("://") ? value : `https://${value}`);
    const protocol = url.protocol.replace(":", "");

    if (protocol !== "http" && protocol !== "https") return;

    const exists = remotePatterns.some(
      (pattern) => pattern.protocol === protocol && pattern.hostname === url.hostname,
    );

    if (!exists) {
      remotePatterns.push({
        protocol,
        hostname: url.hostname,
      });
    }
  } catch {
    // Ignora entradas inválidas: Next deve receber apenas hosts/protocolos explícitos.
  }
};

addRemotePattern(process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001");
addAllowedDevOrigin(process.env.NEXT_PUBLIC_API_URL);
addAllowedDevOrigin(process.env.NEXT_PUBLIC_LOGIN_URL);
process.env.NEXT_PUBLIC_IMAGE_REMOTE_HOSTS?.split(",")
  .map((entry) => entry.trim())
  .filter(Boolean)
  .forEach((entry) => {
    addRemotePattern(entry);
    addAllowedDevOrigin(entry);
  });

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: "/psychologist/cfp",
        destination: "/app/profissional/cfp",
        permanent: false,
      },
      {
        source: "/psychologist/cfp/:path*",
        destination: "/app/profissional/cfp/:path*",
        permanent: false,
      },
      {
        source: "/patient/welcome",
        destination: "/paciente/boas-vindas",
        permanent: true,
      },
      {
        source: "/app/account/need-reset",
        destination: "/app/conta/redefinir-senha",
        permanent: true,
      },
      {
        source: "/app/settings/notifications",
        destination: "/app/configuracoes/notificacoes",
        permanent: true,
      },
      {
        source: "/app/settings/account",
        destination: "/app/configuracoes/conta",
        permanent: true,
      },
      {
        source: "/app/profile/edit",
        destination: "/app/perfil/editar",
        permanent: true,
      },
      {
        source: "/app/profile",
        destination: "/app/perfil",
        permanent: true,
      },
      {
        source: "/app/notifications",
        destination: "/app/notificacoes",
        permanent: true,
      },
      {
        source: "/app/favorites",
        destination: "/app/favoritos",
        permanent: true,
      },
      {
        source: "/app/following",
        destination: "/app/comunidades-seguidas",
        permanent: true,
      },
      {
        source: "/app/posts/mine",
        destination: "/app/publicacoes/minhas",
        permanent: true,
      },
      {
        source: "/app/posts/saved",
        destination: "/app/publicacoes/salvas",
        permanent: true,
      },
      {
        source: "/app/reviews/success",
        destination: "/app/avaliacoes/sucesso",
        permanent: true,
      },
      {
        source: "/app/reviews/new",
        destination: "/app/avaliacoes/nova",
        permanent: true,
      },
      {
        source: "/app/reviews",
        destination: "/app/avaliacoes",
        permanent: true,
      },
      {
        source: "/app/professional/profile/setup",
        destination: "/app/profissional/perfil/configurar",
        permanent: true,
      },
      {
        source: "/app/professional/billing/subscription",
        destination: "/app/profissional/assinatura/gerenciar",
        permanent: true,
      },
      {
        source: "/app/professional/billing/checkout",
        destination: "/app/profissional/assinatura/pagamento",
        permanent: true,
      },
      {
        source: "/app/professional/billing/address",
        destination: "/app/profissional/assinatura/endereco",
        permanent: true,
      },
      {
        source: "/app/professional/billing/card",
        destination: "/app/profissional/assinatura/cartao",
        permanent: true,
      },
      {
        source: "/app/professional/billing/plans",
        destination: "/app/profissional/assinatura/planos",
        permanent: true,
      },
      {
        source: "/app/professional/billing",
        destination: "/app/profissional/assinatura",
        permanent: true,
      },
      {
        source: "/app/professional/analytics",
        destination: "/app/profissional/estatisticas",
        permanent: true,
      },
      {
        source: "/app/professional/reviews",
        destination: "/app/profissional/avaliacoes",
        permanent: true,
      },
      {
        source: "/app/professional/whatsapp/verify",
        destination: "/app/profissional/whatsapp/verificar",
        permanent: true,
      },
      {
        source: "/app/professional/cfp",
        destination: "/app/profissional/cfp",
        permanent: true,
      },
      {
        source: "/app/psychologist/:id/contact",
        destination: "/app/psicologo/:id/contato",
        permanent: true,
      },
      {
        source: "/app/psychologist/:id",
        destination: "/app/psicologo/:id",
        permanent: true,
      },
      {
        source: "/app/psychologists",
        destination: "/app/psicologos",
        permanent: true,
      },
      {
        source: "/app/community/suggest/success",
        destination: "/app/comunidades/sugerir/sucesso",
        permanent: true,
      },
      {
        source: "/app/community/suggest",
        destination: "/app/comunidades/sugerir",
        permanent: true,
      },
      {
        source: "/app/community/top-mentors",
        destination: "/app/comunidades/top-mentores",
        permanent: true,
      },
      {
        source: "/app/community/post/new",
        destination: "/app/comunidades/publicacao/nova",
        permanent: true,
      },
      {
        source: "/app/community/:slug/post/new",
        destination: "/app/comunidades/:slug/publicacao/nova",
        permanent: true,
      },
      {
        source: "/app/community/:slug/post/success",
        destination: "/app/comunidades/:slug/publicacao/sucesso",
        permanent: true,
      },
      {
        source: "/app/community/:slug/post/:id/thread/:replyId",
        destination: "/app/comunidades/:slug/publicacao/:id/resposta/:replyId",
        permanent: true,
      },
      {
        source: "/app/community/:slug/post/:id",
        destination: "/app/comunidades/:slug/publicacao/:id",
        permanent: true,
      },
      {
        source: "/app/community/:slug",
        destination: "/app/comunidades/:slug",
        permanent: true,
      },
      {
        source: "/app/community",
        destination: "/app/comunidades",
        permanent: true,
      },
      {
        source: "/psychologists/:id/contact",
        destination: "/psicologos/:id/contato",
        permanent: true,
      },
      {
        source: "/psychologists/:id",
        destination: "/psicologos/:id",
        permanent: true,
      },
      {
        source: "/psychologists",
        destination: "/psicologos",
        permanent: true,
      },
      {
        source: "/community/feed",
        destination: "/",
        permanent: true,
      },
      {
        source: "/comunidades/feed",
        destination: "/",
        permanent: true,
      },
      {
        source: "/community/top-mentors",
        destination: "/comunidades/top-mentores",
        permanent: true,
      },
      {
        source: "/community/:slug/post/:id/thread/:replyId",
        destination: "/comunidades/:slug/publicacao/:id/resposta/:replyId",
        permanent: true,
      },
      {
        source: "/community/:slug/post/:id",
        destination: "/comunidades/:slug/publicacao/:id",
        permanent: true,
      },
      {
        source: "/community/:slug",
        destination: "/comunidades/:slug",
        permanent: true,
      },
      {
        source: "/community",
        destination: "/comunidades",
        permanent: true,
      },
    ];
  },
  async headers() {
    return [
      {
        source: "/app/:path*",
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
      },
      {
        source: "/auth/:path*",
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
      },
      {
        source: "/dashboard/:path*",
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
      },
      {
        source: "/patient/:path*",
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
      },
      {
        source: "/paciente/:path*",
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
      },
      {
        source: "/psychologist/cfp/:path*",
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
      },
    ];
  },
  allowedDevOrigins: Array.from(allowedDevOrigins),
  images: {
    remotePatterns,
  },
  turbopack: {
    root: process.cwd(),
  },
};

export default nextConfig;
