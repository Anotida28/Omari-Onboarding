"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Alert, AlertDescription, AlertTitle } from "components/ui/alert";
import { Badge } from "components/ui/badge";
import { Button } from "components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "components/ui/card";
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
import { useToast } from "components/ui/toast-provider";
import { normalizeRole } from "lib/rbac";
import { useUser } from "lib/user-context";
import { apiRequest } from "services/api";

type Role = "VIEWER" | "USER" | "ADMIN" | "SUPER_ADMIN";

type ManagedUser = {
  id: number;
  username: string;
  role: Role;
  createdAt: string;
  updatedAt: string;
  lastLogin?: string | null;
};

const ROLE_OPTIONS: Role[] = ["VIEWER", "USER", "ADMIN", "SUPER_ADMIN"];

const formatDateTime = (value?: string | null) => {
  if (!value) return "--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--";
  return date.toLocaleString();
};

const badgeVariantByRole = (role: Role): "default" | "secondary" | "outline" => {
  if (role === "SUPER_ADMIN") return "default";
  if (role === "ADMIN") return "secondary";
  return "outline";
};

export default function UsersPage() {
  const PAGE_SIZE = 10;
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useUser();
  const [username, setUsername] = useState("");
  const [role, setRole] = useState<Role>("USER");
  const [page, setPage] = useState(1);

  const actorRole = normalizeRole(user?.role);
  const canAssignSuperAdmin = actorRole === "SUPER_ADMIN";

  const roleOptions = useMemo(
    () => ROLE_OPTIONS.filter((value) => canAssignSuperAdmin || value !== "SUPER_ADMIN"),
    [canAssignSuperAdmin],
  );

  const usersQuery = useQuery({
    queryKey: ["users", page, PAGE_SIZE],
    queryFn: () =>
      apiRequest<{
        users: ManagedUser[];
        total: number;
        limit: number;
        offset: number;
      }>(
        `/api/users?${new URLSearchParams({
          limit: String(PAGE_SIZE),
          offset: String((page - 1) * PAGE_SIZE),
        }).toString()}`,
      ),
  });

  const provisionMutation = useMutation({
    mutationFn: async () => {
      return apiRequest<{ message: string; user: ManagedUser }>("/api/users/provision", {
        method: "POST",
        body: JSON.stringify({ username: username.trim(), role }),
      });
    },
    onSuccess: (response) => {
      toast({
        title: "User saved",
        description: response.message,
      });
      setUsername("");
      setRole("USER");
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
    onError: (error: any) => {
      toast({
        title: "Provision failed",
        description: error?.message || "Could not save user role",
        variant: "destructive",
      });
    },
  });

  const handleProvision = () => {
    if (!username.trim()) {
      toast({
        title: "Username required",
        description: "Enter a username before assigning a role.",
        variant: "destructive",
      });
      return;
    }
    provisionMutation.mutate();
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="User Access"
        description="Provision users and assign role tiers for system access control."
      />

      <Alert>
        <AlertTitle>Access Tier Rules</AlertTitle>
        <AlertDescription>
          Admin can assign Viewer/User/Admin roles. Only Super Admin can assign Super Admin.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle>Provision User</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="rbac-username">Username</Label>
              <Input
                id="rbac-username"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                placeholder="e.g. om526127"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="rbac-role">Role</Label>
              <Select value={role} onValueChange={(value) => setRole(value as Role)}>
                <SelectTrigger id="rbac-role">
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  {roleOptions.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
              <Button
                className="w-full md:w-auto"
                onClick={handleProvision}
                disabled={provisionMutation.isPending}
              >
                {provisionMutation.isPending ? "Saving..." : "Save User Role"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <DataTableSection
        title="Current Users"
        description="Review provisioned accounts, assigned role tiers, and recent access activity."
        footer={(
          <TablePagination
            page={page}
            limit={usersQuery.data?.limit ?? PAGE_SIZE}
            total={usersQuery.data?.total ?? 0}
            itemLabel="users"
            onPageChange={setPage}
          />
        )}
      >
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Username</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Last Login</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(usersQuery.data?.users || []).map((managedUser) => (
                <TableRow key={managedUser.id}>
                  <TableCell className="font-medium">{managedUser.username}</TableCell>
                  <TableCell>
                    <Badge variant={badgeVariantByRole(managedUser.role)}>
                      {managedUser.role}
                    </Badge>
                  </TableCell>
                  <TableCell>{formatDateTime(managedUser.lastLogin)}</TableCell>
                  <TableCell>{formatDateTime(managedUser.createdAt)}</TableCell>
                </TableRow>
              ))}

              {!usersQuery.isLoading && (usersQuery.data?.users?.length || 0) === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground">
                    No users found.
                  </TableCell>
                </TableRow>
                )}
            </TableBody>
          </Table>
      </DataTableSection>
    </div>
  );
}
