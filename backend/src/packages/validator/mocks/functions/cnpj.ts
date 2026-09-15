import { randomDigit } from "./random";

export function cnpj(): string {
  const cnpjBase: number[] = Array.from({ length: 12 }, () => randomDigit());

  const calcDigit = (digits: number[], weights: number[]): number => {
    const sum = digits.reduce((acc, digit, idx) => acc + digit * weights[idx], 0);
    const remainder = sum % 11;
    return remainder < 2 ? 0 : 11 - remainder;
  };

  const weights1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const firstCheck = calcDigit(cnpjBase, weights1);

  const cnpjPartial = [...cnpjBase, firstCheck];
  const weights2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const secondCheck = calcDigit(cnpjPartial, weights2);

  const fullCnpj = [...cnpjBase, firstCheck, secondCheck];

  const cnpjStr = fullCnpj.join("").padStart(14, "0");
  return `${cnpjStr.substr(0, 2)}.${cnpjStr.substr(2, 3)}.${cnpjStr.substr(5, 3)}/${cnpjStr.substr(8, 4)}-${cnpjStr.substr(12, 2)}`;
}
