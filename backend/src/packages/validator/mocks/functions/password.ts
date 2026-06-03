import { faker } from "@faker-js/faker";

export function password(): string {
  const strongRegex = /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]).+$/;

  let value: string;
  do {
    value = faker.internet.password({
      length: 12,
    });
  } while (!strongRegex.test(value));

  return value;
}
