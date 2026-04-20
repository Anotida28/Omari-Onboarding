"use client";

import { Button } from "components/ui/button";
import { FilterPanel } from "components/ui/filter-panel";
import { Label } from "components/ui/label";
import { SystemDatePicker } from "components/ui/system-date-picker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "components/ui/select";
import type { TransactionFilters } from "modules/transactions/lib/filters";
import { useCardsCopy } from "lib/cards-copy";

type FilterOption = {
  value: string;
  label: string;
};

type TransactionFiltersProps = {
  filters: TransactionFilters;
  onChange: (filters: TransactionFilters) => void;
  defaultFilters: TransactionFilters;
  typeOptions: FilterOption[];
  itemTypeOptions: FilterOption[];
  allTypeValue: string;
  allItemTypeValue: string;
};

export default function TransactionFiltersPanel({
  filters,
  onChange,
  defaultFilters,
  typeOptions,
  itemTypeOptions,
  allTypeValue,
  allItemTypeValue,
}: TransactionFiltersProps) {
  const copy = useCardsCopy();
  const updateFilters = (patch: Partial<TransactionFilters>) => {
    onChange({ ...filters, ...patch, page: 1 });
  };

  const handleTypeChange = (value: string) => {
    updateFilters({ type: value === allTypeValue ? "" : value });
  };

  const handleItemTypeChange = (value: string) => {
    updateFilters({ itemTypeId: value === allItemTypeValue ? "" : value });
  };

  const handleClear = () => {
    onChange({ ...defaultFilters });
  };

  return (
    <FilterPanel
      title="Refine Transaction View"
      description="Filter the operational history by type, card type, and date range."
      footer={(
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            End date includes the full selected day.
          </p>
          <Button variant="outline" onClick={handleClear}>
            Clear Filters
          </Button>
        </div>
      )}
    >
        <div className="grid gap-4 md:grid-cols-4">
          <div className="space-y-2">
            <Label>Transaction Type</Label>
            <Select
              value={filters.type || allTypeValue}
              onValueChange={handleTypeChange}
            >
              <SelectTrigger>
                <SelectValue placeholder="All types" />
              </SelectTrigger>
              <SelectContent>
                {typeOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>{copy.itemTypeLabel}</Label>
            <Select
              value={filters.itemTypeId || allItemTypeValue}
              onValueChange={handleItemTypeChange}
            >
              <SelectTrigger>
                <SelectValue placeholder={copy.itemTypeAllLabel} />
              </SelectTrigger>
              <SelectContent>
                {itemTypeOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Start Date</Label>
            <SystemDatePicker
              value={filters.startDate}
              onChange={(startDate) => updateFilters({ startDate })}
              label="Start Date"
              placeholder="Select start date"
            />
          </div>

          <div className="space-y-2">
            <Label>End Date</Label>
            <SystemDatePicker
              value={filters.endDate}
              onChange={(endDate) => updateFilters({ endDate })}
              label="End Date"
              placeholder="Select end date"
            />
          </div>
        </div>
    </FilterPanel>
  );
}
