const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "long",
  year: "numeric",
});

export const formatPrice = (priceCents?: number | null) => {
  if (!priceCents) return "R$ 0,00";

  return currencyFormatter.format(priceCents / 100);
};

export const formatDate = (value?: string | null) => {
  if (!value) return "Aguardando confirmação";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Data indisponível";

  return dateFormatter.format(date);
};

export const formatPaymentDate = (value?: string | null) => {
  if (!value) return "Data indisponível";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Data indisponível";

  return dateFormatter.format(date);
};
