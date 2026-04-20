import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "lib/utils";

const badgeVariants = cva(
  "app-badge inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 ring-offset-background",
  {
    variants: {
      variant: {
        default:
          "app-badge--default border-emerald-200/60 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300 dark:hover:bg-emerald-500/20",
        secondary:
          "border-border bg-muted text-muted-foreground hover:bg-muted/80 dark:hover:bg-muted/60",
        destructive:
          "border-destructive/30 bg-destructive/10 text-destructive hover:bg-destructive/20",
        outline: "border-border text-foreground/80",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps
  extends
    React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
