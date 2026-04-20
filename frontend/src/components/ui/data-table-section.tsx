import { ReactNode } from "react";

import { cn } from "lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "components/ui/card";

interface DataTableSectionProps {
  title: string;
  description?: string;
  toolbar?: ReactNode;
  summary?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
}

export function DataTableSection({
  title,
  description,
  toolbar,
  summary,
  footer,
  children,
  className,
  contentClassName,
}: DataTableSectionProps) {
  return (
    <Card className={cn("app-data-section", className)}>
      <CardHeader className="app-data-section__header">
        <div className="app-data-section__intro">
          <CardTitle>{title}</CardTitle>
          {description && (
            <p className="text-sm text-muted-foreground">{description}</p>
          )}
        </div>
        {toolbar && <div className="app-data-section__toolbar">{toolbar}</div>}
      </CardHeader>
      <CardContent className={cn("app-data-section__content", contentClassName)}>
        {summary && <div className="app-data-section__summary">{summary}</div>}
        {children}
        {footer}
      </CardContent>
    </Card>
  );
}
