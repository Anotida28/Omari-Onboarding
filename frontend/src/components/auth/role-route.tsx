import { Navigate } from "react-router-dom";
import { useUser } from "lib/user-context";
import { hasAnyRole, type UserRole } from "lib/rbac";

export function RoleRoute({
  allowed,
  children,
}: {
  allowed: UserRole[];
  children: JSX.Element;
}) {
  const { user } = useUser();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!hasAnyRole(user, allowed)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}
