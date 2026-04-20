"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  addDays,
  addMonths,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  parseISO,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import { CalendarDays, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "components/ui/button";
import { cn } from "lib/utils";

type SystemDatePickerProps = {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
};

const isValidDateValue = (value: string) => {
  if (!value) return false;
  const parsed = new Date(`${value}T00:00:00`);
  return !Number.isNaN(parsed.getTime());
};

const toDate = (value: string) => new Date(`${value}T00:00:00`);

export function SystemDatePicker({
  id,
  value,
  onChange,
  label = "Choose date",
  placeholder = "Select a date",
  disabled = false,
  className,
}: SystemDatePickerProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [displayMonth, setDisplayMonth] = useState(() =>
    isValidDateValue(value) ? startOfMonth(toDate(value)) : startOfMonth(new Date()),
  );

  const selectedDate = useMemo(
    () => (isValidDateValue(value) ? parseISO(value) : null),
    [value],
  );

  useEffect(() => {
    if (selectedDate) {
      setDisplayMonth(startOfMonth(selectedDate));
    }
  }, [selectedDate]);

  useEffect(() => {
    if (!isOpen) return;

    const handleDocumentMouseDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleDocumentMouseDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handleDocumentMouseDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const calendarDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(displayMonth), { weekStartsOn: 0 });
    const end = endOfWeek(endOfMonth(displayMonth), { weekStartsOn: 0 });
    const days: Date[] = [];

    for (let day = start; day <= end; day = addDays(day, 1)) {
      days.push(day);
    }

    return days;
  }, [displayMonth]);

  const formattedValue = selectedDate ? format(selectedDate, "dd/MM/yyyy") : "";
  const dayLabels = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

  const selectDate = (date: Date) => {
    onChange(format(date, "yyyy-MM-dd"));
    setDisplayMonth(startOfMonth(date));
    setIsOpen(false);
  };

  const clearDate = () => {
    onChange("");
    setIsOpen(false);
  };

  const jumpToToday = () => {
    selectDate(new Date());
  };

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <button
        id={id}
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen((current) => !current)}
        className={cn(
          "app-field flex h-11 w-full items-center justify-between rounded-md border border-input bg-background px-3 text-left text-sm text-foreground shadow-sm ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:bg-muted/40 disabled:text-muted-foreground dark:shadow-[0_0_0_1px_rgba(255,255,255,0.06)]",
          !formattedValue && "text-muted-foreground",
        )}
        aria-label={label}
        aria-expanded={isOpen}
      >
        <span className="flex min-w-0 items-center gap-2">
          <CalendarDays className="h-4 w-4 shrink-0 text-muted-foreground" />
          <span className="truncate">{formattedValue || placeholder}</span>
        </span>
        <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
      </button>

      {isOpen && !disabled && (
        <div
          className="absolute left-0 top-full z-50 mt-2 overflow-hidden rounded-xl border border-border bg-popover p-3 text-popover-foreground shadow-2xl dark:shadow-[0_0_0_1px_rgba(255,255,255,0.06),0_16px_40px_rgba(0,0,0,0.55)]"
          style={{ width: "16.5rem", maxWidth: "calc(100vw - 2rem)" }}
        >
          <div className="mb-3 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => setDisplayMonth((current) => subMonths(current, 1))}
              className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border bg-background text-foreground shadow-sm transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-1"
              aria-label="Previous month"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>

            <div className="text-center">
              <p className="text-lg font-semibold text-foreground">
                {format(displayMonth, "MMMM yyyy")}
              </p>
              <p className="text-[11px] text-muted-foreground">Pick a date</p>
            </div>

            <button
              type="button"
              onClick={() => setDisplayMonth((current) => addMonths(current, 1))}
              className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border bg-background text-foreground shadow-sm transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-1"
              aria-label="Next month"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <div
            className="grid gap-0.5 text-center text-[11px] font-semibold uppercase tracking-widest text-muted-foreground"
            style={{ gridTemplateColumns: "repeat(7, minmax(0, 1fr))" }}
          >
            {dayLabels.map((dayLabel) => (
              <div key={dayLabel} className="py-1">
                {dayLabel}
              </div>
            ))}
          </div>

          <div
            className="mt-1.5 grid gap-0.5"
            style={{ gridTemplateColumns: "repeat(7, minmax(0, 1fr))" }}
          >
            {calendarDays.map((day) => {
              const isSelected = selectedDate ? isSameDay(day, selectedDate) : false;
              const isCurrentMonth = isSameMonth(day, displayMonth);
              const isCurrentDay = isSameDay(day, new Date());

              return (
                <button
                  key={day.toISOString()}
                  type="button"
                  onClick={() => selectDate(day)}
                  className={cn(
                    "flex h-8 items-center justify-center rounded-md border text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-1",
                    isSelected
                      ? "border-emerald-600 bg-emerald-600 text-white shadow-sm dark:border-emerald-500 dark:bg-emerald-500 dark:text-emerald-950"
                      : "border-transparent bg-background hover:border-border hover:bg-muted/60",
                    !isCurrentMonth && "text-muted-foreground/60",
                    isCurrentDay && !isSelected && "border-emerald-200 text-emerald-700 dark:border-emerald-500/30 dark:text-emerald-300",
                  )}
                  aria-label={format(day, "EEEE, MMMM d, yyyy")}
                >
                  {format(day, "d")}
                </button>
              );
            })}
          </div>

          <div className="mt-3 flex items-center justify-between gap-2 border-t border-border pt-2.5">
            <Button variant="ghost" size="sm" type="button" onClick={clearDate}>
              Clear
            </Button>
            <Button variant="outline" size="sm" type="button" onClick={jumpToToday}>
              Today
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
