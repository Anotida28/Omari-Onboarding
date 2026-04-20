"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Download } from "lucide-react";
import { Badge } from "components/ui/badge";
import { Button } from "components/ui/button";
import { DataTableSection } from "components/ui/data-table-section";
import { FilterPanel } from "components/ui/filter-panel";
import { Input } from "components/ui/input";
import { Label } from "components/ui/label";
import { SystemDatePicker } from "components/ui/system-date-picker";
import { PageHeader } from "components/ui/page-header";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "components/ui/select";
import { TablePagination } from "components/ui/table-pagination";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "components/ui/tabs";
import { useToast } from "components/ui/toast-provider";
import { useCardsCopy } from "lib/cards-copy";
import { qk } from "lib/query-keys";
import { getUserDisplayName } from "lib/user-display";
import { apiRequest, downloadApiFile } from "services/api";

type ItemType = {
  id: number;
  name: string;
  code: string;
};

type Pagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

type TransactionReportRow = {
  id: number;
  type: string;
  status: string;
  createdAt: string;
  qty: number;
  itemType: {
    id: number;
    name: string;
    code: string;
  } | null;
  batch: {
    id: number;
    batchCode: string;
  } | null;
  createdBy: {
    id: number;
    username: string;
  } | null;
  issuedToType: string | null;
  issuedToName: string | null;
  issuedToBranch: null;
  notes?: string | null;
};

type StockBalanceRow = {
  itemType: {
    id: number;
    name: string;
    code: string;
  };
  balance: number;
  lastUpdatedAt: string | null;
};

type StockBalanceResponse = {
  summary: {
    totalCount: number;
    totalQty: number;
  };
  pagination: Pagination;
  rows: StockBalanceRow[];
};

type GroupedItemTypeRow = {
  itemType: {
    id: number;
    name: string;
    code: string;
  } | undefined;
  totalQty: number;
  totalCount: number;
  totalReceivedCost?: number;
};

type IssuesResponse = {
  summary: {
    totalCount: number;
    totalQty: number;
    byItemType: GroupedItemTypeRow[];
  };
  pagination: Pagination;
  rows: TransactionReportRow[];
};

type ReceiptsResponse = {
  summary: {
    totalCount: number;
    totalQty: number;
    totalReceivedCost: number;
    byItemType: GroupedItemTypeRow[];
  };
  pagination: Pagination;
  rows: TransactionReportRow[];
};

type UserActivityRow = {
  user: {
    id: number;
    username: string;
  };
  receipts: number;
  issues: number;
  adjustments: number;
  reversals: number;
  totalTransactions: number;
  counts: Record<string, number>;
};

type UserActivityResponse = {
  summary: {
    totalUsers: number;
    totalTransactions: number;
  };
  pagination: Pagination;
  rows: UserActivityRow[];
};

const PAGE_SIZE = 10;
const ALL_ITEM_OPTION = "ALL_ITEM_TYPES";

const formatDateTime = (value?: string | null) => {
  if (!value) return "--";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "--";
  return format(parsed, "MMM d, yyyy");
};

const formatCutoffLabel = (value?: string | null) => {
  if (!value) return "today";
  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return "the selected cutoff";
  return format(parsed, "MMM d, yyyy");
};

const buildReportQuery = (params: Record<string, string | number | undefined>) =>
  new URLSearchParams(
    Object.entries(params).reduce<Record<string, string>>((acc, [key, value]) => {
      if (value !== undefined && value !== "") {
        acc[key] = String(value);
      }
      return acc;
    }, {}),
  ).toString();

