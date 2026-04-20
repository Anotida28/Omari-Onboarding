import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "lib/utils";

const buttonVariants = cva(
  "app-button inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-semibold transition-all duration-200 ease-out shadow-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 dark:shadow-[0_0_0_1px_rgba(255,255,255,0.06)]",
  {
    variants: {
      variant: {
        default:
          "app-button--default bg-emerald-600 text-white hover:bg-emerald-700 dark:hover:bg-emerald-500",
        destructive:
          "bg-red-600 text-white hover:bg-red-700 dark:hover:bg-red-500",
        outline:
          "app-button--outline border border-border bg-background text-foreground hover:border-emerald-200 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:border-emerald-500/40 dark:hover:text-emerald-300 dark:hover:bg-emerald-500/10",
        secondary:
          "app-button--secondary bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-300 dark:hover:bg-emerald-500/20",
        ghost: "app-button--ghost text-foreground/80 hover:bg-muted/50",
        link: "text-emerald-600 underline-offset-4 hover:underline dark:text-emerald-300",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-lg px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends
    React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
