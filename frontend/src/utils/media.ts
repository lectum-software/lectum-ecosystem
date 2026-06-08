const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export const resolvePublicMediaUrl = (value?: string | null) => {
  if (!value) return null;

  const apiBase = API_URL.replace(/\/$/, "");

  try {
    const parsed = new URL(value, apiBase);

    if (parsed.pathname.startsWith("/public/files/")) {
      return `${apiBase}${parsed.pathname}${parsed.search}`;
    }

    if (value.startsWith("http")) return value;
    return `${apiBase}${value.startsWith("/") ? value : `/${value}`}`;
  } catch {
    if (value.startsWith("/public/files/")) return `${apiBase}${value}`;
    return value.startsWith("http") ? value : null;
  }
};

export const isPublicMediaUrl = (value?: string | null) => {
  const resolved = resolvePublicMediaUrl(value);
  if (!resolved) return false;

  try {
    return new URL(resolved).pathname.startsWith("/public/files/");
  } catch {
    return resolved.startsWith("/public/files/") || resolved.includes("/public/files/");
  }
};
