import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import type * as React from "react";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex h-11 items-center justify-center gap-2 rounded-md px-4 text-sm font-medium transition focus-visible:outline-2 focus-visible:outline-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-zinc-950 text-white hover:bg-zinc-800 focus-visible:outline-zinc-950",
        destructive: "bg-red-600 text-white hover:bg-red-700 focus-visible:outline-red-600",
        outline:
          "border border-zinc-200 bg-white text-zinc-950 hover:bg-zinc-50 focus-visible:outline-zinc-400",
        ghost: "bg-transparent text-zinc-700 hover:bg-zinc-100 focus-visible:outline-zinc-400",
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
