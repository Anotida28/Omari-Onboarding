"use client";

import { Badge, type BadgeProps } from "components/ui/badge";
import { Button } from "components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "components/ui/dialog";
import { Input } from "components/ui/input";
import { Label } from "components/ui/label";
import { format } from "date-fns";
import { Download, Paperclip } from "lucide-react";
import type { Dispatch, SetStateAction } from "react";
import { useCardsCopy } from "lib/cards-copy";
import { buildApiUrl } from "services/api";
import { syncUnitTotal } from "lib/money-sync";
import { getUserDisplayName } from "lib/user-display";
import {
  FileUploadArea,
  type FileWithMetadata,
} from "components/ui/file-upload-area";

type ValueForm = {
  unitCost: string;
  totalCost: string;
  unitPrice: string;
  totalPrice: string;
};

type TransactionDetailDialogProps = {
  selectedTransaction: any | null;
  onClose: () => void;
  attachmentFiles: FileWithMetadata[];
  setAttachmentFiles: Dispatch<SetStateAction<FileWithMetadata[]>>;
  isUploadingAttachments: boolean;
  handleAddAttachments: () => void;
  valueForm: ValueForm;
  setValueForm: Dispatch<SetStateAction<ValueForm>>;
  canEditFinancials: boolean;
  isSaving: boolean;
  handleSaveFinancials: () => void;
  isFinancialDirty: boolean;
  formatAmount: (value: number | null | undefined) => string;
  getTypeBadgeVariant: (type: string) => BadgeProps["variant"];
};