export default function ReportsPage() {
  const copy = useCardsCopy();
  const { toast } = useToast();
  const [dateRange, setDateRange] = useState({
    startDate: "",
    endDate: "",
  });
  const [itemTypeFilter, setItemTypeFilter] = useState("");
  const [stockSearch, setStockSearch] = useState("");
  const [issuesSearch, setIssuesSearch] = useState("");
  const [receiptsSearch, setReceiptsSearch] = useState("");
  const [activitySearch, setActivitySearch] = useState("");
  const [stockPage, setStockPage] = useState(1);
  const [issuesPage, setIssuesPage] = useState(1);
  const [receiptsPage, setReceiptsPage] = useState(1);
  const [activityPage, setActivityPage] = useState(1);

  const sharedFilters = useMemo(
    () => ({
      startDate: dateRange.startDate || "",
      endDate: dateRange.endDate || "",
      itemTypeId:
        itemTypeFilter && itemTypeFilter !== ALL_ITEM_OPTION
          ? itemTypeFilter
          : "",
    }),
    [dateRange.endDate, dateRange.startDate, itemTypeFilter],
  );

  useEffect(() => {
    setStockPage(1);
  }, [stockSearch, sharedFilters.endDate, sharedFilters.itemTypeId]);

  useEffect(() => {
    setIssuesPage(1);
  }, [issuesSearch, sharedFilters.endDate, sharedFilters.itemTypeId, sharedFilters.startDate]);

  useEffect(() => {
    setReceiptsPage(1);
  }, [receiptsSearch, sharedFilters.endDate, sharedFilters.itemTypeId, sharedFilters.startDate]);

  useEffect(() => {
    setActivityPage(1);
  }, [activitySearch, sharedFilters.endDate, sharedFilters.itemTypeId, sharedFilters.startDate]);

  const { data: itemTypes = [] } = useQuery<ItemType[]>({
    queryKey: qk.itemTypes(),
    queryFn: async () => {
      const response = await apiRequest<{ itemTypes: ItemType[] }>("/api/item-types");
      return response.itemTypes;
    },
  });

  const stockQueryFilters = useMemo(
    () => ({
      endDate: sharedFilters.endDate,
      itemTypeId: sharedFilters.itemTypeId,
      search: stockSearch,
      page: stockPage,
      limit: PAGE_SIZE,
    }),
    [sharedFilters.endDate, sharedFilters.itemTypeId, stockPage, stockSearch],
  );

  const issuesQueryFilters = useMemo(
    () => ({
      ...sharedFilters,
      search: issuesSearch,
      page: issuesPage,
      limit: PAGE_SIZE,
    }),
    [issuesPage, issuesSearch, sharedFilters],
  );

  const receiptsQueryFilters = useMemo(
    () => ({
      ...sharedFilters,
      search: receiptsSearch,
      page: receiptsPage,
      limit: PAGE_SIZE,
    }),
    [receiptsPage, receiptsSearch, sharedFilters],
  );

  const activityQueryFilters = useMemo(
    () => ({
      ...sharedFilters,
      search: activitySearch,
      page: activityPage,
      limit: PAGE_SIZE,
    }),
    [activityPage, activitySearch, sharedFilters],
  );

  const { data: stockBalance } = useQuery<StockBalanceResponse>({
    queryKey: qk.stockBalance(stockQueryFilters),
    queryFn: () =>
      apiRequest<StockBalanceResponse>(
        `/api/reports/stock-balance?${buildReportQuery(stockQueryFilters)}`,
      ),
  });

  const { data: issuesReport } = useQuery<IssuesResponse>({
    queryKey: qk.issues(issuesQueryFilters),
    queryFn: () =>
      apiRequest<IssuesResponse>(
        `/api/reports/issues?${buildReportQuery(issuesQueryFilters)}`,
      ),
  });

  const { data: receiptsReport } = useQuery<ReceiptsResponse>({
    queryKey: qk.receipts(receiptsQueryFilters),
    queryFn: () =>
      apiRequest<ReceiptsResponse>(
        `/api/reports/receipts?${buildReportQuery(receiptsQueryFilters)}`,
      ),
  });

  const { data: userActivityReport } = useQuery<UserActivityResponse>({
    queryKey: qk.userActivity(activityQueryFilters),
    queryFn: () =>
      apiRequest<UserActivityResponse>(
        `/api/reports/user-activity?${buildReportQuery(activityQueryFilters)}`,
      ),
  });

  const handleExport = async (endpoint: string, filename: string) => {
    try {
      await downloadApiFile(endpoint, filename);
    } catch (error: any) {
      toast({
        title: "Export failed",
        description: error?.message || "Could not export report data",
        variant: "destructive",
      });
    }
  };

  const stockCutoffLabel = formatCutoffLabel(sharedFilters.endDate);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports"
        description={copy.reportsDescription}
      />

      <FilterPanel
        title="Refine Report View"
        description="Use one shared filter set to compare stock, receipts, issues, and user activity."
        footer={(
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">
              Start Date applies to movement reports. Stock Balance uses the end
              date as its as-of cutoff and ignores the start date.
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
            <div className="space-y-2">
              <Label htmlFor="reports-start-date">Start Date</Label>
              <SystemDatePicker
                id="reports-start-date"
                value={dateRange.startDate}
                onChange={(startDate) =>
                  setDateRange((prev) => ({
                    ...prev,
                    startDate,
                  }))
                }
                label="Reports Start Date"
                placeholder="Select start date"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reports-end-date">End Date</Label>
              <SystemDatePicker
                id="reports-end-date"
                value={dateRange.endDate}
                onChange={(endDate) =>
                  setDateRange((prev) => ({
                    ...prev,
                    endDate,
                  }))
                }
                label="Reports End Date"
                placeholder="Select end date"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reports-item-type">{copy.itemTypeLabel}</Label>
              <Select
                value={itemTypeFilter || ALL_ITEM_OPTION}
                onValueChange={(value) =>
                  setItemTypeFilter(value === ALL_ITEM_OPTION ? "" : value)
                }
              >
                <SelectTrigger id="reports-item-type">
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

      <Tabs defaultValue="stock-balance" className="space-y-4">
        <TabsList>
          <TabsTrigger value="stock-balance">Stock Balance</TabsTrigger>
          <TabsTrigger value="issues">Issues</TabsTrigger>
          <TabsTrigger value="receipts">Receipts</TabsTrigger>
          <TabsTrigger value="user-activity">User Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="stock-balance">
          <DataTableSection
            title="Stock Balance Report"
            description={`Balances shown are as of ${stockCutoffLabel}.`}
            toolbar={(
              <>
                <Input
                  value={stockSearch}
                  onChange={(event) => setStockSearch(event.target.value)}
                  placeholder="Search stock..."
                  className="h-9 w-full sm:w-40"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    handleExport(
                      `/api/reports/stock-balance/export?${buildReportQuery({
                        endDate: sharedFilters.endDate,
                        itemTypeId: sharedFilters.itemTypeId,
                        search: stockSearch,
                      })}`,
                      "stock-balance-report.csv",
                    )
                  }
                >
                  <Download className="mr-2 h-4 w-4" />
                  Export CSV
                </Button>
              </>
            )}
            summary={(
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-lg bg-muted/40 p-4">
                  <p className="text-sm text-muted-foreground">Visible Card Types</p>
                  <p className="text-2xl font-bold">
                    {stockBalance?.summary.totalCount ?? 0}
                  </p>
                </div>
                <div className="rounded-lg bg-muted/40 p-4">
                  <p className="text-sm text-muted-foreground">Visible Balance</p>
                  <p className="text-2xl font-bold">
                    {(stockBalance?.summary.totalQty ?? 0).toLocaleString()}
                  </p>
                </div>
              </div>
            )}
            footer={(
              <TablePagination
                page={stockPage}
                limit={stockBalance?.pagination.limit ?? PAGE_SIZE}
                total={stockBalance?.pagination.total ?? 0}
                itemLabel="stock rows"
                onPageChange={setStockPage}
              />
            )}
          >
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{copy.itemTypeLabel}</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                  <TableHead>Last Updated</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(stockBalance?.rows ?? []).length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
                      No stock data available.
                    </TableCell>
                  </TableRow>
                ) : (
                  stockBalance?.rows.map((item) => (
                    <TableRow key={item.itemType.id}>
                      <TableCell className="font-medium">{item.itemType.name}</TableCell>
                      <TableCell>{item.itemType.code}</TableCell>
                      <TableCell className="text-right">
                        <Badge variant={item.balance < 100 ? "destructive" : "default"}>
                          {item.balance.toLocaleString()}
                        </Badge>
                      </TableCell>
                      <TableCell>{formatDateTime(item.lastUpdatedAt)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </DataTableSection>
        </TabsContent>

        <TabsContent value="issues">
          <DataTableSection
            title="Issues Report"
            description="Track outgoing card movement, recipients, and responsible users."
            toolbar={(
              <>
                <Input
                  value={issuesSearch}
                  onChange={(event) => setIssuesSearch(event.target.value)}
                  placeholder="Search issues..."
                  className="h-9 w-full sm:w-40"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    handleExport(
                      `/api/reports/issues/export?${buildReportQuery({
                        ...sharedFilters,
                        search: issuesSearch,
                      })}`,
                      "issues-report.csv",
                    )
                  }
                >
                  <Download className="mr-2 h-4 w-4" />
                  Export CSV
                </Button>
              </>
            )}
            summary={(
              <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-lg bg-muted/40 p-4">
                  <p className="text-sm text-muted-foreground">Total Quantity</p>
                  <p className="text-2xl font-bold">
                    {(issuesReport?.summary.totalQty ?? 0).toLocaleString()}
                  </p>
                </div>
                <div className="rounded-lg bg-muted/40 p-4">
                  <p className="text-sm text-muted-foreground">Total Transactions</p>
                  <p className="text-2xl font-bold">
                    {issuesReport?.summary.totalCount ?? 0}
                  </p>
                </div>
                <div className="rounded-lg bg-muted/40 p-4">
                  <p className="text-sm text-muted-foreground">{copy.itemTypePlural}</p>
                  <p className="text-2xl font-bold">
                    {issuesReport?.summary.byItemType.length ?? 0}
                  </p>
                </div>
              </div>
            )}
            footer={(
              <TablePagination
                page={issuesPage}
                limit={issuesReport?.pagination.limit ?? PAGE_SIZE}
                total={issuesReport?.pagination.total ?? 0}
                itemLabel="issues"
                onPageChange={setIssuesPage}
              />
            )}
          >
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>{copy.itemTypeLabel}</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Recipient</TableHead>
                  <TableHead>User</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(issuesReport?.rows ?? []).length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                      No issues available.
                    </TableCell>
                  </TableRow>
                ) : (
                  issuesReport?.rows.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>{formatDateTime(item.createdAt)}</TableCell>
                      <TableCell>{item.itemType?.name ?? "-"}</TableCell>
                      <TableCell>{item.qty.toLocaleString()}</TableCell>
                      <TableCell>{item.issuedToName || "-"}</TableCell>
                      <TableCell>{getUserDisplayName(item.createdBy)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </DataTableSection>
        </TabsContent>

        <TabsContent value="receipts">
          <DataTableSection
            title="Receipts Report"
            description="Review incoming card batches, quantities, and receiving activity."
            toolbar={(
              <>
                <Input
                  value={receiptsSearch}
                  onChange={(event) => setReceiptsSearch(event.target.value)}
                  placeholder="Search receipts..."
                  className="h-9 w-full sm:w-40"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    handleExport(
                      `/api/reports/receipts/export?${buildReportQuery({
                        ...sharedFilters,
                        search: receiptsSearch,
                      })}`,
                      "receipts-report.csv",
                    )
                  }
                >
                  <Download className="mr-2 h-4 w-4" />
                  Export CSV
                </Button>
              </>
            )}
            summary={(
              <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-lg bg-muted/40 p-4">
                  <p className="text-sm text-muted-foreground">Total Quantity</p>
                  <p className="text-2xl font-bold">
                    {(receiptsReport?.summary.totalQty ?? 0).toLocaleString()}
                  </p>
                </div>
                <div className="rounded-lg bg-muted/40 p-4">
                  <p className="text-sm text-muted-foreground">Total Transactions</p>
                  <p className="text-2xl font-bold">
                    {receiptsReport?.summary.totalCount ?? 0}
                  </p>
                </div>
                <div className="rounded-lg bg-muted/40 p-4">
                  <p className="text-sm text-muted-foreground">{copy.itemTypePlural}</p>
                  <p className="text-2xl font-bold">
                    {receiptsReport?.summary.byItemType.length ?? 0}
                  </p>
                </div>
              </div>
            )}
            footer={(
              <TablePagination
                page={receiptsPage}
                limit={receiptsReport?.pagination.limit ?? PAGE_SIZE}
                total={receiptsReport?.pagination.total ?? 0}
                itemLabel="receipts"
                onPageChange={setReceiptsPage}
              />
            )}
          >
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>{copy.itemTypeLabel}</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Batch Code</TableHead>
                  <TableHead>User</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(receiptsReport?.rows ?? []).length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                      No receipts available.
                    </TableCell>
                  </TableRow>
                ) : (
                  receiptsReport?.rows.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>{formatDateTime(item.createdAt)}</TableCell>
                      <TableCell>{item.itemType?.name ?? "-"}</TableCell>
                      <TableCell>{item.qty.toLocaleString()}</TableCell>
                      <TableCell>{item.batch?.batchCode ?? "-"}</TableCell>
                      <TableCell>{getUserDisplayName(item.createdBy)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </DataTableSection>
        </TabsContent>

        <TabsContent value="user-activity">
          <DataTableSection
            title="User Activity Report"
            description="Measure how users contribute to receipts, issues, adjustments, and total transactions."
            toolbar={(
              <>
                <Input
                  value={activitySearch}
                  onChange={(event) => setActivitySearch(event.target.value)}
                  placeholder="Search users..."
                  className="h-9 w-full sm:w-40"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    handleExport(
                      `/api/reports/user-activity/export?${buildReportQuery({
                        ...sharedFilters,
                        search: activitySearch,
                      })}`,
                      "user-activity-report.csv",
                    )
                  }
                >
                  <Download className="mr-2 h-4 w-4" />
                  Export CSV
                </Button>
              </>
            )}
            summary={(
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-lg bg-muted/40 p-4">
                  <p className="text-sm text-muted-foreground">Total Transactions</p>
                  <p className="text-2xl font-bold">
                    {userActivityReport?.summary.totalTransactions ?? 0}
                  </p>
                </div>
                <div className="rounded-lg bg-muted/40 p-4">
                  <p className="text-sm text-muted-foreground">Visible Users</p>
                  <p className="text-2xl font-bold">
                    {userActivityReport?.summary.totalUsers ?? 0}
                  </p>
                </div>
              </div>
            )}
            footer={(
              <TablePagination
                page={activityPage}
                limit={userActivityReport?.pagination.limit ?? PAGE_SIZE}
                total={userActivityReport?.pagination.total ?? 0}
                itemLabel="users"
                onPageChange={setActivityPage}
              />
            )}
          >
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead className="text-right">Receives</TableHead>
                  <TableHead className="text-right">Issues</TableHead>
                  <TableHead className="text-right">Adjustments</TableHead>
                  <TableHead className="text-right">Reversals</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(userActivityReport?.rows ?? []).length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                      No user activity available.
                    </TableCell>
                  </TableRow>
                ) : (
                  userActivityReport?.rows.map((group) => (
                    <TableRow key={group.user.id}>
                      <TableCell className="font-medium">
                        {getUserDisplayName(group.user)}
                      </TableCell>
                      <TableCell className="text-right">{group.receipts}</TableCell>
                      <TableCell className="text-right">{group.issues}</TableCell>
                      <TableCell className="text-right">{group.adjustments}</TableCell>
                      <TableCell className="text-right">{group.reversals}</TableCell>
                      <TableCell className="text-right font-semibold">
                        {group.totalTransactions}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </DataTableSection>
        </TabsContent>
      </Tabs>
    </div>
  );
}
