export const acceptanceStatusText = (kind: "terms" | "privacy", acceptedAt?: string) => {
  if (!acceptedAt) return "Esta versão ainda não foi confirmada por você.";
  const date = new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo" }).format(
    new Date(acceptedAt),
  );
  return kind === "terms"
    ? `Você aceitou esta versão em ${date}.`
    : `Você confirmou ciência desta versão em ${date}.`;
};
