import { randomDigits } from "./random";

export function cep(): string {
  const fiveDigits = randomDigits(5);
  const threeDigits = randomDigits(3);
  return `${fiveDigits}-${threeDigits}`;
}
