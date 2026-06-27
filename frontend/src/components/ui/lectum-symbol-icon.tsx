import type { SVGProps } from "react";

type LectumSymbolIconProps = SVGProps<SVGSVGElement> & {
  title?: string;
};

export function LectumSymbolIcon({
  title = "S\u00edmbolo Lectum",
  ...props
}: LectumSymbolIconProps) {
  return (
    <svg fill="none" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg" {...props}>
      <title>{title}</title>
      <path
        d="M20 22C13.9 22 9 17.1 9 11S13.9 0 20 0s11 4.9 11 11-4.9 11-11 11Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="4"
      />
      <path
        d="M33.5 21C28.8 21 25 17.2 25 12.5S28.8 4 33.5 4 42 7.8 42 12.5 38.2 21 33.5 21Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="4"
      />
      <path
        d="M5 47V39.5C5 30.9 11.7 24 20 24s15 6.9 15 15.5V47"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="4"
      />
      <path
        d="M32 25c6.5 1.2 11 7.2 11 14.4V47"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="4"
      />
    </svg>
  );
}
