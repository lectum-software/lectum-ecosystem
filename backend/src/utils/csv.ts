const CSV_FORMULA_PREFIX = /^[\s]*[=+\-@]/;

export const csvCell = (value: unknown) => {
  const normalized = value === null || value === undefined ? "" : String(value);
  const formulaSafe =
    typeof value === "string" && CSV_FORMULA_PREFIX.test(normalized)
      ? `'${normalized}`
      : normalized;

  return `"${formulaSafe.replace(/"/g, '""')}"`;
};

export const csvRow = (values: readonly unknown[]) => values.map(csvCell).join(",");
