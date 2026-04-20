"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { Button } from "components/ui/button";
import { cn } from "lib/utils";

const THEME_STORAGE_KEY = "omari-theme";

type ThemeMode = "light" | "dark";

function applyTheme(theme: ThemeMode) {
  const root = document.documentElement;
  root.classList.toggle("dark", theme === "dark");
  root.style.colorScheme = theme;
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<ThemeMode | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    const storedTheme =
      stored === "light" || stored === "dark" ? stored : null;
    const prefersDark = window.matchMedia?.(
      "(prefers-color-scheme: dark)",
    )?.matches;
    const initial = storedTheme ?? (prefersDark ? "dark" : "light");

    setTheme(initial);
    applyTheme(initial);
  }, []);

  const toggleTheme = () => {
    if (!theme) return;
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    applyTheme(nextTheme);
    localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
  };

  const isReady = theme !== null;
  const isDark = theme === "dark";
  const label = isDark ? "Switch to light mode" : "Switch to dark mode";

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      onClick={toggleTheme}
      aria-label={label}
      aria-pressed={isDark}
      title={label}
      className={cn(
        "h-9 w-9 rounded-full border border-transparent transition-colors",
        "hover:border-emerald-200 dark:text-foreground/80 dark:hover:bg-muted/60 dark:hover:border-border",
        !isReady && "pointer-events-none opacity-0",
      )}
    >
      {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </Button>
  );
}
