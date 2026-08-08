//Types
import type { Request } from "express";
import type {
  //*
  Prisma,
} from "@/external/generated/prisma/client";

export interface IStoreDTO {
  p: Record<string, never>;
  q: Record<string, never>;
  b: {
    //*
    name: string;
    professional_first_name?: string;
    professional_last_name?: string;
    email: string;
    active?: boolean;
    password: string;
    password_confirm: string;
    role?: "paciente" | "psicologo";
    terms_accepted?: boolean;
    terms_version?: string;
    analytics_visitor_id?: string;
    analytics_session_id?: string;
  };
  device_id?: string;
  headers?: Request["headers"];
  select?: Prisma.userSelect;
  include?: Prisma.userInclude;
}

export interface IHasDTO {
  where: Prisma.userWhereInput;
  select?: Prisma.userSelect;
  include?: Prisma.userInclude;
}
