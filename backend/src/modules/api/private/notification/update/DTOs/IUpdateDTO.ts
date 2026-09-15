//Objects
import type { user } from "@/interfaces/objects";

export interface IUpdateDTO {
  p: {
    //*
    id: string;
  };
  b: {
    //*
    read: boolean;
  };
  auth: user;
}

export interface IFindDTO {
  p: {
    //*
    id: string;
  };
  auth: user;
}
