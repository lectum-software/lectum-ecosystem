//Objects
import type { user } from "@/interfaces/objects";

export interface IIndexDTO {
  q: {
    //*
    limit?: number;
    page?: number;
    search?: string;
    orderKey?: string;
    orderValue?: string;
    startDate?: Date;
    endDate?: Date;
  };
  auth: user;
}
