import { randomDigits } from "./random";

export function numeric(): number {
  const fiveDigits = randomDigits(5);
  return Number(fiveDigits);
}
