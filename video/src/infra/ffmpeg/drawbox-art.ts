const drawBox = ({
  color,
  height,
  width,
  x,
  y,
}: {
  color: string;
  height: number;
  width: number;
  x: number;
  y: number;
}) => `drawbox=x=${x}:y=${y}:w=${width}:h=${height}:color=${color}:t=fill`;

type RoundedRectCorners = "all" | "bottom" | "top";

const roundedRectInset = (radius: number, offset: number, stripHeight: number) => {
  const center = Math.min(radius, offset + stripHeight / 2);
  const distanceFromCenter = radius - center;
  const chord = Math.sqrt(Math.max(0, radius ** 2 - distanceFromCenter ** 2));

  return Math.max(0, Math.ceil(radius - chord));
};

export const roundedRectDrawBoxes = ({
  color,
  corners = "all",
  height,
  radius,
  sliceHeight = 4,
  width,
  x,
  y,
}: {
  color: string;
  corners?: RoundedRectCorners;
  height: number;
  radius: number;
  sliceHeight?: number;
  width: number;
  x: number;
  y: number;
}) => {
  const hasTopCorners = corners === "all" || corners === "top";
  const hasBottomCorners = corners === "all" || corners === "bottom";
  const topInsetHeight = hasTopCorners ? radius : 0;
  const bottomInsetHeight = hasBottomCorners ? radius : 0;
  const filters: string[] = [];
  const middleHeight = height - topInsetHeight - bottomInsetHeight;

  if (middleHeight > 0) {
    filters.push(
      drawBox({
        color,
        height: middleHeight,
        width,
        x,
        y: y + topInsetHeight,
      }),
    );
  }

  if (hasTopCorners) {
    for (let offset = 0; offset < radius; offset += sliceHeight) {
      const segmentHeight = Math.min(sliceHeight, radius - offset);
      const inset = roundedRectInset(radius, offset, segmentHeight);
      filters.push(
        drawBox({
          color,
          height: segmentHeight,
          width: width - inset * 2,
          x: x + inset,
          y: y + offset,
        }),
      );
    }
  }

  if (hasBottomCorners) {
    for (let offset = 0; offset < radius; offset += sliceHeight) {
      const segmentHeight = Math.min(sliceHeight, radius - offset);
      const inset = roundedRectInset(radius, radius - offset - segmentHeight, segmentHeight);
      filters.push(
        drawBox({
          color,
          height: segmentHeight,
          width: width - inset * 2,
          x: x + inset,
          y: y + height - radius + offset,
        }),
      );
    }
  }

  return filters;
};

export const lectumLogoMarkDrawBoxes = ({
  backgroundColor,
  color,
  height,
  width,
  x,
  y,
}: {
  backgroundColor: string;
  color: string;
  height: number;
  width: number;
  x: number;
  y: number;
}) => {
  const unit = Math.max(1, Math.round(width / 34));
  const stroke = unit * 3;
  const leftHeadSize = Math.round(width * 0.38);
  const rightHeadSize = Math.round(width * 0.32);
  const leftHeadX = x + unit;
  const leftHeadY = y;
  const rightHeadX = x + Math.round(width * 0.55);
  const rightHeadY = y + Math.round(height * 0.1);

  return [
    ...roundedRectDrawBoxes({
      color,
      height: leftHeadSize,
      radius: Math.floor(leftHeadSize / 2),
      sliceHeight: 2,
      width: leftHeadSize,
      x: leftHeadX,
      y: leftHeadY,
    }),
    ...roundedRectDrawBoxes({
      color: backgroundColor,
      height: leftHeadSize - stroke * 2,
      radius: Math.floor((leftHeadSize - stroke * 2) / 2),
      sliceHeight: 2,
      width: leftHeadSize - stroke * 2,
      x: leftHeadX + stroke,
      y: leftHeadY + stroke,
    }),
    ...roundedRectDrawBoxes({
      color,
      height: rightHeadSize,
      radius: Math.floor(rightHeadSize / 2),
      sliceHeight: 2,
      width: rightHeadSize,
      x: rightHeadX,
      y: rightHeadY,
    }),
    ...roundedRectDrawBoxes({
      color: backgroundColor,
      height: rightHeadSize - stroke * 2,
      radius: Math.floor((rightHeadSize - stroke * 2) / 2),
      sliceHeight: 2,
      width: rightHeadSize - stroke * 2,
      x: rightHeadX + stroke,
      y: rightHeadY + stroke,
    }),
    drawBox({
      color,
      height: Math.round(height * 0.46),
      width: stroke,
      x,
      y: y + Math.round(height * 0.53),
    }),
    drawBox({
      color,
      height: stroke,
      width: Math.round(width * 0.64),
      x: x + Math.round(width * 0.1),
      y: y + Math.round(height * 0.53),
    }),
    drawBox({
      color,
      height: Math.round(height * 0.46),
      width: stroke,
      x: x + Math.round(width * 0.74),
      y: y + Math.round(height * 0.53),
    }),
    drawBox({
      color,
      height: Math.round(height * 0.55),
      width: stroke,
      x: x + Math.round(width * 0.9),
      y: y + Math.round(height * 0.45),
    }),
  ];
};
