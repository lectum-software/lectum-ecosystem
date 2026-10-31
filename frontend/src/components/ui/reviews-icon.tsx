import { MessageCircle, Star } from "lucide-react";
import type { SVGProps } from "react";

export const ReviewsIcon = (props: SVGProps<SVGSVGElement>) => (
  <MessageCircle {...props}>
    <title>Depoimentos</title>
    <g transform="translate(6 6) scale(0.5)">
      <Star aria-hidden className="size-6" style={{ width: 24, height: 24 }} fill="currentColor" />
    </g>
  </MessageCircle>
);
