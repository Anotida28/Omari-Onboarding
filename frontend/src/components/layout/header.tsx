"use client";

import { useUser } from "lib/user-context";
import { ThemeToggle } from "components/theme-toggle";
import { useCardsCopy } from "lib/cards-copy";

export default function Header() {
  const { user } = useUser();
  const copy = useCardsCopy();

  return (
    <header className="app-header-bar z-40 flex h-16 shrink-0 items-center justify-between border-b border-border bg-card px-6 shadow-sm dark:shadow-[0_0_0_1px_rgba(255,255,255,0.04)]">
      <div className="flex items-center gap-4">
        <h1 className="text-lg font-semibold text-foreground">
          Omari - {copy.systemName}
        </h1>
      </div>
      <div className="flex items-center gap-4">
        <div className="hidden text-right sm:block">
          <p className="text-sm font-medium text-foreground">
            {user?.fullname || user?.username || ""}
          </p>
        </div>
        <ThemeToggle />
      </div>
    </header>
  );
}
