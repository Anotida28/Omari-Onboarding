import { Card, CardContent, CardHeader, CardTitle } from "components/ui/card";
import { LucideIcon } from "lucide-react";
import { cn } from "lib/utils";

interface StatCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon?: LucideIcon;
  trend?: {
    value: string;
    isPositive: boolean;
  };
  className?: string;
}

export function StatCard({
  title,
  value,
  description,
  icon: Icon,
  trend,
  className,
}: StatCardProps) {
  return (
    <Card
      className={cn(
        "transition-shadow hover:shadow-md dark:hover:shadow-[0_0_0_1px_rgba(255,255,255,0.12)]",
        className,
      )}
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="app-stat-card__title text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        {Icon && <Icon className="h-5 w-5 text-muted-foreground" />}
      </CardHeader>
      <CardContent>
        <div className="app-stat-card__value text-2xl font-semibold text-foreground">
          {value}
        </div>
        {description && (
          <p className="mt-1 text-xs text-muted-foreground">{description}</p>
        )}
        {trend && (
          <p
            className={cn(
              "app-stat-card__trend mt-1.5 text-xs font-medium",
              trend.isPositive
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-red-600 dark:text-red-400",
            )}
          >
            <span aria-hidden="true">{trend.isPositive ? "+" : "-"}</span>
            <span>{trend.value}</span>
          </p>
        )}
      </CardContent>
    </Card>
  );
}
