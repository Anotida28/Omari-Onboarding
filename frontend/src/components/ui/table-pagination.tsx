"use client";

import { Button } from "components/ui/button";

type TablePaginationProps = {
  page: number;
  limit: number;
  total: number;
  itemLabel: string;
  onPageChange: (nextPage: number) => void;
};

export function TablePagination({
  page,
  limit,
  total,
  itemLabel,
  onPageChange,
}: TablePaginationProps) {
  const totalPages = Math.max(Math.ceil(total / limit), 1);
  const safePage = Math.min(page, totalPages);
  const start = total === 0 ? 0 : (safePage - 1) * limit + 1;
  const end = total === 0 ? 0 : Math.min(safePage * limit, total);

  if (total === 0) {
    return null;
  }

  return (
    <div className="app-table-pagination mt-4">
      <p className="app-table-pagination__meta text-sm text-muted-foreground">
        Showing {start} to {end} of {total} {itemLabel}
      </p>
      <div className="app-table-pagination__actions">
        <span className="app-table-pagination__page">
          Page {safePage} of {totalPages}
        </span>
        <Button
          variant="outline"
          size="sm"
          disabled={safePage === 1}
          onClick={() => onPageChange(safePage - 1)}
        >
          Previous
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={safePage >= totalPages}
          onClick={() => onPageChange(safePage + 1)}
        >
          Next
        </Button>
      </div>
    </div>
  );
}
