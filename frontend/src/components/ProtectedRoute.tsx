import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getDefaultPathForUser } from "../utils/auth";

const RouteLoader = (): JSX.Element => (
  <div className="route-loader">
    <div className="route-loader__card">
      <img src="/omari-logo.png" alt="Omari logo" />
      <strong>Checking your Omari session...</strong>
      <span>Please wait while we load the correct workspace.</span>
    </div>
  </div>
);

export function ProtectedRoute(): JSX.Element {
  const { isLoading, user } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <RouteLoader />;
  }

  if (!user) {
    const from = `${location.pathname}${location.search}${location.hash}`;

    return (
      <Navigate
        to="/auth/login"
        replace
        state={{
          from
        }}
      />
    );
  }

  return <Outlet />;
}

export function PublicOnlyRoute(): JSX.Element {
  const { isLoading, user } = useAuth();

  if (isLoading) {
    return <RouteLoader />;
  }

  if (user) {
    return <Navigate to={getDefaultPathForUser(user)} replace />;
  }

  return <Outlet />;
}

export function RoleRoute({
  allowedRole
}: {
  allowedRole: "applicant" | "admin";
}): JSX.Element {
  const { isLoading, user } = useAuth();

  if (isLoading) {
    return <RouteLoader />;
  }

  if (!user) {
    return <Navigate to="/auth/login" replace />;
  }

  if (user.role !== allowedRole) {
    return <Navigate to={getDefaultPathForUser(user)} replace />;
  }

  return <Outlet />;
}
