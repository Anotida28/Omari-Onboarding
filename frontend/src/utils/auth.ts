import { AuthenticatedUser } from "../services/api";

export const getDefaultPathForUser = (
  user: AuthenticatedUser | null
): string => {
  if (!user) {
    return "/auth/login";
  }

  return user.role === "admin" ? "/review" : "/dashboard";
};

export const getInitials = (value: string): string =>
  value
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
