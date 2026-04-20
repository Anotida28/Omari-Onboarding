"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "components/ui/page-header";
import TransactionDetailDialog from "modules/transactions/components/transaction-detail-dialog";
import TransactionFiltersPanel from "modules/transactions/components/transaction-filters";
import TransactionHistoryTable from "modules/transactions/components/transaction-history-table";
import {
  buildTransactionQueryParams,
  DEFAULT_TRANSACTION_FILTERS,
  type TransactionFilters as TransactionFiltersState,
} from "modules/transactions/lib/filters";
import { apiFormData, apiRequest } from "services/api";
import { useToast } from "components/ui/toast-provider";
import { useCardsCopy } from "lib/cards-copy";
import { qk, type TxnFilter } from "lib/query-keys";
import { normalizeRole } from "lib/rbac";
import { useUser } from "lib/user-context";
import type { FileWithMetadata } from "components/ui/file-upload-area";

type ItemType = {
  id: number;
  name: string;
  code: string;
};

const numberFormatter = new Intl.NumberFormat(undefined, {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const formatAmount = (value: number | null | undefined) =>
  value != null ? numberFormatter.format(value) : "--";

const createEmptyFinancialForm = () => ({
  unitCost: "",
  totalCost: "",
  unitPrice: "",
  totalPrice: "",
});

export default function TransactionsPage() {
  const ALL_TYPE_OPTION = "ALL_TYPES";
  const ALL_ITEM_OPTION = "ALL_ITEM_TYPES";
  
  const { toast } = useToast();
  const copy = useCardsCopy();
  const { user } = useUser();
  const queryClient = useQueryClient();
  const [selectedTransaction, setSelectedTransaction] = useState<any>(null);
  const [attachmentFiles, setAttachmentFiles] = useState<FileWithMetadata[]>([]);
  const [valueForm, setValueForm] = useState(createEmptyFinancialForm);
  const [filters, setFilters] = useState<TransactionFiltersState>(
    DEFAULT_TRANSACTION_FILTERS,
  );
  const transactionFiltersKey = useMemo<TxnFilter>(() => {
    const normalizedType =
      filters.type === "RECEIVE" ||
      filters.type === "ISSUE" ||
      filters.type === "ADJUSTMENT"
        ? (filters.type as TxnFilter["type"])
        : undefined;

    return {
      type: normalizedType,
      itemTypeId: filters.itemTypeId || "",
      startDate: filters.startDate || "",
      endDate: filters.endDate || "",
    };
  }, [filters.type, filters.itemTypeId, filters.startDate, filters.endDate]);

  const actorRole = normalizeRole(user?.role);
  const canEditFinancials =
    actorRole === "ADMIN" || actorRole === "SUPER_ADMIN";

  const toInputValue = (value: number | null | undefined) =>
    value != null ? value.toString() : "";

  const { data: transactionsData, isLoading } = useQuery({
    queryKey: qk.transactions(transactionFiltersKey, filters.page, filters.limit),
    queryFn: () => {
      const params = buildTransactionQueryParams(filters);
      return apiRequest<any>(`/api/transactions?${params.toString()}`);
    },
  });

  const { data: itemTypes = [] } = useQuery<ItemType[]>({
    queryKey: qk.itemTypes(),
    queryFn: async () => {
      const response = await apiRequest<{ itemTypes: ItemType[] }>(
        "/api/item-types",
      );
      return response.itemTypes;
    },
  });

  const saveFinancialsMutation = useMutation({
    mutationFn: async ({
      transactionId,
      payload,
    }: {
      transactionId: number;
      payload: Record<string, string>;
    }) => {
      return apiRequest<any>(`/api/transactions/${transactionId}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      });
    },
    onSuccess: (updated) => {
      setSelectedTransaction(updated);
      setValueForm({
        unitCost: toInputValue(updated.unitCost),
        totalCost: toInputValue(updated.totalCost),
        unitPrice: toInputValue(updated.unitPrice),
        totalPrice: toInputValue(updated.totalPrice),
      });
      toast({
        title: "Financial values saved",
        description: "Transaction costs were updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["reports"] });
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
    },
    onError: (error: any) => {
      toast({
        title: "Update failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const addAttachmentsMutation = useMutation({
    mutationFn: async ({
      transactionId,
      files,
    }: {
      transactionId: number;
      files: FileWithMetadata[];
    }) => {
      const payload = new FormData();
      files.forEach((fileWithMeta) => {
        payload.append("files", fileWithMeta.file);
      });

      return apiFormData<any>(`/api/transactions/${transactionId}/attachments`, payload);
    },
    onSuccess: (updated) => {
      setSelectedTransaction(updated);
      setAttachmentFiles([]);
      toast({
        title: "Attachments added",
        description: "Supporting documents were uploaded successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      if (updated?.id != null) {
        queryClient.invalidateQueries({ queryKey: qk.transaction(updated.id) });
      }
    },
    onError: (error: any) => {
      toast({
        title: "Upload failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleViewDetails = async (transactionId: number) => {
    const transaction = await queryClient.fetchQuery({
      queryKey: qk.transaction(transactionId),
      queryFn: () =>
        apiRequest<any>(`/api/transactions/${transactionId}`),
    });
    setSelectedTransaction(transaction);
    const computedTotalCost =
      transaction.totalCost ??
      (transaction.unitCost != null
        ? transaction.unitCost * transaction.qty
        : null);
    const computedTotalPrice =
      transaction.totalPrice ??
      (transaction.unitPrice != null
        ? transaction.unitPrice * transaction.qty
        : null);
    setValueForm({
      unitCost: toInputValue(transaction.unitCost),
      totalCost: toInputValue(computedTotalCost),
      unitPrice: toInputValue(transaction.unitPrice),
      totalPrice: toInputValue(computedTotalPrice),
    });
  };

  const getTypeBadgeVariant = (type: string) => {
    switch (type) {
      case "RECEIVE":
        return "default";
      case "ISSUE":
        return "secondary";
      case "ADJUSTMENT":
        return "outline";
      case "REVERSAL":
        return "destructive";
      default:
        return "default";
    }
  };

  const handleSaveFinancials = () => {
    if (!selectedTransaction) return;

    if (
      selectedTransaction.type !== "RECEIVE" &&
      selectedTransaction.type !== "ISSUE"
    ) {
      return;
    }
    if (selectedTransaction.status === "REVERSED") {
      toast({
        title: "Edit blocked",
        description: "Reversed transactions cannot be edited.",
        variant: "destructive",
      });
      return;
    }
    if (selectedTransaction.status !== "POSTED") {
      toast({
        title: "Edit blocked",
        description: "Only posted transactions can be edited.",
        variant: "destructive",
      });
      return;
    }

    const payload: Record<string, string> = {};

    if (selectedTransaction.type === "RECEIVE") {
      payload.unitCost = valueForm.unitCost;
      payload.totalCost = valueForm.totalCost;
    }

    if (selectedTransaction.type === "ISSUE") {
      payload.unitPrice = valueForm.unitPrice;
      payload.totalPrice = valueForm.totalPrice;
    }

    saveFinancialsMutation.mutate({
      transactionId: selectedTransaction.id,
      payload,
    });
  };

  const handleAddAttachments = () => {
    if (!selectedTransaction) return;

    if (
      selectedTransaction.type !== "RECEIVE" &&
      selectedTransaction.type !== "ISSUE"
    ) {
      toast({
        title: "Unsupported transaction",
        description: "Attachments can only be added to receive or issue transactions.",
        variant: "destructive",
      });
      return;
    }

    if (!attachmentFiles.length) {
      toast({
        title: "No files selected",
        description: "Select at least one attachment to upload.",
        variant: "destructive",
      });
      return;
    }

    addAttachmentsMutation.mutate({
      transactionId: selectedTransaction.id,
      files: attachmentFiles,
    });
  };

  const isFinancialDirty = (() => {
    if (!selectedTransaction) return false;

    if (selectedTransaction.type === "RECEIVE") {
      return (
        valueForm.unitCost !== toInputValue(selectedTransaction.unitCost) ||
        valueForm.totalCost !== toInputValue(selectedTransaction.totalCost)
      );
    }

    if (selectedTransaction.type === "ISSUE") {
      return (
        valueForm.unitPrice !== toInputValue(selectedTransaction.unitPrice) ||
        valueForm.totalPrice !== toInputValue(selectedTransaction.totalPrice)
      );
    }

    return false;
  })();

  const typeOptions = [
    { value: ALL_TYPE_OPTION, label: "All Types" },
    { value: "RECEIVE", label: "Receive" },
    { value: "ISSUE", label: "Issue" },
    { value: "ADJUSTMENT", label: "Adjustment" },
  ];

  const itemTypeOptions = [
    { value: ALL_ITEM_OPTION, label: copy.itemTypeAllLabel },
    ...(itemTypes ?? []).map((type) => ({
      value: type.id.toString(),
      label: type.name,
    })),
  ];

  const handleDialogClose = () => {
    setSelectedTransaction(null);
    setAttachmentFiles([]);
    setValueForm(createEmptyFinancialForm());
    saveFinancialsMutation.reset();
    addAttachmentsMutation.reset();
  };

  const handleFiltersChange = (nextFilters: TransactionFiltersState) => {
    setFilters(nextFilters);
  };

  const handlePageChange = (nextPage: number) => {
    setFilters({ ...filters, page: nextPage });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Transactions"
        description={copy.transactionsDescription}
      />

      <TransactionFiltersPanel
        filters={filters}
        onChange={handleFiltersChange}
        defaultFilters={DEFAULT_TRANSACTION_FILTERS}
        typeOptions={typeOptions}
        itemTypeOptions={itemTypeOptions}
        allTypeValue={ALL_TYPE_OPTION}
        allItemTypeValue={ALL_ITEM_OPTION}
      />

      <TransactionHistoryTable
        transactionsData={transactionsData}
        isLoading={isLoading}
        filters={filters}
        onPageChange={handlePageChange}
        onViewDetails={handleViewDetails}
        getTypeBadgeVariant={getTypeBadgeVariant}
      />

      <TransactionDetailDialog
        selectedTransaction={selectedTransaction}
        onClose={handleDialogClose}
        attachmentFiles={attachmentFiles}
        setAttachmentFiles={setAttachmentFiles}
        isUploadingAttachments={addAttachmentsMutation.isPending}
        handleAddAttachments={handleAddAttachments}
        valueForm={valueForm}
        setValueForm={setValueForm}
        canEditFinancials={canEditFinancials}
        isSaving={saveFinancialsMutation.isPending}
        handleSaveFinancials={handleSaveFinancials}
        isFinancialDirty={isFinancialDirty}
        formatAmount={formatAmount}
        getTypeBadgeVariant={getTypeBadgeVariant}
      />
    </div>
  );
}


