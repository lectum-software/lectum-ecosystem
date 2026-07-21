import { type IValidatorRequest, validator } from "@/utils/validator";
import {
  ADMIN_NOTIFICATION_AUDIENCES,
  ADMIN_NOTIFICATION_CAMPAIGN_STATUSES,
  ADMIN_NOTIFICATION_CHANNELS,
  ADMIN_NOTIFICATION_PERIODS,
  NOTIFICATION_DELIVERY_STATUSES,
} from "../DTOs/IAdminNotificationsDTO";

const campaignBody = [
  { key: "title", coerse: "string", method: "string", max: 120, min: 3 },
  { key: "body", coerse: "string", method: "string", max: 500, min: 3 },
  {
    key: "audience",
    coerse: "string",
    method: "enumeric",
    values: [...ADMIN_NOTIFICATION_AUDIENCES],
  },
  { key: "channels", method: "string_array" },
  { key: "redirect", coerse: "string", method: "string", max: 512, nullable: true, optional: true },
] satisfies IValidatorRequest["body"];

const optionalCampaignBody = [
  { key: "title", coerse: "string", method: "string", max: 120, min: 3, optional: true },
  { key: "body", coerse: "string", method: "string", max: 500, min: 3, optional: true },
  {
    key: "audience",
    coerse: "string",
    method: "enumeric",
    optional: true,
    values: [...ADMIN_NOTIFICATION_AUDIENCES],
  },
  { key: "channels", method: "string_array", optional: true },
  { key: "redirect", coerse: "string", method: "string", max: 512, nullable: true, optional: true },
] satisfies IValidatorRequest["body"];

const idParam = [
  { key: "id", coerse: "string", method: "string" },
] satisfies IValidatorRequest["params"];

const paginationQuery = [
  { key: "page", method: "numeric", int: true, positive: true, optional: true },
  { key: "limit", method: "numeric", int: true, positive: true, max: 100, optional: true },
  { key: "from", coerse: "string", method: "string", max: 10, optional: true },
  {
    key: "period",
    coerse: "string",
    method: "enumeric",
    optional: true,
    values: [...ADMIN_NOTIFICATION_PERIODS],
  },
  { key: "to", coerse: "string", method: "string", max: 10, optional: true },
] satisfies IValidatorRequest["query"];

export const createCampaignValidator = validator({ body: campaignBody });
export const updateCampaignValidator = validator({ body: optionalCampaignBody, params: idParam });
export const idValidator = validator({ params: idParam });
export const scheduleCampaignValidator = validator({
  body: [{ key: "scheduled_at", method: "date", min_today: true }],
  params: idParam,
});
export const listCampaignsValidator = validator({
  query: [
    ...paginationQuery,
    {
      key: "audience",
      coerse: "string",
      method: "enumeric",
      optional: true,
      values: [...ADMIN_NOTIFICATION_AUDIENCES],
    },
    {
      key: "channel",
      coerse: "string",
      method: "enumeric",
      optional: true,
      values: [...ADMIN_NOTIFICATION_CHANNELS],
    },
    { key: "q", coerse: "string", method: "string", max: 120, optional: true },
    {
      key: "status",
      coerse: "string",
      method: "enumeric",
      optional: true,
      values: [...ADMIN_NOTIFICATION_CAMPAIGN_STATUSES],
    },
  ],
});
export const automaticLogsValidator = validator({
  query: [
    ...paginationQuery,
    {
      key: "audience",
      coerse: "string",
      method: "enumeric",
      optional: true,
      values: [...ADMIN_NOTIFICATION_AUDIENCES],
    },
    {
      key: "channel",
      coerse: "string",
      method: "enumeric",
      optional: true,
      values: [...ADMIN_NOTIFICATION_CHANNELS],
    },
    {
      key: "status",
      coerse: "string",
      method: "enumeric",
      optional: true,
      values: [...NOTIFICATION_DELIVERY_STATUSES],
    },
    { key: "q", coerse: "string", method: "string", max: 120, optional: true },
    { key: "trigger_key", coerse: "string", method: "string", max: 80, optional: true },
  ],
});
export const metricsValidator = validator({ query: paginationQuery });
