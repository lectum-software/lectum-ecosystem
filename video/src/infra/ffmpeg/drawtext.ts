// FFmpeg parses a filtergraph, then parses each drawtext option. Escape both
// grammars; a backslash-escaped quote inside a graph quote is not sufficient.
export const quoteDrawTextValue = (value: string) => {
  const optionValue = value.replace(/[\\':]/gu, "\\$&");
  return `'${optionValue.replace(/'/gu, "'\\''")}'`;
};
