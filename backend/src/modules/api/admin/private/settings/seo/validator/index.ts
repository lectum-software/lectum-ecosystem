import { SEO_METADATA_PAGE_KEYS } from "@/modules/seo/metadata-settings";
import { type IValidatorRequest, validator } from "@/utils/validator";

const pageKeyParam = [
  {
    key: "page_key",
    coerse: "string",
    method: "enumeric",
    values: [...SEO_METADATA_PAGE_KEYS],
  },
] satisfies IValidatorRequest["params"];

const seoBody = [
  { key: "title", coerse: "string", method: "string", min: 5, max: 140 },
  { key: "description", coerse: "string", method: "string", min: 20, max: 360 },
  { key: "keywords", coerse: "string", method: "string", min: 0, max: 600, optional: true },
  {
    key: "og_title",
    coerse: "string",
    method: "string",
    min: 0,
    max: 140,
    nullable: true,
    optional: true,
  },
  {
    key: "og_description",
    coerse: "string",
    method: "string",
    min: 0,
    max: 360,
    nullable: true,
    optional: true,
  },
  {
    key: "og_image_url",
    coerse: "string",
    method: "string",
    min: 0,
    max: 600,
    nullable: true,
    optional: true,
  },
  {
    key: "canonical_url",
    coerse: "string",
    method: "string",
    min: 0,
    max: 600,
    nullable: true,
    optional: true,
  },
  { key: "robots_index", coerse: "boolean", method: "boolean" },
  { key: "robots_follow", coerse: "boolean", method: "boolean" },
] satisfies IValidatorRequest["body"];

export const indexValidator = validator({});
export const updateValidator = validator({ body: seoBody, params: pageKeyParam });
