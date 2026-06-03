import type { Request } from "express";

export interface ILoginDTO {
  b: {
    email: string;
    password: string;
  };
  headers?: Request["headers"];
}
