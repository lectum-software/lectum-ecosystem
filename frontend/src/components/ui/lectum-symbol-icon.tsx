import type { SVGProps } from "react";

type LectumSymbolIconProps = SVGProps<SVGSVGElement> & {
  title?: string;
};

export function LectumSymbolIcon({ title = "Símbolo Lectum", ...props }: LectumSymbolIconProps) {
  return (
    <svg fill="none" viewBox="0 0 256 256" xmlns="http://www.w3.org/2000/svg" {...props}>
      <title>{title}</title>
      <path
        d="M118.9 130.3C91.7 127.4 70.5 104.5 70.5 76.6C70.5 46.7 94.7 22.5 124.6 22.5C154.5 22.5 178.7 46.7 178.7 76.6C178.7 92 172.3 105.9 162 115.8"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="18"
      />
      <path
        d="M164.6 66.1C174.2 55.7 187.9 49.2 203 49.2C231.2 49.2 254 72 254 100.2C254 128.4 231.2 151.2 203 151.2C191.1 151.2 180.2 147.1 171.5 140.3"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="18"
        transform="translate(-34 10)"
      />
      <path
        d="M51.4 151.2C31.3 167.4 20 191.1 20 217V237"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="18"
      />
      <path
        d="M103.4 132.7C132.9 136.9 155.6 162.3 155.6 192.9V237"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="18"
      />
      <path
        d="M181.1 151.7C203 164.9 217.6 188.9 217.6 216.3V231.3"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="18"
      />
      <path d="M156.9 126.2L173.6 109.5L190.3 126.2L173.6 142.9L156.9 126.2Z" fill="currentColor" />
    </svg>
  );
}
