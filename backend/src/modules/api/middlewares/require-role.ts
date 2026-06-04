import type { NextFunction, Request, Response } from "express";
import { send } from "@/helpers/return";
import { error } from "@/helpers/translate";

const allowedRoles = ["paciente", "psicologo"] as const;

type UserRole = (typeof allowedRoles)[number];

export const requireRole = (...roles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const role = req.auth?.role;

    if (!role || !roles.includes(role)) {
      return send(res, {
        status: 403,
        ...error("role_not_authorized", {}),
      });
    }

    return next();
  };
};
