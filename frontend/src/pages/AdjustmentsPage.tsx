"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Check, FileText, ShieldCheck } from "lucide-react";
import { Badge } from "components/ui/badge";
import { Button } from "components/ui/button";
import { DataTableSection } from "components/ui/data-table-section";
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
import { Textarea } from "components/ui/textarea";
import { useToast } from "components/ui/toast-provider";
import {
  WorkflowActionBar,
  WorkflowSection,
  WorkflowSummaryCard,
} from "components/ui/workflow-section";
import { useUser } from "lib/user-context";
import { normalizeRole } from "lib/rbac";
import { apiRequest } from "services/api";
import { useEffect, useState } from "react";

type Adjustment = {
  id: number;
  type: string;
  reason: string;
  amount: number;
  status: "PENDING" | "APPROVED" | "REJECTED";
  resourceId?: number;
  resourceType?: string;
  notes?: string;
  createdById: number;
  approvedById?: number;
  approvedAt?: string;
  createdAt: string;
  updatedAt: string;
  createdBy: { id: number; username: string };
  approvedBy?: { id: number; username: string };
};

const ADJUSTMENT_TYPES = ["BATCH", "TRANSACTION"];
const STATUS_OPTIONS = ["PENDING", "APPROVED", "REJECTED"];
const RESOURCE_TYPES = ["BATCH", "TRANSACTION"];
const ALL_FILTER_VALUE = "__all__";

const formatDateTime = (value?: string | null) => {
  if (!value) return "--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--";
  return date.toLocaleString();
};

const statusBadgeColor = (
  status: string,
): "default" | "secondary" | "destructive" | "outline" => {
  if (status === "APPROVED") return "default";
  if (status === "REJECTED") return "destructive";
  if (status === "PENDING") return "secondary";
  return "outline";
};

