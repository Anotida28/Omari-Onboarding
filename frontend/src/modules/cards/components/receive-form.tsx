"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
  CalendarDays,
  Check,
  DollarSign,
  FileText,
  Package,
  Paperclip,
} from "lucide-react";
import { PageHeader } from "components/ui/page-header";
import { Button } from "components/ui/button";
import { Input } from "components/ui/input";
import { Label } from "components/ui/label";
import { Textarea } from "components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "components/ui/select";
import {
  FileUploadArea,
  FileWithMetadata,
} from "components/ui/file-upload-area";
import { SystemDatePicker } from "components/ui/system-date-picker";
import { useToast } from "components/ui/toast-provider";
import {
  WorkflowActionBar,
  WorkflowSection,
  WorkflowSummaryCard,
} from "components/ui/workflow-section";
import { apiRequest, apiFormData } from "services/api";
import { useCardsCopy } from "lib/cards-copy";
import { qk } from "lib/query-keys";
import { syncUnitTotal } from "lib/money-sync";

type ItemType = {
  id: number;
  name: string;
  code: string;
};

const formatCurrency = (value: number | null) =>
  value == null
    ? "--"
    : new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
      }).format(value);

const formatDateLabel = (value: string) => {
  if (!value) return "--";
  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return "--";
  return parsed.toLocaleDateString();
};

