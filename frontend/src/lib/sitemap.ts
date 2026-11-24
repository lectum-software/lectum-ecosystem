import { absoluteUrl, PUBLIC_INDEXABLE_ROUTES } from "@/lib/seo";
import { getPublicApiSource } from "@/utils/public-asset-sources";

const kinds = ["communities", "psychologists", "posts", "videos", "post-videos"];
type Entry = {
  path: string;
  modified?: string;
  video?: {
    title: string;
    description: string;
    thumbnail: string;
    content: string;
    published: string;
  };
};
const escapeXml = (value: string) =>
  value
    // biome-ignore lint/suspicious/noControlCharactersInRegex: XML 1.0 forbids these characters in public text.
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "")
    .replace(
      /[<>&"']/g,
      (char) =>
        ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&apos;" })[char] ?? char,
    );
const tag = (name: string, value: string) => `<${name}>${escapeXml(value)}</${name}>`;
const header = '<?xml version="1.0" encoding="UTF-8"?>';

async function read<T>(path: string): Promise<T> {
  const api = getPublicApiSource()?.origin;
  if (!api) throw new Error("Sitemap source unavailable");
  const result = await fetch(`${api}/api/public/seo/sitemap${path}`, {
    cache: "no-store",
    credentials: "omit",
    signal: AbortSignal.timeout(60000),
  });
  if (!result.ok) throw new Error("Sitemap source unavailable");
  const body = await result.json();
  if (!body.success || !Array.isArray(body.data)) throw new Error("Invalid sitemap source");
  return body.data;
}

export async function sitemapIndex() {
  const manifest = await read<{ kind: string; pages: number }[]>("");
  const paths = ["/sitemaps/static-0.xml"];
  for (const item of manifest) {
    if (
      !kinds.includes(item.kind) ||
      !Number.isSafeInteger(item.pages) ||
      item.pages < 0 ||
      item.pages > 100000
    )
      throw new Error("Invalid sitemap manifest");
    for (let page = 0; page < item.pages; page++) paths.push(`/sitemaps/${item.kind}-${page}.xml`);
  }
  if (paths.length > 50000) throw new Error("Sitemap index capacity exceeded");
  return `${header}<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${paths.map((path) => `<sitemap>${tag("loc", absoluteUrl(path))}</sitemap>`).join("")}</sitemapindex>`;
}

export function renderSitemap(entries: Entry[]) {
  if (entries.length > 50000) throw new Error("Sitemap capacity exceeded");
  const api = getPublicApiSource()?.origin;
  const urls = entries
    .map((entry) => {
      if (!entry.path.startsWith("/") || entry.path.startsWith("//"))
        throw new Error("Invalid sitemap path");
      let body = tag("loc", absoluteUrl(entry.path));
      if (entry.modified) {
        if (!Number.isFinite(Date.parse(entry.modified))) throw new Error("Invalid sitemap date");
        body += tag("lastmod", entry.modified);
      }
      if (entry.video) {
        if (!api) throw new Error("Missing media origin");
        const video = entry.video;
        if (
          !video.title.trim() ||
          !video.description.trim() ||
          !Number.isFinite(Date.parse(video.published)) ||
          ![video.thumbnail, video.content].every(
            (path) => path.startsWith("/api/public/seo/community-post/") && !path.includes("\\"),
          )
        )
          throw new Error("Invalid sitemap video");
        body += `<video:video>${tag("video:title", video.title)}${tag("video:description", video.description)}${tag("video:thumbnail_loc", new URL(video.thumbnail, api).toString())}${tag("video:content_loc", new URL(video.content, api).toString())}${tag("video:publication_date", video.published)}</video:video>`;
      }
      return `<url>${body}</url>`;
    })
    .join("");
  return `${header}<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:video="http://www.google.com/schemas/sitemap-video/1.1">${urls}</urlset>`;
}

export async function sitemapPage(file: string) {
  if (file === "static-0.xml")
    return renderSitemap(PUBLIC_INDEXABLE_ROUTES.map((route) => ({ path: route.path })));
  const match = /^(communities|psychologists|posts|videos|post-videos)-(\d+)\.xml$/.exec(file);
  if (!match || Number(match[2]) > 100000) return null;
  return renderSitemap(await read<Entry[]>(`/${match[1]}/${match[2]}`));
}

export function sitemapResponse(xml: string) {
  if (new TextEncoder().encode(xml).byteLength > 50 * 1024 * 1024)
    throw new Error("Sitemap byte capacity exceeded");
  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=0, s-maxage=300",
    },
  });
}
export function sitemapUnavailable() {
  return new Response("Sitemap temporarily unavailable", {
    status: 503,
    headers: { "Cache-Control": "no-store", "Retry-After": "300" },
  });
}
