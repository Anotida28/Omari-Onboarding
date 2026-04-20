import { ReactNode } from "react";

import { cn } from "lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "components/ui/card";

interface WorkflowSectionProps {
  step: number | string;
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
}

interface WorkflowSummaryCardProps {
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
}

export function WorkflowSection({
  step,
  title,
  description,
  action,
  children,
  className,
  contentClassName,
}: WorkflowSectionProps) {
  return (
    <Card className={cn("app-workflow-section", className)}>
      <CardHeader className="app-workflow-section__header">
        <div className="app-workflow-section__intro">
          <span className="app-workflow-step">Step {step}</span>
          <div className="space-y-1">
            <CardTitle>{title}</CardTitle>
            {description && (
              <p className="text-sm text-muted-foreground">{description}</p>
            )}
          </div>
        </div>
        {action && <div className="app-workflow-section__action">{action}</div>}
      </CardHeader>
      <CardContent className={cn("app-workflow-section__content", contentClassName)}>
        {children}
      </CardContent>
    </Card>
  );
}

export function WorkflowSummaryCard({
  title,
  description,
  children,
  footer,
  className,
}: WorkflowSummaryCardProps) {
  return (
    <Card className={cn("app-workflow-summary lg:sticky lg:top-24", className)}>
      <CardHeader className="app-workflow-summary__header">
        <div className="space-y-1">
          <CardTitle>{title}</CardTitle>
          {description && (
            <p className="text-sm text-muted-foreground">{description}</p>
          )}
        </div>
      </CardHeader>
      <CardContent className="app-workflow-summary__content">
        {children}
        {footer && <div className="app-workflow-summary__footer">{footer}</div>}
      </CardContent>
    </Card>
  );
}

export function WorkflowActionBar({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={cn("app-workflow-action-bar", className)}>{children}</div>;
}
