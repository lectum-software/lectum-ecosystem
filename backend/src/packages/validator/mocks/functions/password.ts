import { randomCharacter, shuffled } from "./random";

const LOWERCASE = "abcdefghijklmnopqrstuvwxyz";
const UPPERCASE = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const DIGITS = "0123456789";
const SPECIAL = "!@#$%^&*()_+-=[]{};':\"\\|,.<>/?";
const PASSWORD_ALPHABET = `${LOWERCASE}${UPPERCASE}${DIGITS}${SPECIAL}`;

export function password(): string {
  const required = [
    randomCharacter(LOWERCASE),
    randomCharacter(UPPERCASE),
    randomCharacter(DIGITS),
    randomCharacter(SPECIAL),
  ];
  const remaining = Array.from({ length: 8 }, () => randomCharacter(PASSWORD_ALPHABET));

  return shuffled([...required, ...remaining].join(""));
}
