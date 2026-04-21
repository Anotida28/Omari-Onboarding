import { Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import RouteRedirect from "./RouteRedirect";
import { getDefaultPathForUser } from "../utils/auth";
import { getCurrentPortal, getCurrentPortalLoginPath } from "../utils/portal";

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
    const loginPath = location.pathname.startsWith("/internal")
      ? "/internal/login"
      : "/auth/login";

    return (
      <RouteRedirect
        to={loginPath}
        replace={true}
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
  const portal = getCurrentPortal();

  if (isLoading) {
    return <RouteLoader />;
  }

  if (user) {
    const roleMatchesPortal =
      (portal === "internal" && user.role === "admin") ||
      (portal === "applicant" && user.role === "applicant");

    if (!roleMatchesPortal) {
      return <Outlet />;
    }

    return <RouteRedirect to={getDefaultPathForUser(user)} replace />;
  }

  return <Outlet />;
}

export function RoleRoute({
  allowedRole
}: {
  allowedRole: "applicant" | "admin";
}): JSX.Element {
  const { isLoading, user } = useAuth();
  const portal = getCurrentPortal();

  if (isLoading) {
    return <RouteLoader />;
  }

  if (!user) {
    return <RouteRedirect to={getCurrentPortalLoginPath()} replace />;
  }

  if (user.role !== allowedRole) {
    return (
      <RouteRedirect
        to={portal === "internal" ? "/internal/login" : "/auth/login"}
        replace
      />
    );
  }

  return <Outlet />;
}
