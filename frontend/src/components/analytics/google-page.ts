import { googleAttributionLocation } from "./google-attribution";

export type GooglePage = {
  page_location: string;
  page_title: string;
  community_name: string;
};
const titles: Record<string, string> = {
  "/": "Início",
  "/comunidades": "Comunidades",
  "/psicologos": "Psicólogos",
  "/auth/login": "Entrar",
  "/auth/register/patient": "Cadastro",
  "/auth/register/psychologist": "Cadastro profissional",
  "/auth/profile-selection": "Escolha de perfil",
  "/auth/verify-email": "Verificação de e-mail",
  "/politica-de-privacidade": "Política de Privacidade",
  "/termos-de-uso": "Termos de uso",
};
// Names come only from the public community record, never titles or post contents.
export function googlePageContext(
  href: string,
  community?: { slug: string; name: string },
): GooglePage | null {
  const url = new URL(googleAttributionLocation(href));
  let path = "/";
  try {
    path = new URL(href).pathname.replace(/\/$/, "") || "/";
  } catch {
    /* Generic fallback. */
  }
  let name = "";
  let title = titles[path];
  const match = /^\/(?:comunidades|app\/community)\/([a-z0-9][a-z0-9-]{0,149})$/.exec(path);
  if (!title && match && !["feed", "top-mentores"].includes(match[1])) {
    if (!community || community.slug !== match[1]) return null;
    name = community.name.trim();
    if (!name || name.length > 100 || /[@<>\r\n]/.test(name)) return null;
    path = `/comunidades/${match[1]}`;
    title = `Comunidade: ${name}`;
  }
  if (!title) {
    if (/^\/(?:comunidades|app\/community)\/[^/]+\/(?:publicacao|post)\//.test(path)) {
      path = "/publicacoes";
      title = "Publicações";
    } else if (path.startsWith("/app/") || path.startsWith("/auth/")) {
      path = "/area-restrita";
      title = "Área restrita";
    } else {
      path = "/outras-paginas";
      title = "Outras páginas";
    }
  }
  url.pathname = path;
  return { page_location: url.href, page_title: `${title} | Lectum`, community_name: name };
}
export function readGooglePage(): GooglePage | null {
  const marker = document.querySelector<HTMLElement>("[data-google-community-slug]");
  return googlePageContext(
    window.location.href,
    marker
      ? {
          slug: marker.dataset.googleCommunitySlug || "",
          name: marker.dataset.googleCommunityName || "",
        }
      : undefined,
  );
}
