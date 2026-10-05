import { Heart } from "lucide-react";
import { cn } from "@/lib/utils";

export const FavoriteHeart = ({
  active = false,
  className,
}: {
  active?: boolean;
  className?: string;
}) => (
  <Heart
    aria-hidden="true"
    strokeWidth={2}
    className={cn(
      "h-5 w-5 transition-[fill,color] duration-200 motion-reduce:transition-none",
      active ? "fill-current text-favorite" : "fill-none",
      className,
    )}
  />
);
