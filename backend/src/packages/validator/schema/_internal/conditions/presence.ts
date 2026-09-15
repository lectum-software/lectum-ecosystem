// Zero e false são preenchidos. Preserva a ausência legada de "", null e undefined.
export const isConditionValuePresent = (value: unknown): boolean =>
  value === 0 || value === false || Boolean(value);
