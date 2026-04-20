import { User } from "lib/user-context";

export type UserRole = "VIEWER" | "USER" | "ADMIN" | "SUPER_ADMIN";

export const normalizeRole = (role?: string | null): UserRole => {
  const value = String(role ?? "").trim().toUpperCase();
  if (value === "VIEWER") return "VIEWER";
  if (value === "ADMIN") return "ADMIN";
  if (value === "SUPER_ADMIN") return "SUPER_ADMIN";
  return "USER";
};

export const hasAnyRole = (user: User | null, allowed: UserRole[]): boolean => {
  if (!user) return false;
  const role = normalizeRole(user.role);
  if (role === "SUPER_ADMIN") return true;
  return allowed.includes(role);
};
