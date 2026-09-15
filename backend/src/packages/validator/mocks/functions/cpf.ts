import { randomDigit } from "./random";

export function cpf(): string {
  const base: number[] = Array.from({ length: 9 }, () => randomDigit());

  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += base[i] * (10 - i);
  }
  let mod = sum % 11;
  const firstDigit = mod < 2 ? 0 : 11 - mod;

  const digits = [...base, firstDigit];
  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += digits[i] * (11 - i);
  }
  mod = sum % 11;
  const secondDigit = mod < 2 ? 0 : 11 - mod;

  const cpfDigits = [...base, firstDigit, secondDigit].join("");
  return `${cpfDigits.substr(0, 3)}.${cpfDigits.substr(3, 3)}.${cpfDigits.substr(6, 3)}-${cpfDigits.substr(9, 2)}`;
}
