//Types
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
    email: string;
    active?: boolean;
    password: string;
    password_confirm: string;
  };
  select?: Prisma.userSelect;
  include?: Prisma.userInclude;
}

export interface IHasDTO {
  where: Prisma.userWhereInput;
  select?: Prisma.userSelect;
  include?: Prisma.userInclude;
}