export default function ReceiveForm() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const copy = useCardsCopy();
  const [files, setFiles] = useState<FileWithMetadata[]>([]);
  const [formData, setFormData] = useState({
    itemTypeId: "",
    batchCode: "",
    qtyReceived: "",
    receivedAt: new Date().toISOString().split("T")[0],
    notes: "",
    unitCost: "",
    totalCost: "",
  });

  const { data: itemTypes = [], isLoading: isLoadingItemTypes } = useQuery<ItemType[]>({
    queryKey: qk.itemTypes(),
    queryFn: async () => {
      const response = await apiRequest<{ itemTypes: ItemType[] }>(
        "/api/item-types",
      );
      return response.itemTypes;
    },
  });

  const receiveMutation = useMutation({
    mutationFn: async ({
      formData: payload,
    }: {
      formData: FormData;
      itemTypeId: string;
    }) => {
      return apiFormData("/api/cards/receive", payload);
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["reports"] });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({
        queryKey: qk.batches(variables.itemTypeId),
      });
      toast({ title: "Success", description: "Receipt recorded successfully" });
      navigate("/transactions");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const parseNumber = (value: string) => {
    if (!value) return null;
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : null;
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
    const nextUnit = formatMoneyInput(unit);
    const nextTotal = formatMoneyInput(total);
    if (changedField === "unit") {
      return { unitCost: unitValue, totalCost: nextTotal };
    }
    if (changedField === "total") {
      return { unitCost: nextUnit, totalCost: totalValue };
    }
    return { unitCost: nextUnit, totalCost: nextTotal };
  };

  const selectedItemType = useMemo(
    () => itemTypes.find((type) => type.id.toString() === formData.itemTypeId),
    [formData.itemTypeId, itemTypes],
  );

  const qtyValue = Number(formData.qtyReceived);
  const normalizedQty = Number.isFinite(qtyValue) ? qtyValue : 0;
  const unitCostValue = parseNumber(formData.unitCost);
  const explicitTotalCost = parseNumber(formData.totalCost);
  const derivedTotalCost =
    normalizedQty > 0 && unitCostValue != null
      ? unitCostValue * normalizedQty
      : null;
  const effectiveTotalCost = explicitTotalCost ?? derivedTotalCost;

  const readinessChecklist = [
    { label: `${copy.itemTypeLabel} selected`, complete: !!formData.itemTypeId },
    {
      label: "Whole card quantity entered",
      complete: Number.isInteger(normalizedQty) && normalizedQty > 0,
    },
    { label: "Batch code added", complete: formData.batchCode.trim().length > 0 },
    { label: "Receipt date captured", complete: formData.receivedAt.length > 0 },
  ];

  const submitReceipt = () => {
    if (!formData.itemTypeId) {
      toast({
        title: "Card type required",
        description: "Select the card type you are receiving.",
        variant: "destructive",
      });
      return;
    }

    if (!Number.isInteger(normalizedQty) || normalizedQty <= 0) {
      toast({
        title: "Whole quantity required",
        description: "Received cards must be entered as whole numbers.",
        variant: "destructive",
      });
      return;
    }

    const submitFormData = new FormData();
    submitFormData.append("itemTypeId", formData.itemTypeId);
    submitFormData.append("batchCode", formData.batchCode);
    submitFormData.append("qtyReceived", formData.qtyReceived);
    if (formData.receivedAt) {
      const isoReceivedAt = new Date(formData.receivedAt).toISOString();
      submitFormData.append("receivedAt", isoReceivedAt);
    }
    if (formData.notes) {
      submitFormData.append("notes", formData.notes);
    }
    if (formData.unitCost) {
      submitFormData.append("unitCost", formData.unitCost);
    }
    if (formData.totalCost) {
      submitFormData.append("totalCost", formData.totalCost);
    }
    files.forEach((fileWithMeta) => {
      submitFormData.append("files", fileWithMeta.file);
    });

    receiveMutation.mutate({
      formData: submitFormData,
      itemTypeId: formData.itemTypeId,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    submitReceipt();
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={copy.receiveTitle}
        description={copy.receiveDescription}
      />

      <form onSubmit={handleSubmit} className="app-workflow-grid">
        <div className="app-workflow-main">
          <WorkflowSection
            step={1}
            title="Choose The Cards"
            description="Start with the card type and the exact quantity being received."
          >
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="itemTypeId">{copy.itemTypeLabel} *</Label>
                <Select
                  value={formData.itemTypeId}
                  onValueChange={(value) =>
                    setFormData({ ...formData, itemTypeId: value })
                  }
                  required
                >
                  <SelectTrigger id="itemTypeId">
                    <SelectValue placeholder={copy.itemTypePlaceholder} />
                  </SelectTrigger>
                  <SelectContent>
                    {isLoadingItemTypes ? (
                      <SelectItem value="loading" disabled>
                        Loading item types...
                      </SelectItem>
                    ) : itemTypes.length === 0 ? (
                      <SelectItem value="empty" disabled>
                        No item types available
                      </SelectItem>
                    ) : (
                      itemTypes.map((type) => (
                        <SelectItem key={type.id} value={type.id.toString()}>
                          {type.name} ({type.code})
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="qtyReceived">Quantity Received *</Label>
                <Input
                  id="qtyReceived"
                  type="number"
                  min="1"
                  step="1"
                  value={formData.qtyReceived}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      qtyReceived: e.target.value,
                      ...syncMoneyInputs({
                        qty: parseNumber(e.target.value) || 0,
                        unitValue: prev.unitCost,
                        totalValue: prev.totalCost,
                        changedField: "qty",
                      }),
                    }))
                  }
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Cards are tracked as whole units only.
                </p>
              </div>
            </div>

            {selectedItemType && (
              <div className="rounded-lg bg-muted/40 p-4">
                <p className="text-sm font-medium text-foreground">
                  Selected Card Type
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {selectedItemType.name} ({selectedItemType.code})
                </p>
              </div>
            )}
          </WorkflowSection>

          <WorkflowSection
            step={2}
            title="Capture Batch Details"
            description="Record how this receipt should be identified and when it was received."
          >
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="batchCode">Batch Code *</Label>
                <Input
                  id="batchCode"
                  value={formData.batchCode}
                  onChange={(e) =>
                    setFormData({ ...formData, batchCode: e.target.value })
                  }
                  placeholder="e.g. BATCH-001"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="receivedAt">Date Received *</Label>
                <SystemDatePicker
                  id="receivedAt"
                  value={formData.receivedAt}
                  onChange={(receivedAt) =>
                    setFormData({ ...formData, receivedAt })
                  }
                  label="Date Received"
                  placeholder="Select receipt date"
                />
              </div>
            </div>
          </WorkflowSection>

          <WorkflowSection
            step={3}
            title="Add Cost Details"
            description="Enter unit cost or total cost. The other value stays in sync when quantity is known."
          >
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="unitCost">Unit Cost</Label>
                <Input
                  id="unitCost"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.unitCost}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      ...syncMoneyInputs({
                        qty: parseNumber(prev.qtyReceived) || 0,
                        unitValue: e.target.value,
                        totalValue: prev.totalCost,
                        changedField: "unit",
                      }),
                    }))
                  }
                  placeholder="Optional"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="totalCost">Total Cost</Label>
                <Input
                  id="totalCost"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.totalCost}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      ...syncMoneyInputs({
                        qty: parseNumber(prev.qtyReceived) || 0,
                        unitValue: prev.unitCost,
                        totalValue: e.target.value,
                        changedField: "total",
                      }),
                    }))
                  }
                  placeholder="Optional"
                />
              </div>
            </div>

            <div className="rounded-lg bg-muted/40 p-4 text-sm text-muted-foreground">
              <p className="font-medium text-foreground">Current Cost Snapshot</p>
              <p className="mt-2">
                {normalizedQty > 0
                  ? `For ${normalizedQty.toLocaleString()} cards, the current total is ${formatCurrency(effectiveTotalCost)}.`
                  : "Enter a quantity to calculate the current total automatically."}
              </p>
            </div>
          </WorkflowSection>

          <WorkflowSection
            step={4}
            title="Notes And Attachments"
            description="Add optional context and supporting files before recording the receipt."
          >
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) =>
                  setFormData({ ...formData, notes: e.target.value })
                }
                placeholder="Optional notes about this batch"
                rows={4}
              />
            </div>

            <div className="space-y-2">
              <Label>Attachments (Optional)</Label>
              <FileUploadArea files={files} onFilesChange={setFiles} />
            </div>
          </WorkflowSection>
        </div>

        <WorkflowSummaryCard
          title="Receipt Summary"
          description="Review the key details before you record this batch."
          footer={(
            <WorkflowActionBar>
              <Button type="button" variant="outline" onClick={() => navigate(-1)}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={receiveMutation.isPending}
              >
                {receiveMutation.isPending ? "Recording..." : "Record Receipt"}
              </Button>
            </WorkflowActionBar>
          )}
        >
          <div className="app-workflow-summary-list">
            <div className="app-workflow-summary-item">
              <div className="app-workflow-summary-label">
                <Package className="mb-1 inline h-4 w-4" /> {copy.itemTypeLabel}
              </div>
              <div className="app-workflow-summary-value">
                {selectedItemType
                  ? `${selectedItemType.name} (${selectedItemType.code})`
                  : "Not selected"}
              </div>
            </div>
            <div className="app-workflow-summary-item">
              <div className="app-workflow-summary-label">
                <FileText className="mb-1 inline h-4 w-4" /> Batch Code
              </div>
              <div className="app-workflow-summary-value">
                {formData.batchCode.trim() || "Not added"}
              </div>
            </div>
            <div className="app-workflow-summary-item">
              <div className="app-workflow-summary-label">
                <Package className="mb-1 inline h-4 w-4" /> Quantity
              </div>
              <div className="app-workflow-summary-value">
                {normalizedQty > 0 ? normalizedQty.toLocaleString() : "--"}
              </div>
            </div>
            <div className="app-workflow-summary-item">
              <div className="app-workflow-summary-label">
                <CalendarDays className="mb-1 inline h-4 w-4" /> Received Date
              </div>
              <div className="app-workflow-summary-value">
                {formatDateLabel(formData.receivedAt)}
              </div>
            </div>
            <div className="app-workflow-summary-item">
              <div className="app-workflow-summary-label">
                <DollarSign className="mb-1 inline h-4 w-4" /> Unit Cost
              </div>
              <div className="app-workflow-summary-value">
                {formatCurrency(unitCostValue)}
              </div>
            </div>
            <div className="app-workflow-summary-item">
              <div className="app-workflow-summary-label">
                <DollarSign className="mb-1 inline h-4 w-4" /> Total Cost
              </div>
              <div className="app-workflow-summary-value">
                {formatCurrency(effectiveTotalCost)}
              </div>
            </div>
            <div className="app-workflow-summary-item">
              <div className="app-workflow-summary-label">
                <Paperclip className="mb-1 inline h-4 w-4" /> Attachments
              </div>
              <div className="app-workflow-summary-value">
                {files.length} selected
              </div>
            </div>
          </div>

          <div className="rounded-lg bg-muted/40 p-4">
            <p className="text-sm font-semibold text-foreground">Submission Checklist</p>
            <div className="app-workflow-checklist mt-3">
              {readinessChecklist.map((item) => (
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
    </div>
  );
}
