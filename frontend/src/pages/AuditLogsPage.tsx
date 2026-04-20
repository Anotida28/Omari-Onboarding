"use client";

import { useQuery } from "@tanstack/react-query";
import { Badge } from "components/ui/badge";
import { Button } from "components/ui/button";
import { DataTableSection } from "components/ui/data-table-section";
import { FilterPanel } from "components/ui/filter-panel";
import { Input } from "components/ui/input";
import { Label } from "components/ui/label";
import { PageHeader } from "components/ui/page-header";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "components/ui/table";
import { TablePagination } from "components/ui/table-pagination";
import { apiRequest } from "services/api";
import { useEffect, useState } from "react";

type AuditLog = {
  id: number;
  userId: number | null;
  action: string;
  resource: string;
  resourceId?: number;
  details?: string;
  timestamp: string;
  user?: { id: number; username: string };
};

const ACTION_OPTIONS = [
  "LOGIN_SUCCESS",
  "LOGIN_FAILURE",
  "PROVISION_USER",
  "CREATE_TRANSACTION",
  "UPDATE_TRANSACTION",
  "ISSUE_CARDS",
  "RECEIVE_CARDS",
  "APPROVE_ADJUSTMENT",
  "REJECT_ADJUSTMENT",
  "CREATE_ADJUSTMENT",
];

const RESOURCE_OPTIONS = [
  "AUTH",
  "USER",
  "TRANSACTION",
  "BATCH",
  "ADJUSTMENT",
];

const ALL_FILTER_VALUE = "__all__";

const formatDateTime = (value?: string | null) => {
  if (!value) return "--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--";
  return date.toLocaleString();
};

const actionBadgeColor = (action: string): "default" | "secondary" | "outline" => {
  if (action.includes("CREATE")) return "default";
  if (action.includes("UPDATE")) return "secondary";
  return "outline";
};

export default function AuditLogsPage() {
  const PAGE_SIZE = 25;
  const [action, setAction] = useState<string>("");
  const [resource, setResource] = useState<string>("");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    setPage(1);
  }, [action, resource, startDate, endDate]);

  const query = new URLSearchParams({
    ...(action && { action }),
    ...(resource && { resource }),
    ...(startDate && { startDate }),
    ...(endDate && { endDate }),
    limit: String(PAGE_SIZE),
    offset: String((page - 1) * PAGE_SIZE),
  }).toString();

  const logsQuery = useQuery({
    queryKey: ["audit-logs", action, resource, startDate, endDate, page, PAGE_SIZE],
    queryFn: () =>
      apiRequest<{
        logs: AuditLog[];
        total: number;
        limit: number;
        offset: number;
      }>(`/api/audit-logs?${query}`),
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Audit Logs"
        description="Track all system activities and user actions with detailed timestamps."
      />

      <FilterPanel
        title="Refine Audit Trail"
        description="Narrow the system audit trail by action, resource, and time window."
        footer={(
          <div className="flex justify-end">
            <Button
              variant="outline"
              onClick={() => {
                setAction("");
                setResource("");
                setStartDate("");
                setEndDate("");
              }}
            >
              Clear Filters
            </Button>
          </div>
        )}
      >
          <div className="grid gap-4 md:grid-cols-4">
            <div className="space-y-2">
              <Label htmlFor="filter-action">Action</Label>
              <Select
                value={action || ALL_FILTER_VALUE}
                onValueChange={(value) =>
                  setAction(value === ALL_FILTER_VALUE ? "" : value)
                }
              >
                <SelectTrigger id="filter-action">
                  <SelectValue placeholder="All actions" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_FILTER_VALUE}>All actions</SelectItem>
                  {ACTION_OPTIONS.map((opt) => (
                    <SelectItem key={opt} value={opt}>
                      {opt}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="filter-resource">Resource</Label>
              <Select
                value={resource || ALL_FILTER_VALUE}
                onValueChange={(value) =>
                  setResource(value === ALL_FILTER_VALUE ? "" : value)
                }
              >
                <SelectTrigger id="filter-resource">
                  <SelectValue placeholder="All resources" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_FILTER_VALUE}>All resources</SelectItem>
                  {RESOURCE_OPTIONS.map((opt) => (
                    <SelectItem key={opt} value={opt}>
                      {opt}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="filter-start">Start Date</Label>
              <Input
                id="filter-start"
                type="datetime-local"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="filter-end">End Date</Label>
              <Input
                id="filter-end"
                type="datetime-local"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>
      </FilterPanel>

      <DataTableSection
        title="Audit Log"
        description="Review the recorded system events and user activity for the selected filters."
        footer={(
          <TablePagination
            page={page}
            limit={logsQuery.data?.limit ?? PAGE_SIZE}
            total={logsQuery.data?.total ?? 0}
            itemLabel="audit logs"
            onPageChange={setPage}
          />
        )}
      >
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Timestamp</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Resource</TableHead>
                <TableHead>Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(logsQuery.data?.logs || []).map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="text-sm">
                    {formatDateTime(log.timestamp)}
                  </TableCell>
                  <TableCell className="font-medium">
                    {log.user?.username || "System"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={actionBadgeColor(log.action)}>
                      {log.action}
                    </Badge>
                  </TableCell>
                  <TableCell>{log.resource}</TableCell>
                  <TableCell className="max-w-xs truncate text-sm text-muted-foreground">
                    {log.details || "--"}
                  </TableCell>
                </TableRow>
              ))}

              {!logsQuery.isLoading && (logsQuery.data?.logs?.length ?? 0) === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    No audit logs found.
                  </TableCell>
                </TableRow>
                )}
            </TableBody>
          </Table>
      </DataTableSection>
    </div>
  );
}
