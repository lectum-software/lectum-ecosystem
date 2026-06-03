import { faker } from "@faker-js/faker";

export function phone(): string {
  const cellRegex = /^(\+?\d{11,14})?$/;
  const residentialRegex = /^(\+?\d{10,13})?$/;

  let value: string;
  do {
    const isCell = Math.random() < 0.5;
    let len: number;
    if (isCell) {
      len = faker.number.int({ min: 11, max: 14 });
    } else {
      len = faker.number.int({ min: 10, max: 13 });
    }
    const digits = faker.string.numeric(len);
    value = Math.random() < 0.5 ? `+${digits}` : digits;
  } while (!cellRegex.test(value) && !residentialRegex.test(value));

  return value.replace(/\D/g, "");
}
