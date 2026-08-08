import { randomInt } from "node:crypto";

export const randomBoolean = () => randomInt(0, 2) === 1;
export const randomDigit = () => randomInt(0, 10);
export const randomDigits = (length: number) =>
  Array.from({ length }, () => String(randomDigit())).join("");
export const randomInteger = (min: number, max: number) => randomInt(min, max + 1);

export const shuffled = (value: string) => {
  const characters = Array.from(value);

  for (let index = characters.length - 1; index > 0; index -= 1) {
    const target = randomInt(0, index + 1);
    [characters[index], characters[target]] = [characters[target], characters[index]];
  }

  return characters.join("");
};

export const randomCharacter = (alphabet: string) => alphabet[randomInt(0, alphabet.length)];
