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

  const definedKeys = keyDetails.filter(({ value }, idx) => (!idx ? true : value));

  if (definedKeys.length > 1) {
    const firstKey = definedKeys[0];
    const otherKeys = definedKeys.slice(1);

    otherKeys.forEach(({ key, name, value }) => {
      if (firstKey.value < value && firstKey.value && value) {
        ctx.addIssue({
          code: "custom",
          path: [key],
          message: custom("invalid_type_major_or_equal_condition", {
            first: tZod(`names.${firstKey.name}`) || firstKey.name,
            second: tZod(`names.${name}`) || name,
          }),
        });
      }
    });
  }
}
