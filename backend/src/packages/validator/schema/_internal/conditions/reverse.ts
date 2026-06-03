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

  const definedKeys = keyDetails.filter(({ value }) => value);

  if (definedKeys.length > 1) {
    const names = keyDetails.map(({ name }) => name);

    const last = names.pop()?.toLocaleLowerCase();

    keyDetails.forEach(({ key }) => {
      ctx.addIssue({
        code: "custom",
        path: [key],

        message: custom(
          "invalid_type_reverse_condition",
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
