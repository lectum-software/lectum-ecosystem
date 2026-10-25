import { ChevronRight, FileText, Mail, MessageSquare, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { LEGAL_PATHS, LEGAL_TITLES } from "@/components/legal/policy";
import { AppPageHeader } from "@/components/ui/app-page-header";
import { WhatsAppIcon } from "@/components/ui/whatsapp-icon";
import { PrivateTemplate } from "@/templates/private";

const supportLinks = [
  {
    href: "/app/ajuda/feedback",
    label: "Enviar feedback",
    detail: "Relate problemas técnicos ou sugestão de melhoria",
    icon: MessageSquare,
  },
  {
    href: "https://wa.me/5511936220962",
    label: "Suporte via WhatsApp",
    detail: "(11) 93622-0962",
    icon: WhatsAppIcon,
  },
  {
    href: "mailto:suporte@lectum.com.br",
    label: "E-mail",
    detail: "suporte@lectum.com.br",
    icon: Mail,
  },
];
const legalLinks = [
  { href: LEGAL_PATHS.privacy, label: LEGAL_TITLES.privacy, detail: "", icon: ShieldCheck },
  { href: LEGAL_PATHS.terms, label: LEGAL_TITLES.terms, detail: "", icon: FileText },
];
export default function HelpPage() {
  return (
    <PrivateTemplate>
      <section className="mx-auto w-full max-w-2xl space-y-6">
        <AppPageHeader title="Ajuda e feedback" />
        {[
          { label: "Suporte", links: supportLinks },
          { label: "Privacidade e termos", links: legalLinks },
        ].map(({ label: groupLabel, links }) => (
          <nav
            key={groupLabel}
            aria-label={groupLabel}
            className="divide-y divide-border overflow-hidden rounded-[var(--lectum-card-radius)] border border-border bg-surface px-4 shadow-[var(--lectum-shadow-soft)]"
          >
            {links.map(({ href, label, detail, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className="flex min-h-20 items-center gap-4 py-4 transition hover:bg-primary-soft focus-visible:outline-primary"
                prefetch={false}
                {...(href.startsWith("https:")
                  ? { target: "_blank", rel: "noopener noreferrer" }
                  : {})}
              >
                <Icon aria-hidden className="h-5 w-5 shrink-0 text-primary" />
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold">{label}</span>
                  {detail ? (
                    <span className="block break-words text-sm text-muted">{detail}</span>
                  ) : null}
                </span>
                <ChevronRight aria-hidden className="h-5 w-5 shrink-0 text-muted" />
              </Link>
            ))}
          </nav>
        ))}
      </section>
    </PrivateTemplate>
  );
}
