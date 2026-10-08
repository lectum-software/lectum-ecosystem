type ColorBucket = { count: number; r: number; g: number; b: number };

export const dominantAvatarColor = (pixels: Uint8ClampedArray): string | null => {
  const buckets = new Map<number, ColorBucket>();
  let opaque = 0;
  for (let index = 0; index + 3 < pixels.length; index += 4) {
    if (pixels[index + 3] < 128) continue;
    const [r, g, b] = [pixels[index], pixels[index + 1], pixels[index + 2]];
    const key = (r >> 5) * 64 + (g >> 5) * 8 + (b >> 5);
    const bucket = buckets.get(key) ?? { count: 0, r: 0, g: 0, b: 0 };
    bucket.count++;
    bucket.r += r;
    bucket.g += g;
    bucket.b += b;
    buckets.set(key, bucket);
    opaque++;
  }
  const ranked = [...buckets.values()].sort((left, right) => right.count - left.count);
  // Prefer a meaningful colored region to white lettering or a neutral border.
  const selected =
    ranked.find(
      ({ count, r, g, b }) =>
        count >= opaque * 0.05 && (Math.max(r, g, b) - Math.min(r, g, b)) / count >= 24,
    ) ?? ranked[0];
  if (!selected) return null;
  return `#${[selected.r, selected.g, selected.b]
    .map((sum) =>
      Math.round(sum / selected.count)
        .toString(16)
        .padStart(2, "0"),
    )
    .join("")
    .toUpperCase()}`;
};

export const readCommunityAvatarColor = async (file: File): Promise<string | null> => {
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    const canvas = document.createElement("canvas");
    canvas.width = 64;
    canvas.height = 64;
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) return null;
    const size = Math.min(image.naturalWidth, image.naturalHeight);
    context.drawImage(
      image,
      (image.naturalWidth - size) / 2,
      (image.naturalHeight - size) / 2,
      size,
      size,
      0,
      0,
      64,
      64,
    );
    return dominantAvatarColor(context.getImageData(0, 0, 64, 64).data);
  } finally {
    URL.revokeObjectURL(url);
  }
};
