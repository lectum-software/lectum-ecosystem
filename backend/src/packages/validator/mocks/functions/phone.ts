import { randomBoolean, randomDigits, randomInteger } from "./random";

export function phone(): string {
  const cellRegex = /^(\+?\d{11,14})?$/;
  const residentialRegex = /^(\+?\d{10,13})?$/;

  let value: string;
  do {
    const isCell = randomBoolean();
    let len: number;
    if (isCell) {
      len = randomInteger(11, 14);
    } else {
      len = randomInteger(10, 13);
    }
    const digits = randomDigits(len);
    value = randomBoolean() ? `+${digits}` : digits;
  } while (!cellRegex.test(value) && !residentialRegex.test(value));

  return value.replace(/\D/g, "");
}
