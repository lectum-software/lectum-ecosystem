// FFmpeg parses a filtergraph, then parses each drawtext option. Escape both
// grammars; a backslash-escaped quote inside a graph quote is not sufficient.
export const quoteDrawTextValue = (value: string) => {
  const optionValue = value.replace(/[\\':]/gu, "\\$&");
  return `'${optionValue.replace(/'/gu, "'\\''")}'`;
};

export const drawText = ({
  color,
  fontFile,
  fontSize,
  shadow = false,
  text,
  x,
  y,
}: {
  color: string;
  fontFile?: string | null;
  fontSize: number;
  shadow?: boolean;
  text: string;
  x: string | number;
  y: string | number;
}) =>
  `drawtext=${[
    `text=${quoteDrawTextValue(text)}`,
    ...(fontFile ? [`fontfile=${quoteDrawTextValue(fontFile)}`] : []),
    "expansion=none",
    `x=${x}`,
    `y=${y}`,
    `fontsize=${fontSize}`,
    `fontcolor=${color}`,
    ...(shadow ? ["shadowcolor=black@0.28", "shadowx=0", "shadowy=2"] : []),
  ].join(":")}`;
