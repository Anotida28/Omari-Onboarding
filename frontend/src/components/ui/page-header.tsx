import { ReactNode } from "react";

interface PageHeaderProps {
  title: string;
  description?: string;
  action?: ReactNode;
}

export function PageHeader({ title, description, action }: PageHeaderProps) {
  return (
    <div className="app-page-header mb-8 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="app-page-title text-3xl font-semibold text-foreground">
          {title}
        </h1>
        {description && (
          <p className="app-page-description mt-1.5 text-sm text-muted-foreground">
            {description}
          </p>
        )}
      </div>
      {action && <div className="mt-4 sm:mt-0">{action}</div>}
    </div>
  );
}