export default function TransactionDetailDialog({
  selectedTransaction,
  onClose,
  attachmentFiles,
  setAttachmentFiles,
  isUploadingAttachments,
  handleAddAttachments,
  valueForm,
  setValueForm,
  canEditFinancials,
  isSaving,
  handleSaveFinancials,
  isFinancialDirty,
  formatAmount,
  getTypeBadgeVariant,
}: TransactionDetailDialogProps) {
  const copy = useCardsCopy();
  const isPosted = selectedTransaction?.status === "POSTED";
  const isReversed = selectedTransaction?.status === "REVERSED";
  const allowEdit = canEditFinancials && isPosted;
  const showFinancials =
    !!selectedTransaction &&
    (selectedTransaction.type === "RECEIVE" || selectedTransaction.type === "ISSUE");
  const canAddAttachments =
    !!selectedTransaction &&
    (selectedTransaction.type === "RECEIVE" || selectedTransaction.type === "ISSUE");

  const parseNumber = (value: string) => {
    if (!value) return null;
    const num = Number(value);
    return Number.isFinite(num) ? num : null;
  };

  const formatMoney = (value: number | null) =>
    value == null ? "" : value.toFixed(2);

  const syncValueForm = (
    next: ValueForm,
    changedField: "unit" | "total",
    type: "RECEIVE" | "ISSUE",
  ) => {
    const qty = Number(selectedTransaction?.qty || 0);
    const unitValue = type === "RECEIVE" ? next.unitCost : next.unitPrice;
    const totalValue = type === "RECEIVE" ? next.totalCost : next.totalPrice;
    const { unit, total } = syncUnitTotal({
      qty,
      unit: parseNumber(unitValue),
      total: parseNumber(totalValue),
      changedField,
    });
    const nextUnit = formatMoney(unit);
    const nextTotal = formatMoney(total);

    if (type === "RECEIVE") {
      return {
        ...next,
        unitCost: changedField === "total" ? nextUnit : next.unitCost,
        totalCost: changedField === "unit" ? nextTotal : next.totalCost,
      };
    }

    return {
      ...next,
      unitPrice: changedField === "total" ? nextUnit : next.unitPrice,
      totalPrice: changedField === "unit" ? nextTotal : next.totalPrice,
    };
  };
  return (
    <Dialog
      open={!!selectedTransaction}
      onOpenChange={(open) => {
        if (!open) {
          onClose();
        }
      }}
    >
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Transaction Details</DialogTitle>
          <DialogDescription>
            Complete information about transaction #{selectedTransaction?.id}
          </DialogDescription>
        </DialogHeader>
        {selectedTransaction && (
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label className="text-xs text-muted-foreground">Transaction ID</Label>
                <p className="font-medium">#{selectedTransaction.id}</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Type</Label>
                <div>
                  <Badge variant={getTypeBadgeVariant(selectedTransaction.type)}>
                    {selectedTransaction.type}
                  </Badge>
                </div>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">
                  {copy.itemTypeLabel}
                </Label>
                <p className="font-medium">
                  {selectedTransaction.itemType?.name ?? "-"}
                </p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Quantity</Label>
                <p className="font-medium">
                  {selectedTransaction.qty.toLocaleString()}
                </p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Date</Label>
                <p className="font-medium">
                  {format(new Date(selectedTransaction.createdAt), "PPpp")}
                </p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Created By</Label>
                <p className="font-medium">
                  {getUserDisplayName(selectedTransaction.createdBy)}
                </p>
              </div>
              {(selectedTransaction.issuedToBranch || selectedTransaction.issuedToName) && (
                <>
                  <div>
                    <Label className="text-xs text-muted-foreground">
                      Issued To
                    </Label>
                    <p className="font-medium">
                      {selectedTransaction.issuedToBranch
                        ? `Branch - ${selectedTransaction.issuedToBranch.name}`
                        : selectedTransaction.issuedToName}
                    </p>
                  </div>
                </>
              )}
              {selectedTransaction.batch && (
                <div>
                  <Label className="text-xs text-muted-foreground">Batch</Label>
                  <p className="font-medium">
                    {selectedTransaction.batch.batchCode}
                  </p>
                </div>
              )}
              <div>
                <Label className="text-xs text-muted-foreground">Status</Label>
                <div>
                  <Badge
                    variant={
                      selectedTransaction.status === "POSTED"
                        ? "default"
                        : "destructive"
                    }
                  >
                    {selectedTransaction.status}
                  </Badge>
                </div>
              </div>
            </div>

            {showFinancials && (
              <div className="rounded-lg border border-border p-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h4 className="text-sm font-semibold">Financials</h4>
                    <p className="text-xs text-muted-foreground">
                      {selectedTransaction.type === "RECEIVE"
                        ? `Capture the per-${copy.unitNoun} cost and total receipt value.`
                        : `Capture the per-${copy.unitNoun} price and total issuance value.`}
                    </p>
                  </div>
                  {allowEdit && (
                    <Button
                      size="sm"
                      onClick={handleSaveFinancials}
                      disabled={isSaving || !isFinancialDirty}
                    >
                      {isSaving ? "Saving..." : "Save"}
                    </Button>
                  )}
                </div>
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  {selectedTransaction.type === "RECEIVE" ? (
                    <>
                      <div>
                        <Label
                          className="text-xs text-muted-foreground"
                          htmlFor="dashboard-unit-cost"
                        >
                          Unit Cost
                        </Label>
                        {allowEdit ? (
                          <Input
                            id="dashboard-unit-cost"
                            type="number"
                            min="0"
                            step="0.01"
                            value={valueForm.unitCost}
                            onChange={(e) =>
                              setValueForm((prev) =>
                                syncValueForm(
                                  { ...prev, unitCost: e.target.value },
                                  "unit",
                                  "RECEIVE",
                                ),
                              )
                            }
                            placeholder="e.g. 2.50"
                          />
                        ) : (
                          <p className="font-medium">
                            {formatAmount(selectedTransaction.unitCost)}
                          </p>
                        )}
                      </div>
                      <div>
                        <Label
                          className="text-xs text-muted-foreground"
                          htmlFor="dashboard-total-cost"
                        >
                          Total Cost
                        </Label>
                        {allowEdit ? (
                          <Input
                            id="dashboard-total-cost"
                            type="number"
                            min="0"
                            step="0.01"
                            value={valueForm.totalCost}
                            onChange={(e) =>
                              setValueForm((prev) =>
                                syncValueForm(
                                  { ...prev, totalCost: e.target.value },
                                  "total",
                                  "RECEIVE",
                                ),
                              )
                            }
                            placeholder="Optional"
                          />
                        ) : (
                          <p className="font-medium">
                            {formatAmount(selectedTransaction.totalCost)}
                          </p>
                        )}
                      </div>
                    </>
                  ) : (
                    <>
                      <div>
                        <Label
                          className="text-xs text-muted-foreground"
                          htmlFor="dashboard-unit-price"
                        >
                          Unit Price
                        </Label>
                        {allowEdit ? (
                          <Input
                            id="dashboard-unit-price"
                            type="number"
                            min="0"
                            step="0.01"
                            value={valueForm.unitPrice}
                            onChange={(e) =>
                              setValueForm((prev) =>
                                syncValueForm(
                                  { ...prev, unitPrice: e.target.value },
                                  "unit",
                                  "ISSUE",
                                ),
                              )
                            }
                            placeholder="e.g. 5.00"
                          />
                        ) : (
                          <p className="font-medium">
                            {formatAmount(selectedTransaction.unitPrice)}
                          </p>
                        )}
                      </div>
                      <div>
                        <Label
                          className="text-xs text-muted-foreground"
                          htmlFor="dashboard-total-price"
                        >
                          Total Price
                        </Label>
                        {allowEdit ? (
                          <Input
                            id="dashboard-total-price"
                            type="number"
                            min="0"
                            step="0.01"
                            value={valueForm.totalPrice}
                            onChange={(e) =>
                              setValueForm((prev) =>
                                syncValueForm(
                                  { ...prev, totalPrice: e.target.value },
                                  "total",
                                  "ISSUE",
                                ),
                              )
                            }
                            placeholder="Optional"
                          />
                        ) : (
                          <p className="font-medium">
                            {formatAmount(selectedTransaction.totalPrice)}
                          </p>
                        )}
                      </div>
                    </>
                  )}
                </div>
                {allowEdit && (
                  <p className="mt-3 text-xs text-muted-foreground">
                    Totals stay in sync with unit values and quantity.
                  </p>
                )}
                {isReversed && (
                  <p className="mt-3 text-xs text-red-600 dark:text-red-400">
                    This transaction is reversed and cannot be edited.
                  </p>
                )}
              </div>
            )}

            {selectedTransaction.notes && (
              <div>
                <Label className="text-xs text-muted-foreground">Notes</Label>
                <p className="mt-1 text-sm">{selectedTransaction.notes}</p>
              </div>
            )}

            {canAddAttachments && (
              <div className="rounded-lg border border-border p-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h4 className="text-sm font-semibold">Add Attachments</h4>
                    <p className="text-xs text-muted-foreground">
                      Upload supporting paperwork after posting when documents arrive later.
                    </p>
                  </div>
                  <Button
                    size="sm"
                    onClick={handleAddAttachments}
                    disabled={isUploadingAttachments || attachmentFiles.length === 0}
                  >
                    {isUploadingAttachments ? "Uploading..." : "Upload Files"}
                  </Button>
                </div>
                <div className="mt-4">
                  <Label className="text-xs text-muted-foreground">New Files</Label>
                  <div className="mt-2">
                    <FileUploadArea
                      files={attachmentFiles}
                      onFilesChange={setAttachmentFiles}
                      disabled={isUploadingAttachments}
                    />
                  </div>
                </div>
              </div>
            )}

            {selectedTransaction.attachments &&
              Array.isArray(selectedTransaction.attachments) &&
              selectedTransaction.attachments.length > 0 && (
                <div>
                  <Label className="text-xs text-muted-foreground">Attachments</Label>
                  <div className="mt-2 space-y-2">
                    {selectedTransaction.attachments.map(
                      (file: any, index: number) => (
                        <div
                          key={index}
                          className="flex items-center justify-between rounded-lg border border-border p-3"
                        >
                          <div className="flex items-center gap-2">
                            <Paperclip className="h-4 w-4 text-muted-foreground/60" />
                            <span className="text-sm">{file.fileName}</span>
                          </div>
                          <a
                            href={
                              typeof file.fileUrl === "string" &&
                              file.fileUrl.startsWith("http")
                                ? file.fileUrl
                                : buildApiUrl(file.fileUrl || "")
                            }
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline dark:text-blue-400"
                          >
                            <Download className="h-4 w-4" />
                          </a>
                        </div>
                      ),
                    )}
                  </div>
                </div>
              )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

