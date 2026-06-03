import { cn } from "@/lib/utils";

type LogoProps = {
  className?: string;
  markClassName?: string;
  textClassName?: string;
};

export function Logo({ className, markClassName, textClassName }: LogoProps) {
  return (
    <div aria-label="Lectum" className={cn("inline-flex items-end gap-1.5", className)} role="img">
      <span
        aria-hidden="true"
        className={cn(
          "relative mb-1 inline-block h-9 w-6 rounded-b-[3px] rounded-t-sm bg-primary",
          "before:absolute before:bottom-0 before:left-0 before:h-2 before:w-9 before:rounded-sm before:bg-primary",
          markClassName,
        )}
      />
      <span
        className={cn(
          "text-[42px] font-semibold leading-none tracking-normal text-[#020617]",
          textClassName,
        )}
      >
        ectum
      </span>
    </div>
  );
}
