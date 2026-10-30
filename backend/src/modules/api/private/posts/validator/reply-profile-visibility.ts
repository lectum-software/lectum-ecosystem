import type { RequestHandler } from "express";
import { z } from "zod";
import { error } from "@/helpers/translate";
import { validator } from "@/utils/validator";
import { replySaveSchema } from "./index";

export const replyProfileVisibilityPayload = z.object({ hidden: z.boolean() }).strict();

const validate = validator({
  params: replySaveSchema.params,
  body: [{ key: "hidden", method: "boolean" }],
});

export const replyProfileVisibilityValidator: RequestHandler = (req, res, next) => {
  if (!replyProfileVisibilityPayload.safeParse(req.body).success) {
    res.status(400).send({ status: 400, ...error("invalid_structure", {}) });
    return;
  }
  return validate(req, res, next);
};
