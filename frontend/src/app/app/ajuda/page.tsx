import { ChevronRight, Mail, MessageCircle, MessageSquare } from "lucide-react";
import Link from "next/link";
import { AppPageHeader } from "@/components/ui/app-page-header";
import { PrivateTemplate } from "@/templates/private";

const links = [
  { href: "/app/ajuda/feedback", label: "Enviar feedback", icon: MessageSquare },
  {
    href: "https://wa.me/5511936220962",
    label: "WhatsApp",
    detail: "(11) 93622-0962",
    icon: MessageCircle,
  },
  {
    href: "mailto:suporte@lectum.com.br",
    label: "E-mail",
    detail: "suporte@lectum.com.br",
    icon: Mail,
  },
];
export default function HelpPage() {
  return (
    <PrivateTemplate>
      <section className="mx-auto w-full max-w-2xl space-y-6">
        <AppPageHeader title="Ajuda e feedback" />
        <div className="divide-y divide-border">
          {links.map(({ href, label, detail, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="flex min-h-20 items-center gap-4 px-2 py-4 transition hover:bg-primary-soft focus-visible:outline-primary"
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
        </div>
      </section>
    </PrivateTemplate>
  );
}
