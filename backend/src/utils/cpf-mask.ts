/** Máscara de exibição; não valida CPF nem comprova identidade. */
export const maskCpf = (value?: string | null) => {
  const digits = String(value ?? "").replace(/\D/g, "");
  if (!digits) return null;
  if (digits.length !== 11) return "CPF informado";

  return `${digits.slice(0, 3)}.***.***-${digits.slice(9)}`;
};
