import { randomInt } from "node:crypto";
import { v4 } from "uuid";

export const code = (onlyNumeric = true) => {
  if (onlyNumeric) return randomInt(0, 1000000).toString().padStart(6, "0");

  return v4().slice(0, 6);
};
