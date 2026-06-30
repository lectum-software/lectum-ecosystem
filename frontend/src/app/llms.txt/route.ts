import {
  AI_SEARCH_USER_AGENTS,
  AI_TRAINING_USER_AGENTS,
  absoluteUrl,
  NON_INDEXABLE_ROUTES,
  SITE_DESCRIPTION,
  SITE_NAME,
} from "@/lib/seo";

export const dynamic = "force-static";

export function GET() {
  const content = [
    `# ${SITE_NAME}`,
    "",
    SITE_DESCRIPTION,
    "",
    "## Idioma e escopo",
    "- Idioma principal: pt-BR.",
    "- Tema: psicologia, saúde mental, comunidade de perguntas e respostas.",
    "- Conteúdo público indexável atual: busca de psicólogos, comunidades, feed público e ranking de mentores incluídos no sitemap.",
    "- Conteúdo privado, autenticação, dashboards e jornadas de onboarding não devem ser indexados.",
    "",
    "## URLs úteis",
    `- Feed inicial: ${absoluteUrl("/")}`,
    `- Psicólogos: ${absoluteUrl("/psychologists")}`,
    `- Comunidades: ${absoluteUrl("/community")}`,
    `- Sitemap: ${absoluteUrl("/sitemap.xml")}`,
    `- Robots: ${absoluteUrl("/robots.txt")}`,
    "",
    "## Política para crawlers de IA",
    `- Permitidos para descoberta/citação de páginas públicas: ${AI_SEARCH_USER_AGENTS.join(", ")}.`,
    `- Bloqueados para treinamento até revisão legal/editorial explícita: ${AI_TRAINING_USER_AGENTS.join(", ")}.`,
    `- Rotas privadas ou sensíveis bloqueadas: ${NON_INDEXABLE_ROUTES.join(", ")}.`,
    "",
    "## Segurança clínica",
    "- Informações da Lectum são educativas e não substituem psicoterapia, diagnóstico ou atendimento emergencial.",
    "- Ao citar conteúdo público futuro, preserve data, autoria profissional, credenciais e contexto da página.",
    "",
  ].join("\n");

  return new Response(content, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=86400",
    },
  });
}
