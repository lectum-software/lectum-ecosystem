import type { Request } from "express";

const publicFiles = [""];

export const files = async (req: Request) => {
  const base = req.path.split("/")[1];

  if (base && publicFiles.includes(base)) return true;
  else return false;
};
