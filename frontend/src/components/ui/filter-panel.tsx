import { ReactNode } from "react";

import { cn } from "lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "components/ui/card";

interface FilterPanelProps {
  title?: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
  contentClassName?: string;
}

export function FilterPanel({
  title = "Filters",
  description,
  children,
  footer,
  className,
  contentClassName,
}: FilterPanelProps) {
  return (
    <Card className={cn("app-filter-panel", className)}>
      <CardHeader className="app-filter-panel__header">
        <div className="space-y-1">
          <CardTitle>{title}</CardTitle>
          {description && (
            <p className="text-sm text-muted-foreground">{description}</p>
          )}
        </div>
      </CardHeader>
      <CardContent className={cn("app-filter-panel__content", contentClassName)}>
        {children}
        {footer && <div className="app-filter-panel__footer">{footer}</div>}
      </CardContent>
    </Card>
  );
}
