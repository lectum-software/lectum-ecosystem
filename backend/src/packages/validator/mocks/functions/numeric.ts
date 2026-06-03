import { faker } from "@faker-js/faker";

export function numeric(): number {
  const fiveDigits = faker.string.numeric(5);
  return Number(fiveDigits);
}
