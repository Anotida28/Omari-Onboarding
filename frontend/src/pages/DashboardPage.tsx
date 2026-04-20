"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { DataTableSection } from "../components/ui/data-table-section";
import { Button } from "../components/ui/button";
import { FilterPanel } from "../components/ui/filter-panel";
import { Label } from "../components/ui/label";
import { Input } from "../components/ui/input";
import { SystemDatePicker } from "../components/ui/system-date-picker";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "../components/ui/select";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "../components/ui/table";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../components/ui/tabs";
import { Badge } from "../components/ui/badge";
import { StatCard } from "../components/ui/stat-card";
import { PageHeader } from "../components/ui/page-header";
import { TablePagination } from "../components/ui/table-pagination";
import {
  BarChart3,
  LayoutDashboard,
  Package,
  PackageCheck,
} from "lucide-react";
import { apiRequest } from "../services/api";
import { useCardsCopy } from "../lib/cards-copy";
import {
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Bar,
} from "recharts";
import { qk } from "lib/query-keys";

type DashboardTotals = {
  totalReceivedQty: number;
  totalIssuedQty: number;
  outstandingCardQty?: number;
};

type DashboardByItemType = {
  itemType: { id: number; name: string; code: string };
  receivedQty: number;
  issuedQty: number;
  balance: number;
};

type DashboardChartData = {
  date?: string;
  receivedQty?: number;
  issuedQty?: number;
  netQtyChange?: number;
};

type DashboardRecent = {
  receipts: Array<{
    id: number;
    type: "RECEIVE";
    itemType: { id: number; name: string; code: string };
    status: "POSTED" | "REVERSED";
    qty: number;
    createdAt: string;
  }>;
  issues: Array<{
    id: number;
    type: "ISSUE";
    itemType: { id: number; name: string; code: string };
    status: "POSTED" | "REVERSED";
    qty: number;
    createdAt: string;
  }>;
};

type DashboardData = {
  totals: DashboardTotals;
  byItemType: DashboardByItemType[];
  chartData: DashboardChartData[];
  recent: DashboardRecent;
};

const ALL_ITEM_OPTION = "ALL_ITEM_TYPES";
const BY_ITEM_PAGE_SIZE = 10;
const ACTIVITY_PAGE_SIZE = 10;

type ItemType = {
  id: number;
  name: string;
  code: string;
};

const formatNumber = (value: number) => new Intl.NumberFormat("en-US").format(value);

const formatDateLabel = (value: string | number | null | undefined) => {
  if (value == null) return "Unknown";
  const raw = String(value);
  if (/^\d{4}-\d{2}$/.test(raw)) {
    const [year, month] = raw.split("-");
    const date = new Date(Number(year), Number(month) - 1, 1);
    return Number.isNaN(date.getTime()) ? "Unknown" : format(date, "MMM yyyy");
  }

  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? "Unknown" : format(parsed, "MMM d, yyyy");
};

const rechartsLabelFormatter = (label: any) => formatDateLabel(label);

