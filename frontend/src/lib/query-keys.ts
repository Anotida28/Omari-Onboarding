export type DateRange = { startDate?: string; endDate?: string };
export type ItemFilter = { itemTypeId?: string };
export type ReportQuery = DateRange &
  ItemFilter & {
    search?: string;
    page?: number;
    limit?: number;
  };
export type TxnFilter = DateRange &
  ItemFilter & {
    type?: "RECEIVE" | "ISSUE" | "REVERSAL" | "ADJUSTMENT";
  };

export const qk = {
  itemTypes: () => ["item-types"] as const,

  dashboard: (filters: DateRange & ItemFilter) =>
    ["reports", "dashboard", filters] as const,

  stockBalance: (filters: ReportQuery) =>
    ["reports", "stock-balance", filters] as const,

  issues: (filters: ReportQuery) =>
    ["reports", "issues", filters] as const,

  receipts: (filters: ReportQuery) =>
    ["reports", "receipts", filters] as const,

  userActivity: (filters: ReportQuery) =>
    ["reports", "user-activity", filters] as const,

  transactions: (
    filters: TxnFilter,
    page: number,
    limit: number,
  ) => ["transactions", filters, page, limit] as const,

  transaction: (id: string | number) => ["transaction", id] as const,

  batches: (itemTypeId?: string | number) =>
    ["cards", "batches", itemTypeId ?? "none"] as const,
} as const;
