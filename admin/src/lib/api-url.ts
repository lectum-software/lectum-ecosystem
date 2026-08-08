const normalizeApiUrl = (value?: string | null) => {
  const normalized = value?.trim();
  return normalized ? normalized.replace(/\/+$/, "") : "http://localhost:3001";
};

export const adminApiUrl = normalizeApiUrl(process.env.NEXT_PUBLIC_API_URL);
