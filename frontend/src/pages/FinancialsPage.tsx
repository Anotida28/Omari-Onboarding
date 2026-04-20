
"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { DataTableSection } from "../components/ui/data-table-section";
import { Button } from "../components/ui/button";
import { FilterPanel } from "../components/ui/filter-panel";
import { Label } from "../components/ui/label";
import { Input } from "../components/ui/input";
import { SystemDatePicker } from "../components/ui/system-date-picker";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "../components/ui/select";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "../components/ui/table";
import { TablePagination } from "../components/ui/table-pagination";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../components/ui/tabs";
import { Badge } from "../components/ui/badge";
import { StatCard } from "../components/ui/stat-card";
import { PageHeader } from "../components/ui/page-header";
import { DollarSign, Wallet, TrendingUp, TrendingDown, Package, BarChart3, Check, X, Edit } from "lucide-react";
import { apiRequest } from "../services/api";
import { useCardsCopy } from "../lib/cards-copy";
import { Tooltip, Legend, ResponsiveContainer, BarChart, CartesianGrid, XAxis, YAxis, Bar } from "recharts";
import { qk } from "lib/query-keys";
import { syncUnitTotal } from "lib/money-sync";

// Dashboard data types
type DashboardTotals = {
  totalReceivedQty: number;
  totalReceivedCost: number;
  avgReceiveCost: number;
  totalIssuedQty: number;
  totalIssuedRevenue: number;
  avgIssuePrice: number;
  estimatedProfit: number;
  profitMargin: number;
  stockValue?: number;
  estimatedCardValue?: number;
  outstandingCardQty?: number;
};
type DashboardByItemType = {
  itemType: { id: number; name: string; code: string };
  receivedQty: number;
  receivedCost: number;
  issuedQty: number;
  issuedRevenue: number;
  balance: number;
  avgUnitCost: number;
  avgUnitPrice: number;
  profit: number;
  stockValue: number;
};
type DashboardChartData = {
  date?: string;
  receivedCost?: number;
  issuedRevenue?: number;
  profit?: number;
  month?: string;
  cost?: number;
  revenue?: number;
};
type DashboardRecent = {
  receipts: Array<{
    id: number;
    type: "RECEIVE";
    itemType: { id: number; name: string; code: string };
    status: "POSTED" | "REVERSED";
    qty: number;
    unitCost: number | null;
    totalCost: number | null;
    calculatedTotalCost?: number;
    createdAt: string;
  }>;
  issues: Array<{
    id: number;
    type: "ISSUE";
    itemType: { id: number; name: string; code: string };
    status: "POSTED" | "REVERSED";
    qty: number;
    unitPrice: number | null;
    totalPrice: number | null;
    calculatedTotalPrice?: number;
    createdAt: string;
  }>;
};
type DashboardData = {
  totals: DashboardTotals;
  byItemType: DashboardByItemType[];
  chartData: DashboardChartData[];
  recent: DashboardRecent;
};

type FinancialTransaction = {
  id: number;
  type: "RECEIVE" | "ISSUE";
  status: "POSTED" | "REVERSED";
  createdAt: string;
  qty: number;
  unitCost: number | null;
  totalCost: number | null;
  unitPrice: number | null;
  totalPrice: number | null;
  itemType: {
    id: number;
    name: string;
    code: string;
  };
};

