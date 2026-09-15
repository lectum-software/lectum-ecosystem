/** Retorna a segunda-feira da semana local sem alterar a data recebida. */
export const startOfCurrentWeek = (referenceDate = new Date()) => {
  const date = new Date(referenceDate.getTime());
  const day = date.getDay();
  date.setDate(date.getDate() + (day === 0 ? -6 : 1 - day));

  return date;
};
