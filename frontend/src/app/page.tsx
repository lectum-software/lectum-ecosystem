import { ArrowRight, Brain, HeartHandshake, ShieldCheck, Sparkles } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { absoluteUrl, SITE_DESCRIPTION, SITE_NAME } from "@/lib/seo";
import { Button } from "@/registry/new-york-v4/ui/button";

export const metadata: Metadata = {
  title: `${SITE_NAME} | Perguntas sobre saúde mental respondidas com responsabilidade`,
  description: SITE_DESCRIPTION,
  alternates: {
    canonical: "/",
  },
};

const structuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${absoluteUrl("/")}#organization`,
      name: SITE_NAME,
      url: absoluteUrl("/"),
      logo: absoluteUrl("/logo-light.png"),
      description: SITE_DESCRIPTION,
    },
    {
      "@type": "WebSite",
      "@id": `${absoluteUrl("/")}#website`,
      name: SITE_NAME,
      url: absoluteUrl("/"),
      inLanguage: "pt-BR",
      publisher: {
        "@id": `${absoluteUrl("/")}#organization`,
      },
    },
    {
      "@type": "WebPage",
      "@id": `${absoluteUrl("/")}#webpage`,
      url: absoluteUrl("/"),
      name: `${SITE_NAME} | Psicologia em comunidade`,
      description: SITE_DESCRIPTION,
      inLanguage: "pt-BR",
      isPartOf: {
        "@id": `${absoluteUrl("/")}#website`,
      },
      about: [
        {
          "@type": "Thing",
          name: "Psicologia",
        },
        {
          "@type": "Thing",
          name: "Saúde mental",
        },
      ],
    },
  ],
};

const pillars = [
  {
    icon: Brain,
    title: "Perguntas em linguagem real",
    description:
      "A experiência parte das dúvidas que pacientes levam para comunidades e para a busca por psicólogos.",
  },
  {
    icon: ShieldCheck,
    title: "Autoridade profissional",
    description:
      "A plataforma prioriza respostas de psicólogos, contexto clínico responsável e credenciais profissionais.",
  },
  {
    icon: HeartHandshake,
    title: "Acolhimento com limites",
    description:
      "Conteúdo informativo, acolhedor e sem prometer diagnóstico, cura ou substituição de atendimento clínico.",
  },
];

export default function Page() {
  return (
    <main className="min-h-dvh bg-background text-foreground">
      <script type="application/ld+json">{JSON.stringify(structuredData)}</script>

      <div className="mx-auto flex min-h-dvh w-full max-w-6xl flex-col px-5 py-6 sm:px-8 lg:px-10">
        <header className="flex items-center justify-between gap-4">
          <Link
            className="inline-flex items-center gap-2 text-2xl font-black tracking-tight text-foreground focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary"
            href="/"
            aria-label="Lectum"
          >
            <span className="text-primary">L</span>
            <span>ectum</span>
          </Link>

          <Link
            className="text-sm font-semibold text-primary transition hover:text-primary-hover focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary"
            href="/auth/login"
          >
            Entrar
          </Link>
        </header>

        <section className="grid flex-1 items-center gap-10 py-14 lg:grid-cols-[1.05fr_0.95fr] lg:py-20">
          <div className="grid gap-7">
            <div className="inline-flex w-fit items-center gap-2 rounded-full border border-border bg-surface px-3 py-2 text-xs font-bold uppercase tracking-[0.18em] text-primary shadow-[var(--lectum-shadow-soft)]">
              <Sparkles className="h-4 w-4" aria-hidden="true" />
              Saúde mental com responsabilidade
            </div>

            <div className="grid gap-5">
              <h1 className="max-w-3xl text-4xl font-black leading-[1.04] tracking-[-0.045em] text-foreground sm:text-5xl lg:text-6xl">
                Perguntas reais de pacientes, respostas responsáveis de psicólogos.
              </h1>
              <p className="max-w-2xl text-base leading-7 text-muted sm:text-lg sm:leading-8">
                A Lectum aproxima pessoas que buscam orientação sobre saúde mental de profissionais
                de psicologia, em uma comunidade pensada para acolher, informar e preservar limites
                éticos.
              </p>
            </div>

            <div className="grid gap-3 sm:flex sm:items-center">
              <Button asChild className="w-full sm:w-auto">
                <Link href="/auth/profile-selection">
                  Começar na Lectum
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </Button>
              <Button asChild className="w-full sm:w-auto" variant="outline">
                <Link href="/auth/register/psychologist">Sou psicólogo</Link>
              </Button>
            </div>

            <p className="max-w-2xl text-xs leading-5 text-subtle sm:text-sm">
              A Lectum não substitui psicoterapia, diagnóstico ou atendimento de emergência. Em
              risco imediato, procure serviços de urgência da sua região.
            </p>
          </div>

          <div className="rounded-[calc(var(--lectum-auth-radius)+8px)] border border-border bg-surface p-4 shadow-[var(--lectum-shadow)] sm:p-6">
            <div className="grid gap-4">
              {pillars.map((pillar) => {
                const Icon = pillar.icon;

                return (
                  <article
                    className="rounded-[var(--lectum-card-radius)] border border-border bg-background p-5"
                    key={pillar.title}
                  >
                    <div className="mb-4 grid h-11 w-11 place-items-center rounded-full bg-primary-soft text-primary">
                      <Icon className="h-5 w-5" aria-hidden="true" />
                    </div>
                    <h2 className="text-base font-extrabold text-foreground">{pillar.title}</h2>
                    <p className="mt-2 text-sm leading-6 text-muted">{pillar.description}</p>
                  </article>
                );
              })}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