export default function AdjustmentsPage() {
  const PAGE_SIZE = 10;
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useUser();
  const [type, setType] = useState<string>("BATCH");
  const [reason, setReason] = useState<string>("");
  const [amount, setAmount] = useState<string>("");
  const [resourceType, setResourceType] = useState<string>("BATCH");
  const [resourceId, setResourceId] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [filterStatus, setFilterStatus] = useState<string>("");
  const [page, setPage] = useState(1);

  const userRole = normalizeRole(user?.role);
  const canApprove = userRole === "ADMIN" || userRole === "SUPER_ADMIN";
  const currentUsername = (user?.username || "").trim().toLowerCase();
  const amountLabel = type === "BATCH" ? "Card Quantity Change" : "Value Change";
  const amountStep = type === "BATCH" ? "1" : "0.01";
  const normalizedAmount = Number.isFinite(Number(amount)) ? Number(amount) : 0;
  const reviewChecklist = [
    { label: "Adjustment type selected", complete: !!type },
    {
      label:
        type === "BATCH"
          ? "Whole card quantity entered"
          : "Value change entered",
      complete:
        amount !== "" &&
        (type !== "BATCH" || Number.isInteger(normalizedAmount)),
    },
    { label: "Target resource selected", complete: !!resourceType },
    { label: "Resource ID added", complete: resourceId.trim().length > 0 },
    { label: "Reason explained", complete: reason.trim().length > 0 },
  ];

  useEffect(() => {
    setResourceType(type);
  }, [type]);

  useEffect(() => {
    setPage(1);
  }, [filterStatus]);

  const adjustmentsQuery = useQuery({
    queryKey: ["adjustments", filterStatus, page, PAGE_SIZE],
    queryFn: () =>
      apiRequest<{
        adjustments: Adjustment[];
        total: number;
        limit: number;
        offset: number;
      }>(
        `/api/adjustments?${new URLSearchParams({
          ...(filterStatus ? { status: filterStatus } : {}),
          limit: String(PAGE_SIZE),
          offset: String((page - 1) * PAGE_SIZE),
        }).toString()}`,
      ),
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      return apiRequest<{ message: string; adjustment: Adjustment }>(
        "/api/adjustments",
        {
          method: "POST",
          body: JSON.stringify({
            type,
            reason: reason.trim(),
            amount: parseFloat(amount),
            resourceType,
            resourceId: resourceId ? parseInt(resourceId, 10) : undefined,
            notes: notes.trim(),
          }),
        },
      );
    },
    onSuccess: (response) => {
      toast({
        title: "Adjustment created",
        description: response.message,
      });
      setReason("");
      setAmount("");
      setResourceId("");
      setNotes("");
      queryClient.invalidateQueries({ queryKey: ["adjustments"] });
    },
    onError: (error: any) => {
      toast({
        title: "Creation failed",
        description: error?.message || "Could not create adjustment",
        variant: "destructive",
      });
    },
  });

  const approveMutation = useMutation({
    mutationFn: (adjustmentId: number) =>
      apiRequest(`/api/adjustments/${adjustmentId}/approve`, {
        method: "PATCH",
      }),
    onSuccess: () => {
      toast({ title: "Adjustment approved" });
      queryClient.invalidateQueries({ queryKey: ["adjustments"] });
    },
    onError: (error: any) => {
      toast({
        title: "Approval failed",
        description: error?.message,
        variant: "destructive",
      });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: (adjustmentId: number) =>
      apiRequest(`/api/adjustments/${adjustmentId}/reject`, {
        method: "PATCH",
      }),
    onSuccess: () => {
      toast({ title: "Adjustment rejected" });
      queryClient.invalidateQueries({ queryKey: ["adjustments"] });
    },
    onError: (error: any) => {
      toast({
        title: "Rejection failed",
        description: error?.message,
        variant: "destructive",
      });
    },
  });

  const handleCreate = () => {
    if (!reason.trim() || !amount) {
      toast({
        title: "Validation error",
        description: "Please fill in reason and amount",
        variant: "destructive",
      });
      return;
    }

    if (type === "BATCH" && !Number.isInteger(Number(amount))) {
      toast({
        title: "Validation error",
        description: "Batch adjustments must use whole card quantities",
        variant: "destructive",
      });
      return;
    }

    if (!resourceId) {
      toast({
        title: "Validation error",
        description: "Resource ID is required for adjustment approval workflows",
        variant: "destructive",
      });
      return;
    }

    createMutation.mutate();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleCreate();
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Adjustments"
        description="Request corrections for card quantity or transaction value discrepancies. A different admin must review and approve."
      />

      <form onSubmit={handleSubmit} className="app-workflow-grid">
        <div className="app-workflow-main">
          <WorkflowSection
            step={1}
            title="Choose The Adjustment"
            description="Pick whether you are correcting card quantity or transaction value, then enter the requested change."
          >
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="adj-type">Type</Label>
                <Select value={type} onValueChange={setType}>
                  <SelectTrigger id="adj-type">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {ADJUSTMENT_TYPES.map((opt) => (
                      <SelectItem key={opt} value={opt}>
                        {opt}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="adj-amount">{amountLabel}</Label>
                <Input
                  id="adj-amount"
                  type="number"
                  step={amountStep}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder={
                    type === "BATCH"
                      ? "Enter whole card quantity"
                      : "Enter value change"
                  }
                />
                <p className="text-xs text-muted-foreground">
                  {type === "BATCH"
                    ? "Use whole numbers only. Cards cannot be adjusted in decimals."
                    : "Transaction value adjustments can include decimals."}
                </p>
              </div>
            </div>

            <div className="rounded-lg bg-muted/40 p-4 text-sm text-muted-foreground">
              <p className="font-medium text-foreground">Adjustment Guidance</p>
              <p className="mt-2">
                {type === "BATCH"
                  ? "Batch adjustments change the physical card count. Use positive or negative whole-number quantities only."
                  : "Transaction adjustments correct the financial value recorded against an existing transaction."}
              </p>
            </div>
          </WorkflowSection>

          <WorkflowSection
            step={2}
            title="Select The Target Resource"
            description="Point this request at the exact batch or transaction that needs review."
          >
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="adj-resource-type">Resource Type</Label>
                <Select value={resourceType} onValueChange={setResourceType}>
                  <SelectTrigger id="adj-resource-type">
                    <SelectValue placeholder="Select resource type" />
                  </SelectTrigger>
                  <SelectContent>
                    {RESOURCE_TYPES.map((opt) => (
                      <SelectItem key={opt} value={opt}>
                        {opt}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="adj-resource-id">Resource ID</Label>
                <Input
                  id="adj-resource-id"
                  type="number"
                  min={1}
                  step="1"
                  value={resourceId}
                  onChange={(e) => setResourceId(e.target.value)}
                  placeholder="Batch/Transaction ID"
                />
              </div>
            </div>
          </WorkflowSection>

          <WorkflowSection
            step={3}
            title="Explain The Request"
            description="Give the reviewer enough context to approve or reject the adjustment confidently."
          >
            <div className="space-y-2">
              <Label htmlFor="adj-reason">Reason</Label>
              <Textarea
                id="adj-reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Describe the discrepancy and reason for adjustment"
                className="min-h-20"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="adj-notes">Notes (Optional)</Label>
              <Textarea
                id="adj-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Additional notes or context"
                className="min-h-16"
              />
            </div>
          </WorkflowSection>
        </div>

        <WorkflowSummaryCard
          title="Adjustment Summary"
          description="Review the request details before sending it to another approver."
          footer={(
            <WorkflowActionBar>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setReason("");
                  setAmount("");
                  setResourceId("");
                  setNotes("");
                }}
              >
                Clear Request
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isPending}
              >
                {createMutation.isPending ? "Creating..." : "Request Adjustment"}
              </Button>
            </WorkflowActionBar>
          )}
        >
          <div className="app-workflow-summary-list">
            <div className="app-workflow-summary-item">
              <div className="app-workflow-summary-label">
                <FileText className="mb-1 inline h-4 w-4" /> Type
              </div>
              <div className="app-workflow-summary-value">{type}</div>
            </div>
            <div className="app-workflow-summary-item">
              <div className="app-workflow-summary-label">
                <AlertTriangle className="mb-1 inline h-4 w-4" /> Requested Change
              </div>
              <div className="app-workflow-summary-value">
                {amount !== ""
                  ? type === "BATCH"
                    ? normalizedAmount.toLocaleString(undefined, {
                        maximumFractionDigits: 0,
                      })
                    : normalizedAmount.toFixed(2)
                  : "--"}
              </div>
            </div>
            <div className="app-workflow-summary-item">
              <div className="app-workflow-summary-label">
                <FileText className="mb-1 inline h-4 w-4" /> Target
              </div>
              <div className="app-workflow-summary-value">
                {resourceType} #{resourceId || "--"}
              </div>
            </div>
            <div className="app-workflow-summary-item">
              <div className="app-workflow-summary-label">
                <FileText className="mb-1 inline h-4 w-4" /> Reason
              </div>
              <div className="app-workflow-summary-value">
                {reason.trim() || "Not added"}
              </div>
            </div>
            <div className="app-workflow-summary-item">
              <div className="app-workflow-summary-label">
                <ShieldCheck className="mb-1 inline h-4 w-4" /> Approval Rule
              </div>
              <div className="app-workflow-summary-value">
                A different admin must approve this request.
              </div>
            </div>
          </div>

          <div className="rounded-lg bg-muted/40 p-4">
            <p className="text-sm font-semibold text-foreground">Submission Checklist</p>
            <div className="app-workflow-checklist mt-3">
              {reviewChecklist.map((item) => (
                <div
                  key={item.label}
                  className="app-workflow-checklist-item"
                  data-complete={item.complete}
                >
                  <span className="app-workflow-checklist-indicator">
                    {item.complete && <Check className="h-3 w-3" />}
                  </span>
                  <span>{item.label}</span>
                </div>
              ))}
            </div>
          </div>
        </WorkflowSummaryCard>
      </form>

      <DataTableSection
        title="Adjustment Requests"
        description="Track pending, approved, and rejected correction requests in one operational queue."
        toolbar={(
          <Select
            value={filterStatus || ALL_FILTER_VALUE}
            onValueChange={(value) =>
              setFilterStatus(value === ALL_FILTER_VALUE ? "" : value)
            }
          >
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_FILTER_VALUE}>All statuses</SelectItem>
              {STATUS_OPTIONS.map((opt) => (
                <SelectItem key={opt} value={opt}>
                  {opt}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        footer={(
          <TablePagination
            page={page}
            limit={adjustmentsQuery.data?.limit ?? PAGE_SIZE}
            total={adjustmentsQuery.data?.total ?? 0}
            itemLabel="adjustments"
            onPageChange={setPage}
          />
        )}
      >
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Requester</TableHead>
                <TableHead>Created</TableHead>
                {canApprove && <TableHead>Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {(adjustmentsQuery.data?.adjustments || []).map((adj) => {
                const isOwnPendingAdjustment =
                  adj.status === "PENDING" &&
                  currentUsername !== "" &&
                  adj.createdBy.username.trim().toLowerCase() === currentUsername;

                return (
                <TableRow key={adj.id}>
                  <TableCell className="font-medium">{adj.type}</TableCell>
                  <TableCell className="max-w-xs truncate">
                    {adj.reason}
                  </TableCell>
                  <TableCell>
                    {adj.type === "BATCH"
                      ? adj.amount.toLocaleString(undefined, {
                          maximumFractionDigits: 0,
                        })
                      : adj.amount.toFixed(2)}
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusBadgeColor(adj.status)}>
                      {adj.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{adj.createdBy.username}</TableCell>
                  <TableCell className="text-sm">
                    {formatDateTime(adj.createdAt)}
                  </TableCell>
                  {canApprove && (
                    <TableCell>
                      {isOwnPendingAdjustment && (
                        <span className="text-sm text-muted-foreground">
                          Needs a different approver
                        </span>
                      )}
                      {adj.status === "PENDING" && !isOwnPendingAdjustment && (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => approveMutation.mutate(adj.id)}
                            disabled={approveMutation.isPending}
                          >
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => rejectMutation.mutate(adj.id)}
                            disabled={rejectMutation.isPending}
                          >
                            Reject
                          </Button>
                        </div>
                      )}
                      {adj.status !== "PENDING" && (
                        <span className="text-sm text-muted-foreground">
                          {adj.approvedBy?.username ? `by ${adj.approvedBy.username}` : "--"}
                        </span>
                      )}
                    </TableCell>
                  )}
                </TableRow>
                );
              })}

              {!adjustmentsQuery.isLoading &&
                (adjustmentsQuery.data?.adjustments?.length ?? 0) === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={canApprove ? 7 : 6}
                      className="text-center text-muted-foreground"
                    >
                      No adjustments found.
                    </TableCell>
                  </TableRow>
                )}
            </TableBody>
          </Table>
      </DataTableSection>
    </div>
  );
}

