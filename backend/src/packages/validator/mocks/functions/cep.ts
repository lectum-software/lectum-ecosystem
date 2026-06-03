import { faker } from "@faker-js/faker";

export function cep(): string {
  const fiveDigits = faker.string.numeric(5);
  const threeDigits = faker.string.numeric(3);
  return `${fiveDigits}-${threeDigits}`;
}
