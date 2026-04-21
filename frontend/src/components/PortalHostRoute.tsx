import { Outlet } from "react-router-dom";
import RouteRedirect from "./RouteRedirect";
import { getCurrentPortal } from "../utils/portal";

export function ApplicantPortalOnly(): JSX.Element {
  if (getCurrentPortal() === "internal") {
    return <RouteRedirect to="/internal/login" replace />;
  }

  return <Outlet />;
}

export function InternalPortalOnly(): JSX.Element {
  if (getCurrentPortal() === "applicant") {
    return <RouteRedirect to="/auth/login" replace />;
  }

  return <Outlet />;
}
