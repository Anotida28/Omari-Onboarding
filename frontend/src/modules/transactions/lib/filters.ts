export type TransactionFilters = {
  type: string;
  itemTypeId: string;
  startDate: string;
  endDate: string;
  page: number;
  limit: number;
};

export const DEFAULT_TRANSACTION_FILTERS: TransactionFilters = {
  type: "",
  itemTypeId: "",
  startDate: "",
  endDate: "",
  page: 1,
  limit: 10,
};

export const buildTransactionQueryParams = (
  filters: TransactionFilters,
): URLSearchParams => {
  const params = new URLSearchParams();

  if (filters.type) params.append("type", filters.type);
  if (filters.itemTypeId) params.append("itemTypeId", filters.itemTypeId);
  if (filters.startDate) params.append("startDate", filters.startDate);
  if (filters.endDate) params.append("endDate", filters.endDate);
  params.append("page", filters.page.toString());
  params.append("limit", filters.limit.toString());

  return params;
};
