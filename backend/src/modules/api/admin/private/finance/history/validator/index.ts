import { z } from "zod";
import { type IValidatorRequest, validator } from "@/utils/validator";
import { financialStatuses } from "../DTOs/IAdminFinanceHistoryDTO";

const day = z.iso.date();
export const historySchema: IValidatorRequest = {
  query: [
    { key: "user_id", custom: z.string().regex(/^[A-Za-z0-9_-]{1,128}$/), optional: true },
    {
      key: "page",
      coerse: "number",
      method: "numeric",
      int: true,
      positive: true,
      max: 100_000,
      optional: true,
    },
    {
      key: "limit",
      coerse: "number",
      method: "numeric",
      int: true,
      positive: true,
      max: 50,
      optional: true,
    },
    { key: "status", custom: z.enum(financialStatuses), optional: true },
    { key: "q", coerse: "string", method: "string", max: 120, optional: true },
    { key: "from", custom: day, optional: true },
    { key: "to", custom: day, optional: true },
  ],
};
export default validator(historySchema);
