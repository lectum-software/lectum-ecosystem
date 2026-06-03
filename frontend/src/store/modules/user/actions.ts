import type { user } from "@/api/generator/types";

import * as types from "./types";

export const create = (params: user) => {
  return {
    type: types.USER_CREATE,
    payload: params,
  };
};

export const update = (params: Partial<user>) => {
  return {
    type: types.USER_UPDATE,
    payload: params,
  };
};

export const destroy = () => {
  return {
    type: types.USER_REMOVE,
  };
};
