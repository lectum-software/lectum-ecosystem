type DonutCountItem = { count: number };

export const buildDonutCircleSegments = <T extends DonutCountItem>(
  items: readonly T[],
  total: number,
  radius: number,
) => {
  const circumference = 2 * Math.PI * radius;
  const visibleItems = items.filter((item) => item.count > 0);
  let cumulativeDash = 0;
  const segments = visibleItems.map((item) => {
    const dash = (total > 0 ? item.count / total : 0) * circumference;
    const segment = {
      dash,
      item,
      strokeDashoffset: -cumulativeDash,
    };
    cumulativeDash += dash;
    return segment;
  });

  return { circumference, segments, visibleItems };
};

export const getPiePoint = (center: number, radius: number, angleInDegrees: number) => {
  const angleInRadians = (Math.PI / 180) * angleInDegrees;

  return {
    x: center + radius * Math.cos(angleInRadians),
    y: center + radius * Math.sin(angleInRadians),
  };
};

export const buildPieSlicePath = (
  center: number,
  radius: number,
  startAngle: number,
  endAngle: number,
) => {
  const start = getPiePoint(center, radius, startAngle);
  const end = getPiePoint(center, radius, endAngle);
  const largeArcFlag = endAngle - startAngle > 180 ? 1 : 0;

  return [
    `M ${center} ${center}`,
    `L ${start.x} ${start.y}`,
    `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${end.x} ${end.y}`,
    "Z",
  ].join(" ");
};
