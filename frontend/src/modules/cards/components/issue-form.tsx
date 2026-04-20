"use client";

import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
  Building2,
  Check,
  ClipboardList,
  PackageCheck,
  Paperclip,
  UserRound,
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
import { useToast } from "components/ui/toast-provider";
import {
  WorkflowActionBar,
  WorkflowSection,
  WorkflowSummaryCard,
} from "components/ui/workflow-section";
import { apiRequest, apiFormData } from "services/api";
import { useCardsCopy } from "lib/cards-copy";
import { qk } from "lib/query-keys";

type AvailableBatch = {
  id: number;
  itemTypeId: number;
  batchCode: string;
  qtyReceived: number;
  qtyIssued: number;
  availableQty: number;
  receivedAt: string;
  notes: string | null;
};

type ItemType = {
  id: number;
  name: string;
  code: string;
};

const formatDateLabel = (value?: string | null) => {
  if (!value) return "--";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "--";
  return parsed.toLocaleDateString();
};

export default function IssueForm() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const copy = useCardsCopy();
  const [files, setFiles] = useState<FileWithMetadata[]>([]);
  const [formData, setFormData] = useState({
    itemTypeId: "",
    qty: "",
    branchName: "",
    issuedToType: "BRANCH" as "BRANCH" | "PERSON",
    issuedToName: "",
    batchId: "",
    notes: "",
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

  const { data: batches = [] } = useQuery({
    queryKey: qk.batches(formData.itemTypeId),
    queryFn: async () => {
      if (!formData.itemTypeId) return [] as AvailableBatch[];
      const response = await apiRequest<{ batches: AvailableBatch[] }>(
        `/api/cards/batches?itemTypeId=${formData.itemTypeId}`,
      );
      return response.batches;
    },
    enabled: !!formData.itemTypeId,
  });

  const issueMutation = useMutation({
    mutationFn: async ({
      formData: payload,
    }: {
      formData: FormData;
      itemTypeId: string;
    }) => {
      return apiFormData("/api/cards/issue", payload);
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["reports"] });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({
        queryKey: qk.batches(variables.itemTypeId),
      });
      toast({ title: "Success", description: "Issue recorded successfully" });
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

  const selectedItemType = useMemo(
    () => itemTypes.find((type) => type.id.toString() === formData.itemTypeId),
    [formData.itemTypeId, itemTypes],
  );

  const selectedBatch = useMemo(
    () => batches.find((batch) => batch.id.toString() === formData.batchId),
    [batches, formData.batchId],
  );

  const requestedQty = Number(formData.qty);
  const normalizedQty = Number.isFinite(requestedQty) ? requestedQty : 0;
  const totalAvailableQty = batches.reduce(
    (sum, batch) => sum + batch.availableQty,
    0,
  );
  const remainingInBatch =
    selectedBatch && normalizedQty > 0
      ? selectedBatch.availableQty - normalizedQty
      : null;
  const recipientLabel = formData.issuedToType === "BRANCH"
    ? formData.branchName.trim()
    : formData.issuedToName.trim();

  const issueChecklist = [
    { label: `${copy.itemTypeLabel} selected`, complete: !!formData.itemTypeId },
    {
      label: "Whole card quantity entered",
      complete: Number.isInteger(normalizedQty) && normalizedQty > 0,
    },
    { label: "Recipient captured", complete: recipientLabel.length > 0 },
    { label: "Batch selected", complete: !!formData.batchId },
    {
      label: "Requested quantity fits selected batch",
      complete:
        !!selectedBatch &&
        Number.isInteger(normalizedQty) &&
        normalizedQty > 0 &&
        normalizedQty <= selectedBatch.availableQty,
    },
  ];

  const submitIssue = () => {
    if (!formData.itemTypeId) {
      toast({
        title: "Card type required",
        description: "Select the card type you want to issue.",
        variant: "destructive",
      });
      return;
    }

    if (!Number.isInteger(normalizedQty) || normalizedQty <= 0) {
      toast({
        title: "Whole quantity required",
        description: "Issued cards must be entered as whole numbers.",
        variant: "destructive",
      });
      return;
    }

    if (formData.issuedToType === "BRANCH" && !formData.branchName.trim()) {
      toast({
        title: "Branch required",
        description: "Enter a branch name before issuing.",
        variant: "destructive",
      });
      return;
    }

    if (formData.issuedToType === "PERSON" && !formData.issuedToName.trim()) {
      toast({
        title: "Recipient required",
        description: "Enter the recipient name.",
        variant: "destructive",
      });
      return;
    }

    if (!formData.batchId) {
      toast({
        title: "Batch required",
        description: "Select a batch before issuing.",
        variant: "destructive",
      });
      return;
    }

    if (selectedBatch && normalizedQty > selectedBatch.availableQty) {
      toast({
        title: "Quantity exceeds batch stock",
        description: `Only ${selectedBatch.availableQty.toLocaleString()} cards are available in ${selectedBatch.batchCode}.`,
        variant: "destructive",
      });
      return;
    }

    const submitFormData = new FormData();
    submitFormData.append("itemTypeId", formData.itemTypeId);
    submitFormData.append("qty", formData.qty);
    submitFormData.append("issuedToType", formData.issuedToType);
    if (formData.issuedToType === "BRANCH") {
      submitFormData.append("issuedToName", formData.branchName);
    } else if (formData.issuedToName) {
      submitFormData.append("issuedToName", formData.issuedToName);
    }
    submitFormData.append("batchId", formData.batchId);
    if (formData.notes) {
      submitFormData.append("notes", formData.notes);
    }
    files.forEach((fileWithMeta) => {
      submitFormData.append("files", fileWithMeta.file);
    });

    issueMutation.mutate({
      formData: submitFormData,
      itemTypeId: formData.itemTypeId,
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    submitIssue();
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={copy.issueTitle}
        description={copy.issueDescription}
      />

      <form onSubmit={handleSubmit} className="app-workflow-grid">
        <div className="app-workflow-main">
          <WorkflowSection
            step={1}
            title="Choose Cards And Quantity"
            description="Pick the card type first so the available issue batches can load."
          >
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="itemTypeId">{copy.itemTypeLabel} *</Label>
                <Select
                  value={formData.itemTypeId}
                  onValueChange={(value) =>
                    setFormData({
                      ...formData,
                      itemTypeId: value,
                      batchId: "",
                    })
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
                <Label htmlFor="qty">Quantity *</Label>
                <Input
                  id="qty"
                  type="number"
                  min="1"
                  step="1"
                  value={formData.qty}
                  onChange={(e) =>
                    setFormData({ ...formData, qty: e.target.value })
                  }
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Cards are issued as whole units only.
                </p>
              </div>
            </div>

            <div className="rounded-lg bg-muted/40 p-4">
              <p className="text-sm font-medium text-foreground">
                Available Stock Snapshot
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                {selectedItemType
                  ? `${totalAvailableQty.toLocaleString()} cards are currently available across ${batches.length} open batch${batches.length === 1 ? "" : "es"} for ${selectedItemType.name}.`
                  : `Select a ${copy.itemTypeLabel.toLowerCase()} to load available batches.`}
              </p>
            </div>
          </WorkflowSection>

          <WorkflowSection
            step={2}
            title="Capture Recipient Details"
            description="Choose where the cards are going and capture the correct recipient information."
          >
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="issuedToType">Issue To *</Label>
                <Select
                  value={formData.issuedToType}
                  onValueChange={(value: "BRANCH" | "PERSON") =>
                    setFormData({
                      ...formData,
                      issuedToType: value,
                      branchName: value === "BRANCH" ? formData.branchName : "",
                      issuedToName:
                        value === "PERSON" ? formData.issuedToName : "",
                    })
                  }
                  required
                >
                  <SelectTrigger id="issuedToType">
                    <SelectValue placeholder="Select recipient type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BRANCH">Branch</SelectItem>
                    <SelectItem value="PERSON">Person</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {formData.issuedToType === "BRANCH" ? (
                <div className="space-y-2">
                  <Label htmlFor="branchName">Branch *</Label>
                  <Input
                    id="branchName"
                    value={formData.branchName}
                    onChange={(e) =>
                      setFormData({ ...formData, branchName: e.target.value })
                    }
                    placeholder="Enter branch name"
                    required
                  />
                </div>
              ) : (
                <div className="space-y-2">
                  <Label htmlFor="issuedToName">Recipient Name *</Label>
                  <Input
                    id="issuedToName"
                    value={formData.issuedToName}
                    onChange={(e) =>
                      setFormData({ ...formData, issuedToName: e.target.value })
                    }
                    placeholder="Enter recipient name"
                    required
                  />
                </div>
              )}
            </div>
          </WorkflowSection>

          <WorkflowSection
            step={3}
            title="Choose The Issue Batch"
            description="Pick the batch that should supply the cards for this issue."
          >
            <div className="space-y-2">
              <Label htmlFor="batchId">Batch *</Label>
              <Select
                value={formData.batchId}
                onValueChange={(value) =>
                  setFormData({ ...formData, batchId: value })
                }
                required
              >
                <SelectTrigger id="batchId">
                  <SelectValue placeholder="Select batch" />
                </SelectTrigger>
                <SelectContent>
                  {batches.length === 0 ? (
                    <SelectItem value="__none" disabled>
                      No available batches
                    </SelectItem>
                  ) : (
                    batches.map((batch) => (
                      <SelectItem key={batch.id} value={batch.id.toString()}>
                        {batch.batchCode} - {batch.availableQty} available
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="rounded-lg bg-muted/40 p-4">
              <p className="text-sm font-medium text-foreground">
                Batch Availability
              </p>
              {selectedBatch ? (
                <div className="mt-2 space-y-1 text-sm text-muted-foreground">
                  <p>
                    {selectedBatch.batchCode} currently has{" "}
                    {selectedBatch.availableQty.toLocaleString()} cards available.
                  </p>
                  <p>Received on {formatDateLabel(selectedBatch.receivedAt)}.</p>
                  {remainingInBatch != null && normalizedQty > 0 && (
                    <p
                      className={
                        remainingInBatch >= 0
                          ? "text-muted-foreground"
                          : "text-red-600 dark:text-red-400"
                      }
                    >
                      {remainingInBatch >= 0
                        ? `${remainingInBatch.toLocaleString()} cards will remain after this issue.`
                        : `Requested quantity is ${Math.abs(remainingInBatch).toLocaleString()} cards above the available balance.`}
                    </p>
                  )}
                </div>
              ) : (
                <p className="mt-2 text-sm text-muted-foreground">
                  Select a batch to preview the available quantity and remaining balance.
                </p>
              )}
            </div>
          </WorkflowSection>

          <WorkflowSection
            step={4}
            title="Notes And Attachments"
            description="Add optional issue context and supporting files before posting the transaction."
          >
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) =>
                  setFormData({ ...formData, notes: e.target.value })
                }
                placeholder="Optional notes"
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
          title="Issue Summary"
          description="Review the selected cards, recipient, and batch before posting the issue."
          footer={(
            <WorkflowActionBar>
              <Button type="button" variant="outline" onClick={() => navigate(-1)}>
                Cancel
              </Button>
              <Button type="submit" disabled={issueMutation.isPending}>
                {issueMutation.isPending ? "Posting..." : "Issue Cards"}
              </Button>
            </WorkflowActionBar>
          )}
        >
          <div className="app-workflow-summary-list">
            <div className="app-workflow-summary-item">
              <div className="app-workflow-summary-label">
                <PackageCheck className="mb-1 inline h-4 w-4" /> {copy.itemTypeLabel}
              </div>
              <div className="app-workflow-summary-value">
                {selectedItemType
                  ? `${selectedItemType.name} (${selectedItemType.code})`
                  : "Not selected"}
              </div>
            </div>
            <div className="app-workflow-summary-item">
              <div className="app-workflow-summary-label">
                <PackageCheck className="mb-1 inline h-4 w-4" /> Quantity
              </div>
              <div className="app-workflow-summary-value">
                {normalizedQty > 0 ? normalizedQty.toLocaleString() : "--"}
              </div>
            </div>
            <div className="app-workflow-summary-item">
              <div className="app-workflow-summary-label">
                {formData.issuedToType === "BRANCH" ? (
                  <Building2 className="mb-1 inline h-4 w-4" />
                ) : (
                  <UserRound className="mb-1 inline h-4 w-4" />
                )}{" "}
                Recipient
              </div>
              <div className="app-workflow-summary-value">
                {recipientLabel || "Not captured"}
              </div>
            </div>
            <div className="app-workflow-summary-item">
              <div className="app-workflow-summary-label">
                <ClipboardList className="mb-1 inline h-4 w-4" /> Batch
              </div>
              <div className="app-workflow-summary-value">
                {selectedBatch
                  ? `${selectedBatch.batchCode} (${selectedBatch.availableQty.toLocaleString()} available)`
                  : "Not selected"}
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
              {issueChecklist.map((item) => (
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
