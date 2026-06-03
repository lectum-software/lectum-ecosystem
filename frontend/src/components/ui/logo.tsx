import Image from "next/image";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";

type LogoProps = {
  className?: string;
  priority?: boolean;
};

export function Logo({ className, priority }: LogoProps) {
  const { theme } = useTheme();
  const path = theme === "dark" ? "/logo-dark.png" : "/logo-light.png";
  const APP_NAME = process.env.NEXT_PUBLIC_SYSTEM_NAME || "Lectum";

  // Dimensões intrínsecas reais do asset (500x134): mantêm a proporção e evitam
  // o aviso de aspect-ratio do Next quando o Tailwind aplica height:auto.
  // O tamanho de exibição é controlado por className (largura), com h-auto.
  return (
    <Image
      alt={APP_NAME}
      className={cn("h-auto w-[150px]", className)}
      height={134}
      loading="eager"
      priority={priority}
      src={path}
      width={500}
    />
  );
}
