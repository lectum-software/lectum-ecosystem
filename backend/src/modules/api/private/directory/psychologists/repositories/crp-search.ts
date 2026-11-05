import prisma from "@/infra/database/prisma";

export function parseCrpSearch(search?: string) {
  const value = search?.trim().replace(/^crp\s*[-:]?\s*/i, "");
  if (!value || !/^[\d\s./-]+$/.test(value) || !/\d/.test(value)) return null;
  const regional = /^(\d{1,2})\s*[/ -]\s*(\d[\d.\s-]*)$/.exec(value);
  const normalize = (part: string) => part.replace(/\D/g, "").replace(/^0+(?=\d)/, "");
  return regional
    ? { region: normalize(regional[1]), number: normalize(regional[2]) }
    : { region: null, number: normalize(value) };
}

export async function findCrpProfileIds(search?: string): Promise<string[]> {
  const query = parseCrpSearch(search);
  if (!query) return [];
  const numberPattern = `%${query.number}%`;
  // Normalize legacy regional labels and punctuation without changing stored registrations.
  const rows = await prisma.$queryRaw<{ id: string }[]>`
    WITH registrations AS (
      SELECT id,
        COALESCE(NULLIF(ltrim(regexp_replace(regexp_replace(crp, '^.*/', ''), '[^0-9]', '', 'g'), '0'), ''), '0') AS registration,
        CASE WHEN crp LIKE '%/%' THEN
          COALESCE(NULLIF(ltrim(regexp_replace(regexp_replace(crp, '/[^/]*$', ''), '[^0-9]', '', 'g'), '0'), ''), '0')
        ELSE NULL END AS region
      FROM psychologist_profiles
      WHERE deleted = false AND published = true AND crp IS NOT NULL
    )
    SELECT id FROM registrations
    WHERE (
      (${query.region}::text IS NOT NULL AND region = ${query.region} AND registration LIKE ${numberPattern})
      OR (${query.region}::text IS NULL AND (
        registration LIKE ${numberPattern}
        OR (lpad(region, 2, '0') || registration) LIKE ${numberPattern}
      ))
    )
  `;
  return rows.map((row) => row.id);
}