export default function DashboardPage() {
  const copy = useCardsCopy();
  const [dateRange, setDateRange] = useState({
    startDate: "",
    endDate: "",
  });
  const [itemTypeFilter, setItemTypeFilter] = useState("");
  const [byItemTypeSearch, setByItemTypeSearch] = useState("");
  const [activitySearch, setActivitySearch] = useState("");
  const [byItemTypePage, setByItemTypePage] = useState(1);
  const [activityPage, setActivityPage] = useState(1);

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

  const { data: itemTypes = [] } = useQuery<ItemType[]>({
    queryKey: qk.itemTypes(),
    queryFn: async () => {
      const response = await apiRequest<{ itemTypes: ItemType[] }>(
        "/api/item-types",
      );
      return response.itemTypes;
    },
  });

  const queryParams = useMemo(() => {
    const params = new URLSearchParams();
    if (dateRange.startDate) params.append("startDate", dateRange.startDate);
    if (dateRange.endDate) params.append("endDate", dateRange.endDate);
    if (itemTypeFilter && itemTypeFilter !== ALL_ITEM_OPTION) {
      params.append("itemTypeId", itemTypeFilter);
    }
    return params.toString();
  }, [dateRange, itemTypeFilter]);

  const { data: dashboardData, isLoading } = useQuery<DashboardData>({
    queryKey: qk.dashboard(dashboardFilters),
    queryFn: () =>
      apiRequest<DashboardData>(`/api/reports/dashboard?${queryParams}`),
    refetchInterval: 30000,
  });

  useEffect(() => {
    setByItemTypePage(1);
  }, [byItemTypeSearch, dateRange.startDate, dateRange.endDate, itemTypeFilter]);

  useEffect(() => {
    setActivityPage(1);
  }, [activitySearch, dateRange.startDate, dateRange.endDate, itemTypeFilter]);

  const totals = dashboardData?.totals;
  const byItemType = dashboardData?.byItemType || [];
  const chartData = dashboardData?.chartData || [];
  const totalReceivedQty = totals?.totalReceivedQty || 0;
  const totalIssuedQty = totals?.totalIssuedQty || 0;
  const totalInStock =
    totals?.outstandingCardQty ??
    byItemType.reduce((sum, item) => sum + (item.balance || 0), 0);
  const cardTypesWithStock = byItemType.filter((item) => item.balance > 0).length;
  const stockCutoffLabel = dateRange.endDate
    ? formatDateLabel(dateRange.endDate)
    : "today";

  const normalizedChartData = chartData.map((item) => ({
    date: item.date ?? "",
    receivedQty: item.receivedQty ?? 0,
    issuedQty: item.issuedQty ?? 0,
    netQtyChange: item.netQtyChange ?? 0,
  }));

  const recentReceipts = dashboardData?.recent?.receipts || [];
  const recentIssues = dashboardData?.recent?.issues || [];
  const recentActivity = [
    ...recentReceipts.map((receipt) => ({
      ...receipt,
      type: "RECEIVE" as const,
    })),
    ...recentIssues.map((issue) => ({
      ...issue,
      type: "ISSUE" as const,
    })),
  ].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  const normalizedByItemTypeSearch = byItemTypeSearch.trim().toLowerCase();
  const filteredByItemType = normalizedByItemTypeSearch
    ? byItemType.filter((item) => {
        const haystack = [
          item.itemType?.name,
          item.itemType?.code,
          item.receivedQty,
          item.issuedQty,
          item.balance,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return haystack.includes(normalizedByItemTypeSearch);
      })
    : byItemType;

  const normalizedActivitySearch = activitySearch.trim().toLowerCase();
  const filteredActivity = normalizedActivitySearch
    ? recentActivity.filter((item) => {
        const haystack = [
          item.id,
          item.type,
          item.itemType?.name,
          item.itemType?.code,
          item.qty,
          item.status,
          item.createdAt,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return haystack.includes(normalizedActivitySearch);
      })
    : recentActivity;

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

  const totalActivity = filteredActivity.length;
  const totalActivityPages = Math.max(
    Math.ceil(totalActivity / ACTIVITY_PAGE_SIZE),
    1,
  );
  const clampedActivityPage = Math.min(activityPage, totalActivityPages);
  const pagedActivity = filteredActivity.slice(
    (clampedActivityPage - 1) * ACTIVITY_PAGE_SIZE,
    clampedActivityPage * ACTIVITY_PAGE_SIZE,
  );

  useEffect(() => {
    if (byItemTypePage > totalByItemTypePages) {
      setByItemTypePage(totalByItemTypePages);
    }
  }, [byItemTypePage, totalByItemTypePages]);

  useEffect(() => {
    if (activityPage > totalActivityPages) {
      setActivityPage(totalActivityPages);
    }
  }, [activityPage, totalActivityPages]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description={copy.dashboardDescription}
      />

      <FilterPanel
        title="Refine Operational View"
        description="Use one set of filters to compare card movement, stock, and recent activity."
        footer={(
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">
              Received and issued totals use the selected date range. Cards in stock
              uses the end date as its cutoff and ignores the start date.
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
                  setDateRange((prev) => ({
                    ...prev,
                    endDate,
                  }))
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

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
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
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Cards Received"
            value={formatNumber(totalReceivedQty)}
            description="Total cards received in the selected period"
            icon={Package}
          />
          <StatCard
            title="Cards Issued"
            value={formatNumber(totalIssuedQty)}
            description="Total cards issued in the selected period"
            icon={PackageCheck}
          />
          <StatCard
            title="Cards In Stock"
            value={formatNumber(totalInStock)}
            description={`Available cards as of ${stockCutoffLabel}`}
            icon={LayoutDashboard}
          />
          <StatCard
            title="Card Types With Stock"
            value={formatNumber(cardTypesWithStock)}
            description={`${formatNumber(byItemType.length)} ${copy.itemTypePlural.toLowerCase()} in view`}
            icon={BarChart3}
          />
        </div>
      )}

      <Tabs defaultValue="movement" className="space-y-4">
        <TabsList>
          <TabsTrigger value="movement">
            <BarChart3 className="mr-2 h-4 w-4" />
            Movement Trend
          </TabsTrigger>
          <TabsTrigger value="by-card-type">
            By {copy.itemTypeLabel}
          </TabsTrigger>
          <TabsTrigger value="activity">Recent Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="movement">
          <Card>
            <CardHeader>
              <CardTitle>Received vs Issued Cards</CardTitle>
            </CardHeader>
            <CardContent>
              {normalizedChartData.length === 0 ? (
                <div className="flex h-[400px] items-center justify-center text-muted-foreground">
                  No movement data available for the selected filters
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
                    <YAxis fontSize={12} />
                    <Tooltip
                      labelFormatter={rechartsLabelFormatter}
                      formatter={(value) => formatNumber(Number(value || 0))}
                    />
                    <Legend />
                    <Bar dataKey="receivedQty" name="Received" fill="#2563eb" />
                    <Bar dataKey="issuedQty" name="Issued" fill="#f97316" />
                    <Bar dataKey="netQtyChange" name="Net Change" fill="#16a34a" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="by-card-type">
          <DataTableSection
            title={`Operational Summary by ${copy.itemTypeLabel}`}
            description={`Movement columns reflect the selected period. In-stock figures are as of ${stockCutoffLabel}.`}
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
                    <TableHead className="text-right">Issued Qty</TableHead>
                    <TableHead className="text-right">In Stock</TableHead>
                    <TableHead className="text-right">Total Movement</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {totalByItemTypes === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="py-8 text-center">
                        {normalizedByItemTypeSearch
                          ? "No matching results"
                          : "No card type activity available"}
                      </TableCell>
                    </TableRow>
                  ) : (
                    pagedByItemType.map((item) => (
                      <TableRow key={item.itemType.id}>
                        <TableCell className="font-medium">
                          {item.itemType.name}
                          <span className="ml-1 text-xs text-muted-foreground">
                            ({item.itemType.code})
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          {formatNumber(item.receivedQty)}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatNumber(item.issuedQty)}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatNumber(item.balance)}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatNumber(item.receivedQty + item.issuedQty)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
          </DataTableSection>
        </TabsContent>

        <TabsContent value="activity">
          <DataTableSection
            title="Recent Card Activity"
            description="Review the latest operational entries for the current dashboard filters."
            toolbar={(
              <Input
                value={activitySearch}
                onChange={(e) => setActivitySearch(e.target.value)}
                placeholder="Search activity..."
                className="h-9 w-full sm:w-40"
              />
            )}
            footer={(
              <TablePagination
                page={clampedActivityPage}
                limit={ACTIVITY_PAGE_SIZE}
                total={totalActivity}
                itemLabel="recent entries"
                onPageChange={setActivityPage}
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
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {totalActivity === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="py-8 text-center">
                        {normalizedActivitySearch
                          ? "No matching activity"
                          : "No recent activity available"}
                      </TableCell>
                    </TableRow>
                  ) : (
                    pagedActivity.map((item) => (
                      <TableRow key={`${item.type}-${item.id}`}>
                        <TableCell className="font-medium">#{item.id}</TableCell>
                        <TableCell>
                          <Badge
                            variant={item.type === "RECEIVE" ? "outline" : "default"}
                          >
                            {item.type}
                          </Badge>
                        </TableCell>
                        <TableCell>{item.itemType.name}</TableCell>
                        <TableCell className="text-right">
                          {formatNumber(item.qty)}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              item.status === "POSTED" ? "default" : "destructive"
                            }
                          >
                            {item.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {format(new Date(item.createdAt), "MMM d, yyyy")}
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
