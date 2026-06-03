import { i18n, language } from "../../../i18n";
import { custom } from "../handlers/custom";
import type { RefineRelation } from "./types";

export default function ({ keys, ctx, cont }: RefineRelation) {
  const tZod = i18n?.getFixedT(language, "zod");

  const keyDetails = keys.map(({ key }) => ({
    key,
    name: key,
    value: cont?.[key],
  }));

  if (keyDetails.length > 1) {
    const uniqueValues = new Set(keyDetails.map(({ value }) => value));

    if (uniqueValues.size > 1) {
      const names = keyDetails.map(({ name }) => name);
      const last = names.pop()?.toLocaleLowerCase();

      keyDetails.forEach(({ key }) => {
        ctx.addIssue({
          code: "custom",
          path: [key],
          message: custom(
            "invalid_type_equal_condition",
            {
              names: names.map((i) => tZod(`names.${i}`) || i)?.join(", "),
              last: tZod(`names.${last}`) || last,
            },
            "and",
          ),
        });
      });
    }
  }
}
