import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import type * as React from "react";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex h-12 items-center justify-center gap-2 rounded-[var(--lectum-control-radius)] px-5 text-sm font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 disabled:pointer-events-none disabled:opacity-60",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-white shadow-[var(--lectum-shadow-soft)] hover:bg-[#247bd1] focus-visible:outline-primary",
        destructive: "bg-red-600 text-white hover:bg-red-700 focus-visible:outline-red-600",
        outline:
          "border border-border bg-surface text-foreground hover:bg-primary-soft focus-visible:outline-primary",
        ghost:
          "bg-transparent text-muted hover:bg-primary-soft hover:text-foreground focus-visible:outline-primary",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  };

const Button = ({ className, variant, asChild = false, ...props }: ButtonProps) => {
  const Component = asChild ? Slot : "button";

  return <Component className={cn(buttonVariants({ variant, className }))} {...props} />;
};

export { Button, buttonVariants };
