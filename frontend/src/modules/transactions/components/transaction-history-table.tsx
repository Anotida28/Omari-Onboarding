"use client";

import { useState } from "react";
import { Badge, type BadgeProps } from "components/ui/badge";
import { Button } from "components/ui/button";
import { DataTableSection } from "components/ui/data-table-section";
import { Input } from "components/ui/input";
import { TablePagination } from "components/ui/table-pagination";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "components/ui/table";
import { format } from "date-fns";
import { Eye, FileText } from "lucide-react";
import { useCardsCopy } from "lib/cards-copy";
import { getUserDisplayName } from "lib/user-display";

type PaginationFilters = {
  page: number;
  limit: number;
};

type TransactionHistoryTableProps = {
  transactionsData: any;
  isLoading: boolean;
  filters: PaginationFilters;
  onPageChange: (nextPage: number) => void;
  onViewDetails: (transactionId: number) => void;
  getTypeBadgeVariant: (type: string) => BadgeProps["variant"];
};

export default function TransactionHistoryTable({
  transactionsData,
  isLoading,
  filters,
  onPageChange,
  onViewDetails,
  getTypeBadgeVariant,
}: TransactionHistoryTableProps) {
  const copy = useCardsCopy();
  const [searchTerm, setSearchTerm] = useState("");
  const normalizedSearch = searchTerm.trim().toLowerCase();
  const transactions = transactionsData?.transactions ?? [];
  const filteredTransactions = normalizedSearch
    ? transactions.filter((txn: any) => {
        const recipient =
          txn.issuedToBranch?.name ?? txn.issuedToName ?? "";
        const createdBy = getUserDisplayName(txn.createdBy, "");
        const haystack = [
          txn.id,
          txn.type,
          txn.itemType?.name,
          txn.itemType?.code,
          txn.qty,
          recipient,
          createdBy,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return haystack.includes(normalizedSearch);
      })
    : transactions;

  return (
    <DataTableSection
      title="Transaction History"
      description="Search, scan, and open card transactions from one consistent history view."
      toolbar={(
        <Input
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search transactions..."
          className="h-9 w-full sm:w-40"
        />
      )}
      footer={transactionsData?.pagination ? (
        <TablePagination
          page={filters.page}
          limit={filters.limit}
          total={transactionsData.pagination.total}
          itemLabel="transactions"
          onPageChange={onPageChange}
        />
      ) : undefined}
    >
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>{copy.itemTypeLabel}</TableHead>
              <TableHead>Quantity</TableHead>
              <TableHead>Recipient</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>User</TableHead>
              <TableHead>Attachments</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8">
                  Loading...
                </TableCell>
              </TableRow>
            ) : filteredTransactions.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={9}
                  className="text-center py-8 text-muted-foreground"
                >
                  {normalizedSearch
                    ? "No matching transactions"
                    : "No transactions found"}
                </TableCell>
              </TableRow>
            ) : (
              filteredTransactions.map((txn: any) => (
                <TableRow key={txn.id} className="cursor-pointer hover:bg-muted/60">
                  <TableCell className="font-medium">#{txn.id}</TableCell>
                  <TableCell>
                    <Badge variant={getTypeBadgeVariant(txn.type)}>
                      {txn.type}
                    </Badge>
                  </TableCell>
                  <TableCell>{txn.itemType?.name ?? "-"}</TableCell>
                  <TableCell>
                    {typeof txn.qty === "number" && !Number.isNaN(txn.qty)
                      ? txn.qty.toLocaleString()
                      : "-"}
                  </TableCell>
                  <TableCell>
                    {txn.issuedToBranch || txn.issuedToName ? (
                      <span>
                        {txn.issuedToBranch
                          ? `Branch - ${txn.issuedToBranch?.name ?? ""}`
                          : txn.issuedToName}
                      </span>
                    ) : (
                      <span className="text-muted-foreground/60">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {txn.createdAt && !Number.isNaN(Date.parse(txn.createdAt))
                      ? format(new Date(txn.createdAt), "MMM d, yyyy HH:mm")
                      : "-"}
                  </TableCell>
                  <TableCell>{getUserDisplayName(txn.createdBy)}</TableCell>
                  <TableCell>
                    {txn.attachments &&
                    Array.isArray(txn.attachments) &&
                    txn.attachments.length > 0 ? (
                      <FileText className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    ) : (
                      <span className="text-muted-foreground/60">-</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onViewDetails(txn.id)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
    </DataTableSection>
  );
}
