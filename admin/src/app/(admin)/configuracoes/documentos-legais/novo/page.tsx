import { NewLegalDraftClient } from "./client";

export default async function Page({ searchParams }: { searchParams: Promise<{ tipo?: string }> }) {
  const { tipo } = await searchParams;
  return (
    <NewLegalDraftClient
      key={tipo === "privacy" ? "privacy" : "terms"}
      kind={tipo === "privacy" ? "privacy" : "terms"}
    />
  );
}
