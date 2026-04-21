import { useEffect } from "react";
import { Navigate } from "react-router-dom";
import { isAbsoluteUrl } from "../utils/portal";

interface RouteRedirectProps {
  to: string;
  replace?: boolean;
  state?: unknown;
}

function RouteRedirect({
  to,
  replace = true,
  state
}: RouteRedirectProps): JSX.Element {
  const isExternalTarget = isAbsoluteUrl(to);

  useEffect(() => {
    if (!isExternalTarget) {
      return;
    }

    if (replace) {
      window.location.replace(to);
      return;
    }

    window.location.assign(to);
  }, [isExternalTarget, replace, to]);

  if (isExternalTarget) {
    return (
      <div className="route-loader">
        <div className="route-loader__card">
          <img src="/omari-logo.png" alt="Omari logo" />
          <strong>Switching workspace...</strong>
          <span>Please wait while we route you to the correct portal.</span>
        </div>
      </div>
    );
  }

  return <Navigate to={to} replace={replace} state={state} />;
}

export default RouteRedirect;
