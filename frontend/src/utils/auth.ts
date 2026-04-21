import { AuthenticatedUser } from "../services/api";
import { buildPortalUrl, getCurrentPortal, getPortalLoginPath } from "./portal";

export const getDefaultPathForUser = (
  user: AuthenticatedUser | null
): string => {
  if (!user) {
    return getPortalLoginPath(getCurrentPortal());
  }

  return user.role === "admin"
    ? buildPortalUrl("internal", "/internal")
    : buildPortalUrl("applicant", "/dashboard");
};

export const getInitials = (value: string): string =>
  value
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
