//Libs
import bcrypt from "bcrypt";

export const encrypt = async (value: string, salt = 10) => {
  const encrypted = await bcrypt.hash(value, salt);
  return encrypted;
};

export const compare = async (value: string, encrypted: string) => {
  const compared = await bcrypt.compare(value, encrypted);
  return compared;
};
