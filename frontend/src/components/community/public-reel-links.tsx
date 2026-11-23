import Link from "next/link";
import { getPublicApiSource } from "@/utils/public-asset-sources";

export async function PublicReelLinks({ slug, id }: { slug: string; id: string }) {
  const api = getPublicApiSource()?.origin;
  if (!api) return null;
  let links: { href: string; title: string }[] = [];
  try {
    const response = await fetch(
      `${api}/api/public/seo/community-post/${encodeURIComponent(slug)}/${encodeURIComponent(id)}/videos`,
      { cache: "no-store", signal: AbortSignal.timeout(5000) },
    );
    if (!response.ok) return null;
    const body = await response.json();
    if (body.success && Array.isArray(body.data)) links = body.data;
  } catch {
    return null;
  }
  if (!links.length) return null;
  return (
    <nav aria-label="Vídeos desta publicação" className="mx-auto max-w-3xl px-4 py-4">
      <h2 className="font-semibold">Vídeos desta publicação</h2>
      <ul className="mt-2 space-y-2">
        {links
          .filter((link) => link.href.startsWith("/comunidades/"))
          .map((link) => (
            <li key={link.href}>
              <Link href={link.href} prefetch={false} className="text-primary underline">
                {link.title}
              </Link>
            </li>
          ))}
      </ul>
    </nav>
  );
}