type FinancialTransactionsData = {
  transactions: FinancialTransaction[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

// Option constant for item type filter
const ALL_ITEM_OPTION = "ALL_ITEM_TYPES";

type ItemType = {
  id: number;
  name: string;
  code: string;
};

export default function FinancialsPage() {
  
  const queryClient = useQueryClient();
  const copy = useCardsCopy();

  const [dateRange, setDateRange] = useState({
    startDate: "",
    endDate: "",
  });
  const [itemTypeFilter, setItemTypeFilter] = useState("");
  const [byItemTypeSearch, setByItemTypeSearch] = useState("");
  const [transactionsPage, setTransactionsPage] = useState(1);
  const TRANSACTIONS_PAGE_SIZE = 10;
  const [byItemTypePage, setByItemTypePage] = useState(1);
  const BY_ITEM_PAGE_SIZE = 10;

  // Editing state
  const [editingTransaction, setEditingTransaction] = useState<{
    id: number;
    type: "RECEIVE" | "ISSUE";
    qty: string;
    unitValue: string;
    totalValue: string;
  } | null>(null);

  const dashboardFilters = useMemo(
    () => ({
      startDate: dateRange.startDate || "",
      endDate: dateRange.endDate || "",
      itemTypeId:
        itemTypeFilter && itemTypeFilter !== ALL_ITEM_OPTION
          ? itemTypeFilter
          : "",
    }),
    [dateRange.startDate, dateRange.endDate, itemTypeFilter],
  );

  // Fetch item types for filter
  const { data: itemTypes = [] } = useQuery<ItemType[]>({
    queryKey: qk.itemTypes(),
    queryFn: async () => {
      const response = await apiRequest<{ itemTypes: ItemType[] }>(
        "/api/item-types",
      );
      return response.itemTypes;
    },
  });

  // Build query params
  const queryParams = useMemo(() => {
    const params = new URLSearchParams();
    if (dateRange.startDate) params.append("startDate", dateRange.startDate);
    if (dateRange.endDate) params.append("endDate", dateRange.endDate);
    if (itemTypeFilter && itemTypeFilter !== ALL_ITEM_OPTION) {
      params.append("itemTypeId", itemTypeFilter);
    }
    return params.toString();
  }, [dateRange, itemTypeFilter]);

  // Fetch dashboard data
  const { data: dashboardData, isLoading } = useQuery<DashboardData>({
    queryKey: qk.dashboard(dashboardFilters),
    queryFn: () =>
      apiRequest<DashboardData>(`/api/reports/dashboard?${queryParams}`),
    refetchInterval: 30000, // Refresh every 30 seconds for real-time view
  });

  const financialTransactionsQuery = useMemo(() => {
    const params = new URLSearchParams();
    if (dateRange.startDate) params.append("startDate", dateRange.startDate);
    if (dateRange.endDate) params.append("endDate", dateRange.endDate);
    if (itemTypeFilter && itemTypeFilter !== ALL_ITEM_OPTION) {
      params.append("itemTypeId", itemTypeFilter);
    }
    params.append("types", "RECEIVE,ISSUE");
    params.append("page", String(transactionsPage));
    params.append("limit", String(TRANSACTIONS_PAGE_SIZE));
    return params.toString();
  }, [dateRange.endDate, dateRange.startDate, itemTypeFilter, transactionsPage]);

  const { data: financialTransactionsData } = useQuery<FinancialTransactionsData>({
    queryKey: [
      "transactions",
      "financial",
      {
        startDate: dateRange.startDate || "",
        endDate: dateRange.endDate || "",
        itemTypeId:
          itemTypeFilter && itemTypeFilter !== ALL_ITEM_OPTION
            ? itemTypeFilter
            : "",
        page: transactionsPage,
        limit: TRANSACTIONS_PAGE_SIZE,
        types: "RECEIVE,ISSUE",
      },
    ],
    queryFn: () =>
      apiRequest<FinancialTransactionsData>(
        `/api/transactions?${financialTransactionsQuery}`,
      ),
  });

  useEffect(() => {
    setTransactionsPage(1);
  }, [dateRange.startDate, dateRange.endDate, itemTypeFilter]);

  useEffect(() => {
    setByItemTypePage(1);
  }, [byItemTypeSearch, dateRange.startDate, dateRange.endDate, itemTypeFilter]);

  // Update transaction mutation
  const updateMutation = useMutation({
    mutationFn: async ({
      id,
      type,
      qty,
      unitValue,
      totalValue,
    }: {
      id: number;
      type: "RECEIVE" | "ISSUE";
      qty: string;
      unitValue: string;
      totalValue: string;
    }) => {
      const payload: Record<string, number | null> = {
        qty: Number.parseInt(qty, 10),
      };

      if (type === "RECEIVE") {
        payload.unitCost = unitValue ? parseFloat(unitValue) : null;
        payload.totalCost = totalValue ? parseFloat(totalValue) : null;
      } else {
        payload.unitPrice = unitValue ? parseFloat(unitValue) : null;
        payload.totalPrice = totalValue ? parseFloat(totalValue) : null;
      }

      return apiRequest<FinancialTransaction & { itemTypeId?: number }>(
        `/api/transactions/${id}`,
        {
          method: "PATCH",
          body: JSON.stringify(payload),
        },
      );
    },
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      if (updated?.id != null) {
        queryClient.invalidateQueries({
          queryKey: qk.transaction(updated.id),
        });
      }
      const itemTypeId = updated?.itemType?.id ?? updated?.itemTypeId;
      if (itemTypeId != null) {
        queryClient.invalidateQueries({
          queryKey: qk.batches(itemTypeId),
        });
      }
      setEditingTransaction(null);
    },
  });

  const formatCurrency = (value: number | null | undefined) => {
    if (value === null || value === undefined) return "-";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(value);
  };

  const parseNumber = (value: string | number) => {
    if (!value) return null;
    const num = Number(value);
    return Number.isFinite(num) ? num : null;
  };

  const formatMoneyInput = (value: number | null) =>
    value == null ? "" : value.toFixed(2);

  const syncMoneyInputs = ({
    qty,
    unitValue,
    totalValue,
    changedField,
  }: {
    qty: number;
    unitValue: string;
    totalValue: string;
    changedField: "unit" | "total" | "qty";
  }) => {
    const { unit, total } = syncUnitTotal({
      qty,
      unit: parseNumber(unitValue),
      total: parseNumber(totalValue),
      changedField,
    });

    const nextUnit = unit != null ? formatMoneyInput(unit) : "";
    const nextTotal = total != null ? formatMoneyInput(total) : "";

    if (changedField === "unit") {
      return { unitValue, totalValue: nextTotal };
    }

    if (changedField === "total") {
      return { unitValue: nextUnit, totalValue };
    }

    return { unitValue: nextUnit, totalValue: nextTotal };
  };

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat("en-US").format(value);
  };

  const formatPercent = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  const formatDateLabel = (value: string | number | null | undefined) => {
    if (value == null) return "Unknown";
    const raw = String(value);
    if (/^\d{4}-\d{2}$/.test(raw)) {
      const [year, month] = raw.split("-");
      const yearNum = Number(year);
      const monthNum = Number(month);
      if (!Number.isFinite(yearNum) || !Number.isFinite(monthNum)) {
        return "Unknown";
      }
      const date = new Date(yearNum, monthNum - 1, 1);
      return isNaN(date.getTime()) ? "Unknown" : format(date, "MMM yyyy");
    }
    const parsed = new Date(raw);
    if (isNaN(parsed.getTime())) {
      return "Unknown";
    }
    return format(parsed, "MMM d, yyyy");
  };

  // Recharts expects (value, name, props) => ReactNode for formatter, and (label, payload) => ReactNode for labelFormatter
  const tooltipFormatter = (value: string | number | undefined) => {
    const numericValue =
      typeof value === "number"
        ? value
        : typeof value === "string"
        ? parseFloat(value)
        : 0;
    return formatCurrency(numericValue);
  };

  const rechartsTooltipFormatter = (value: string | number | undefined) => tooltipFormatter(value);
  const rechartsLabelFormatter = (label: any) => formatDateLabel(label);

  const totals = dashboardData?.totals;
  const byItemType = dashboardData?.byItemType || [];
  const chartData = dashboardData?.chartData || [];
  const normalizedChartData = chartData.map((item: DashboardChartData) => ({
    date: item.date ?? item.month ?? "",
    receivedCost: item.receivedCost ?? item.cost ?? 0,
    issuedRevenue: item.issuedRevenue ?? item.revenue ?? 0,
    profit: item.profit ?? 0,
  }));
  const totalCardQty =
    totals?.outstandingCardQty ??
    byItemType.reduce((sum, item) => sum + (item.balance || 0), 0);
  const totalCardValue =
    totals?.stockValue ??
    totals?.estimatedCardValue ??
    byItemType.reduce((sum, item) => sum + (item.stockValue || 0), 0);
  const stockCutoffLabel = dateRange.endDate
    ? formatDateLabel(dateRange.endDate)
    : "today";
  const summaryGridClass = "grid gap-4 md:grid-cols-2 lg:grid-cols-4";
  const unitValueLabel = "Unit Value";
  const totalValueLabel = "Total Value";
  const financialTransactions = financialTransactionsData?.transactions || [];
  const transactionsPagination = financialTransactionsData?.pagination;

  const normalizedByItemTypeSearch = byItemTypeSearch.trim().toLowerCase();
  const filteredByItemType = normalizedByItemTypeSearch
    ? byItemType.filter((item: DashboardByItemType) => {
        const haystack = [
          item.itemType?.name,
          item.itemType?.code,
          item.receivedQty,
          item.issuedQty,
          item.balance,
          item.receivedCost,
          item.issuedRevenue,
          item.profit,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return haystack.includes(normalizedByItemTypeSearch);
      })
    : byItemType;

  const totalByItemTypes = filteredByItemType.length;
  const totalByItemTypePages = Math.max(
    Math.ceil(totalByItemTypes / BY_ITEM_PAGE_SIZE),
    1,
  );
  const clampedByItemTypePage = Math.min(byItemTypePage, totalByItemTypePages);
  const pagedByItemType = filteredByItemType.slice(
    (clampedByItemTypePage - 1) * BY_ITEM_PAGE_SIZE,
    clampedByItemTypePage * BY_ITEM_PAGE_SIZE,
  );

  useEffect(() => {
    if (byItemTypePage > totalByItemTypePages) {
      setByItemTypePage(totalByItemTypePages);
    }
  }, [byItemTypePage, totalByItemTypePages]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Financials"
        description={copy.financialsDescription}
      />

      {/* Filters */}
      <FilterPanel
        title="Refine Financial View"
        description="Use one filter set to compare cost, revenue, stock value, and financial transaction detail."
        footer={(
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">
              Cost, revenue, and profit use the selected date range. In-stock
              quantities and stock value use the end date as their cutoff.
            </p>
            <Button
              variant="outline"
              onClick={() => {
                setDateRange({ startDate: "", endDate: "" });
                setItemTypeFilter("");
              }}
            >
              Clear Filters
            </Button>
          </div>
        )}
      >
          <div className="grid gap-4 md:grid-cols-4">
            <div>
              <Label htmlFor="startDate">Start Date</Label>
              <SystemDatePicker
                id="startDate"
                value={dateRange.startDate}
                onChange={(startDate) =>
                  setDateRange((prev) => ({
                    ...prev,
                    startDate,
                  }))
                }
                label="Start Date"
                placeholder="Select start date"
              />
            </div>
            <div>
              <Label htmlFor="endDate">End Date</Label>
              <SystemDatePicker
                id="endDate"
                value={dateRange.endDate}
                onChange={(endDate) =>
                  setDateRange((prev) => ({ ...prev, endDate }))
                }
                label="End Date"
                placeholder="Select end date"
              />
            </div>
            <div>
              <Label htmlFor="itemType">{copy.itemTypeLabel}</Label>
              <Select value={itemTypeFilter} onValueChange={setItemTypeFilter}>
                <SelectTrigger id="itemType">
                  <SelectValue placeholder={copy.itemTypeAllLabel} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_ITEM_OPTION}>
                    {copy.itemTypeAllLabel}
                  </SelectItem>
                  {itemTypes.map((type) => (
                    <SelectItem key={type.id} value={type.id.toString()}>
                      {type.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <div className="h-11" />
            </div>
          </div>
      </FilterPanel>

      {/* Summary Stats */}
      {isLoading ? (
        <div className={summaryGridClass}>
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="pt-6">
                <div className="h-4 bg-muted/60 rounded w-1/2 mb-2"></div>
                <div className="h-8 bg-muted/60 rounded w-3/4"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className={summaryGridClass}>
          <StatCard
            title="Total Cost (Purchases)"
            value={formatCurrency(totals?.totalReceivedCost)}
            description={`${formatNumber(totals?.totalReceivedQty || 0)} ${copy.unitNounPlural} received`}
            icon={DollarSign}
          />
          <StatCard
            title="Total Revenue (Sales)"
            value={formatCurrency(totals?.totalIssuedRevenue)}
            description={`${formatNumber(totals?.totalIssuedQty || 0)} ${copy.unitNounPlural} issued`}
            icon={Wallet}
          />
          <StatCard
            title="Estimated Profit"
            value={formatCurrency(totals?.estimatedProfit)}
            description={`${formatPercent(totals?.profitMargin || 0)} margin`}
            icon={totals?.estimatedProfit && totals.estimatedProfit >= 0 ? TrendingUp : TrendingDown}
            trend={
              totals?.profitMargin !== undefined
                ? {
                    value: `${totals.profitMargin.toFixed(1)}% margin`,
                    isPositive: totals.profitMargin >= 0,
                  }
                : undefined
            }
          />
          <StatCard
            title="Cards Value"
            value={formatCurrency(totalCardValue)}
            description={`${formatNumber(totalCardQty || 0)} ${copy.unitNounPlural} in stock as of ${stockCutoffLabel}`}
            icon={Package}
          />
        </div>
      )}

      {/* Tabs for different views */}
      <Tabs defaultValue="chart" className="space-y-4">
        <TabsList>
          <TabsTrigger value="chart">
            <BarChart3 className="h-4 w-4 mr-2" />
            Profit Chart
          </TabsTrigger>
          <TabsTrigger value="by-card-type">
            By {copy.itemTypeLabel}
          </TabsTrigger>
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
        </TabsList>

        {/* Profit Chart Tab */}
        <TabsContent value="chart">
          <Card>
            <CardHeader>
              <CardTitle>Cost vs Revenue vs Profit (Selected Period)</CardTitle>
            </CardHeader>
            <CardContent>
              {normalizedChartData.length === 0 ? (
                <div className="flex items-center justify-center h-[400px] text-muted-foreground">
                  No transaction data available for chart
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={normalizedChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="date"
                      tickFormatter={formatDateLabel}
                      fontSize={12}
                    />
                    <YAxis
                      tickFormatter={(value) =>
                        `$${(value / 1000).toFixed(0)}k`
                      }
                      fontSize={12}
                    />
                    <Tooltip
                      formatter={rechartsTooltipFormatter}
                      labelFormatter={rechartsLabelFormatter}
                    />
                    <Legend />
                    <Bar dataKey="receivedCost" name="Cost" fill="#ef4444" />
                    <Bar dataKey="issuedRevenue" name="Revenue" fill="#22c55e" />
                    <Bar dataKey="profit" name="Profit" fill="#3b82f6" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* By Item Type Tab */}
        <TabsContent value="by-card-type">
          <DataTableSection
            title={`Financial Summary by ${copy.itemTypeLabel}`}
            description={`Compare cost, revenue, profit, and stock position by ${copy.itemTypeLabel.toLowerCase()}.`}
            toolbar={(
              <Input
                value={byItemTypeSearch}
                onChange={(e) => setByItemTypeSearch(e.target.value)}
                placeholder={`Search ${copy.itemTypeLabel.toLowerCase()}...`}
                className="h-9 w-full sm:w-40"
              />
            )}
            footer={(
              <TablePagination
                page={clampedByItemTypePage}
                limit={BY_ITEM_PAGE_SIZE}
                total={totalByItemTypes}
                itemLabel={copy.itemTypePlural.toLowerCase()}
                onPageChange={setByItemTypePage}
              />
            )}
          >
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{copy.itemTypeLabel}</TableHead>
                    <TableHead className="text-right">Received Qty</TableHead>
                    <TableHead className="text-right">Total Cost</TableHead>
                    <TableHead className="text-right">Avg Unit Cost</TableHead>
                    <TableHead className="text-right">Issued Qty</TableHead>
                    <TableHead className="text-right">Total Revenue</TableHead>
                    <TableHead className="text-right">Avg Unit Price</TableHead>
                    <TableHead className="text-right">Profit</TableHead>
                    <TableHead className="text-right">In Stock</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {totalByItemTypes === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8">
                        {normalizedByItemTypeSearch
                          ? "No matching results"
                          : "No data available"}
                      </TableCell>
                    </TableRow>
                  ) : (
                    pagedByItemType.map((item: DashboardByItemType) => (
                      <TableRow key={item.itemType.id}>
                        <TableCell className="font-medium">
                          {item.itemType.name}
                          <span className="text-muted-foreground text-xs ml-1">
                            ({item.itemType.code})
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          {formatNumber(item.receivedQty)}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(item.receivedCost)}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(item.avgUnitCost)}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatNumber(item.issuedQty)}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(item.issuedRevenue)}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(item.avgUnitPrice)}
                        </TableCell>
                        <TableCell
                          className={`text-right font-medium ${
                            item.profit >= 0
                              ? "text-emerald-600 dark:text-emerald-400"
                              : "text-red-600 dark:text-red-400"
                          }`}
                        >
                          {formatCurrency(item.profit)}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatNumber(item.balance)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
          </DataTableSection>
        </TabsContent>

        {/* Transactions Tab */}
        <TabsContent value="transactions">
          <DataTableSection
            title="Transaction History"
            description="Full receive and issue history for the current financial filters."
            footer={(
              <TablePagination
                page={transactionsPage}
                limit={transactionsPagination?.limit ?? TRANSACTIONS_PAGE_SIZE}
                total={transactionsPagination?.total ?? 0}
                itemLabel="transactions"
                onPageChange={setTransactionsPage}
              />
            )}
          >
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>{copy.itemTypeLabel}</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead className="text-right">{unitValueLabel}</TableHead>
                    <TableHead className="text-right">{totalValueLabel}</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-center">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {financialTransactions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8">
                        No transactions found for the selected filters
                      </TableCell>
                    </TableRow>
                  ) : (
                    financialTransactions.map((txn) => {
                      const isEditing = editingTransaction?.id === txn.id;
                      const isPosted = txn.status === "POSTED";
                      const isReversed = txn.status === "REVERSED";
                      const unitValue =
                        txn.type === "RECEIVE"
                          ? (txn as any).unitCost
                          : (txn as any).unitPrice;
                      const totalValue =
                        txn.type === "RECEIVE"
                          ? (txn as any).calculatedTotalCost ??
                            (txn as any).totalCost ??
                            (unitValue != null ? unitValue * txn.qty : null)
                          : (txn as any).calculatedTotalPrice ??
                            (txn as any).totalPrice ??
                            (unitValue != null ? unitValue * txn.qty : null);
                      const canEdit = isPosted;
                      const currentQty = isEditing
                        ? parseNumber(editingTransaction.qty) || 0
                        : txn.qty;

                      return (
                        <TableRow key={`${txn.type}-${txn.id}`}>
                          <TableCell>#{txn.id}</TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                txn.type === "RECEIVE" ? "outline" : "default"
                              }
                            >
                              {txn.type}
                            </Badge>
                          </TableCell>
                          <TableCell>{txn.itemType.name}</TableCell>
                          <TableCell className="text-right">
                            {isEditing ? (
                              <Input
                                type="number"
                                min="1"
                                value={editingTransaction?.qty ?? ""}
                                onChange={(e) =>
                                  setEditingTransaction((prev) => {
                                    if (!prev) return null;
                                    const nextQtyValue = e.target.value;
                                    const nextQty = parseNumber(nextQtyValue) || 0;
                                    const synced = syncMoneyInputs({
                                      qty: nextQty,
                                      unitValue: prev.unitValue,
                                      totalValue: prev.totalValue,
                                      changedField: "qty",
                                    });
                                    return {
                                      ...prev,
                                      qty: nextQtyValue,
                                      unitValue: synced.unitValue,
                                      totalValue: synced.totalValue,
                                    };
                                  })
                                }
                                className="w-20 text-right"
                              />
                            ) : (
                              formatNumber(txn.qty)
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            {isEditing ? (
                              <Input
                                type="number"
                                step="0.01"
                                min="0"
                                value={editingTransaction?.unitValue ?? ""}
                                onChange={(e) =>
                                  setEditingTransaction((prev) =>
                                    prev
                                      ? {
                                          ...prev,
                                          ...syncMoneyInputs({
                                            qty: currentQty,
                                            unitValue: e.target.value,
                                            totalValue: prev.totalValue,
                                            changedField: "unit",
                                          }),
                                        }
                                      : null
                                  )
                                }
                                className="w-24 text-right"
                              />
                            ) : (
                              formatCurrency(unitValue)
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            {isEditing ? (
                              <Input
                                type="number"
                                step="0.01"
                                min="0"
                                value={editingTransaction?.totalValue ?? ""}
                                onChange={(e) =>
                                  setEditingTransaction((prev) =>
                                    prev
                                      ? {
                                          ...prev,
                                          ...syncMoneyInputs({
                                            qty: currentQty,
                                            unitValue: prev.unitValue,
                                            totalValue: e.target.value,
                                            changedField: "total",
                                          }),
                                        }
                                      : null
                                  )
                                }
                                className="w-28 text-right"
                                placeholder="Optional"
                              />
                            ) : (
                              formatCurrency(totalValue)
                            )}
                          </TableCell>
                          <TableCell>
                            {format(new Date(txn.createdAt), "MMM d, yyyy")}
                          </TableCell>
                          <TableCell className="text-center">
                            {isEditing ? (
                              <div className="flex justify-center gap-1">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() =>
                                    updateMutation.mutate({
                                      id: editingTransaction?.id ?? 0,
                                      type: editingTransaction?.type ?? "RECEIVE",
                                      qty: editingTransaction?.qty ?? "",
                                      unitValue: editingTransaction?.unitValue ?? "",
                                      totalValue: editingTransaction?.totalValue ?? "",
                                    })
                                  }
                                  disabled={updateMutation.isPending}
                                >
                                  <Check className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => setEditingTransaction(null)}
                                >
                                  <X className="h-4 w-4 text-red-600 dark:text-red-400" />
                                </Button>
                              </div>
                            ) : (
                              <Button
                                size="sm"
                                variant="ghost"
                                disabled={isReversed || !canEdit}
                                onClick={() => {
                                  if (isReversed || !canEdit) return;
                                  const rawUnit =
                                    txn.type === "RECEIVE"
                                      ? (txn as any).unitCost
                                      : (txn as any).unitPrice;
                                  const rawTotal =
                                    txn.type === "RECEIVE"
                                      ? (txn as any).totalCost
                                      : (txn as any).totalPrice;
                                  const initialQty = String(txn.qty);
                                  const initialSync = syncUnitTotal({
                                    qty: txn.qty,
                                    unit: rawUnit,
                                    total: rawTotal,
                                    changedField:
                                      rawTotal != null
                                        ? "total"
                                        : rawUnit != null
                                          ? "unit"
                                          : "qty",
                                  });
                                  const initialTotal =
                                    rawTotal != null
                                      ? String(rawTotal)
                                      : initialSync.total != null
                                        ? formatMoneyInput(initialSync.total)
                                        : "";
                                  const initialUnit =
                                    rawUnit != null
                                      ? String(rawUnit)
                                      : initialSync.unit != null
                                        ? formatMoneyInput(initialSync.unit)
                                        : "";
                                  setEditingTransaction({
                                    id: txn.id,
                                    type: txn.type,
                                    qty: initialQty,
                                    unitValue: initialUnit,
                                    totalValue: initialTotal,
                                  });
                                }}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
          </DataTableSection>
        </TabsContent>
      </Tabs>
    </div>
  );
}



